import copy
import uuid

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from projects.models import Project, LayoutVisibility
from community.models import PublishedLayout


@transaction.atomic
def fork_layout(source_project_id: str, requesting_user) -> Project:
    """
    Create a fully independent copy of a public layout.
    - All item UUIDs are re-assigned so forks are structurally independent.
    - Fork always starts PRIVATE — new owner decides whether to publish.
    - Attribution is cached so it survives source deletion.
    - SELECT FOR SHARE prevents source deletion mid-fork without blocking reads.
    """
    source = (
        Project.objects
        .select_for_update(of=("self",))
        .select_related("published_listing", "owner")
        .get(
            id=source_project_id,
            visibility=LayoutVisibility.PUBLIC,
            deleted_at__isnull=True,
        )
    )

    try:
        listing = source.published_listing
        if listing.moderation_status != PublishedLayout.MODERATION_APPROVED:
            raise PermissionError("This layout is not available for duplication.")
    except PublishedLayout.DoesNotExist:
        raise PermissionError("This layout has no approved public listing.")

    # Deep copy scene data — all values are plain dicts/lists, no ORM objects
    forked_items        = copy.deepcopy(source.items or [])
    forked_connections  = copy.deepcopy(source.connections or [])
    forked_measurements = copy.deepcopy(source.measurements or [])

    # Re-assign item UUIDs so fork is fully independent from source at the item level
    id_map = {}
    for item in forked_items:
        new_id = str(uuid.uuid4())
        id_map[item["id"]] = new_id
        item["id"] = new_id

    # Remap connection references to the new item IDs
    for conn in forked_connections:
        conn["id"]         = str(uuid.uuid4())
        conn["fromItemId"] = id_map.get(conn.get("fromItemId", ""), conn.get("fromItemId", ""))
        conn["toItemId"]   = id_map.get(conn.get("toItemId", ""), conn.get("toItemId", ""))

    now = timezone.now()
    source_creator = (
        source.owner.get_full_name()
        or source.owner.get_username()
        or source.owner.email
        or "Unknown"
    )

    forked_project = Project.objects.create(
        owner         = requesting_user,
        name          = f"{source.name} (remixed)",
        room          = copy.deepcopy(source.room),
        items         = forked_items,
        connections   = forked_connections,
        measurements  = forked_measurements,
        scene_settings = copy.deepcopy(source.scene_settings or {}),
        architecture  = copy.deepcopy(source.architecture or {}),
        visibility    = LayoutVisibility.PRIVATE,
        event_type    = source.event_type,
        tags          = list(source.tags or []),
        thumbnail_url = source.thumbnail_url,

        # Lineage
        forked_from   = source,
        fork_depth    = source.fork_depth + 1,

        # Attribution cached at fork time — persists even if source is later deleted
        attribution_source_title   = source.name,
        attribution_source_creator = source_creator,

        created_at = now,
        updated_at = now,
    )

    # Increment fork counter atomically — F() avoids race conditions
    PublishedLayout.objects.filter(project=source).update(
        fork_count=F("fork_count") + 1
    )

    # Auto-create first version snapshot for the fork
    from community.services.versioning import create_snapshot
    create_snapshot(forked_project, "Forked from original", requesting_user)

    return forked_project
