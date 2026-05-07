import hashlib
import json

from django.db import transaction
from django.utils import timezone

from projects.models import Project, LayoutVisibility
from community.models import PublishedLayout


def _snapshot_hash(scene_data: dict) -> str:
    serialized = json.dumps(scene_data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def _build_scene_snapshot(project: Project) -> dict:
    return {
        "room":           project.room,
        "items":          project.items,
        "connections":    project.connections,
        "scene_settings": project.scene_settings,
        "architecture":   project.architecture,
    }


def _should_auto_approve(publisher) -> bool:
    """
    Trust publishers who already have approved layouts and no recent flags.
    Prevents moderation from becoming a bottleneck as the community scales.
    """
    approved_count = PublishedLayout.objects.filter(
        publisher=publisher,
        moderation_status=PublishedLayout.MODERATION_APPROVED,
    ).count()
    return approved_count >= 5


@transaction.atomic
def publish_layout(project: Project, publisher, metadata: dict) -> PublishedLayout:
    """
    Create or update a PublishedLayout for the given project.
    Takes a scene snapshot — owner edits after this point don't affect
    what the community sees until the owner explicitly re-publishes.
    """
    from community.services.versioning import create_snapshot

    scene_snapshot = _build_scene_snapshot(project)
    snapshot_hash  = _snapshot_hash(scene_snapshot)
    auto_approve   = _should_auto_approve(publisher)

    published, created = PublishedLayout.objects.update_or_create(
        project=project,
        defaults={
            "publisher":          publisher,
            "title":              metadata["title"],
            "tagline":            metadata.get("tagline", ""),
            "event_type":         metadata["event_type"],
            "theme":              metadata.get("theme", ""),
            "estimated_capacity": metadata.get("estimated_capacity"),
            "tags":               metadata.get("tags", []),
            "cover_image_url":    metadata.get("cover_image_url", ""),
            "published_snapshot": scene_snapshot,
            "published_at_hash":  snapshot_hash,
            "moderation_status":  (
                PublishedLayout.MODERATION_APPROVED
                if auto_approve
                else PublishedLayout.MODERATION_PENDING
            ),
            "auto_approved":      auto_approve,
        },
    )

    # Keep project fields in sync
    project.visibility = LayoutVisibility.PUBLIC
    project.event_type = metadata["event_type"]
    project.tags       = metadata.get("tags", [])
    if metadata.get("cover_image_url"):
        project.thumbnail_url = metadata["cover_image_url"]
    project.save(update_fields=["visibility", "event_type", "tags", "thumbnail_url", "updated_at"])

    # Auto-snapshot on every publish so owners can roll back
    label = "Published" if created else "Re-published"
    create_snapshot(project, label, publisher)

    return published


@transaction.atomic
def unpublish_layout(project: Project, requesting_user) -> None:
    if project.owner_id != requesting_user.id:
        raise PermissionError("Only the owner can unpublish.")

    PublishedLayout.objects.filter(project=project).update(
        moderation_status=PublishedLayout.MODERATION_REJECTED,
    )
    project.visibility = LayoutVisibility.PRIVATE
    project.save(update_fields=["visibility", "updated_at"])


def get_publish_state(project: Project) -> str:
    """
    Compute the four-state enum from project data.
    Always computed on read — never stored, so it's always accurate.
    """
    if project.archived_at:
        return "ARCHIVED"

    if project.visibility != LayoutVisibility.PUBLIC:
        return "DRAFT_PRIVATE"

    try:
        listing = project.published_listing
    except PublishedLayout.DoesNotExist:
        return "DRAFT_PRIVATE"

    current_hash = _snapshot_hash(_build_scene_snapshot(project))
    if current_hash == listing.published_at_hash:
        return "PUBLISHED_CLEAN"
    return "PUBLISHED_DIRTY"
