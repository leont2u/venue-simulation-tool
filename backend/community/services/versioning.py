from projects.models import Project
from community.models import LayoutVersion


def create_snapshot(project: Project, label: str, created_by) -> LayoutVersion:
    """
    Append a version snapshot. Version numbers are monotonically increasing per project.
    """
    last = LayoutVersion.objects.filter(project=project).order_by("-version_number").first()
    next_num = (last.version_number + 1) if last else 1

    return LayoutVersion.objects.create(
        project=project,
        version_number=next_num,
        label=label,
        scene_snapshot={
            "room":           project.room,
            "items":          project.items,
            "connections":    project.connections,
            "scene_settings": project.scene_settings,
            "architecture":   project.architecture,
        },
        thumbnail_url=project.thumbnail_url or "",
        created_by=created_by,
    )


def restore_snapshot(project: Project, version_number: int, requesting_user) -> Project:
    """
    Restore a version snapshot into the project's working copy.
    Creates a new snapshot before restoring so the restore itself is undoable.
    """
    version = LayoutVersion.objects.filter(
        project=project,
        version_number=version_number,
    ).first()

    if not version:
        raise ValueError(f"Version {version_number} not found.")

    # Snapshot current state before overwriting
    create_snapshot(project, f"Before restore to v{version_number}", requesting_user)

    snap = version.scene_snapshot
    project.room          = snap.get("room", project.room)
    project.items         = snap.get("items", project.items)
    project.connections   = snap.get("connections", project.connections)
    project.scene_settings = snap.get("scene_settings", project.scene_settings)
    project.architecture  = snap.get("architecture", project.architecture)
    project.save()

    return project
