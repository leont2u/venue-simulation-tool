import uuid

from django.conf import settings
from django.db import models


class PublishedLayout(models.Model):
    """
    Community-visible wrapper around a Project.
    Created by an explicit publish action — never a flag flip on Project.
    One listing per project (OneToOne).

    published_snapshot stores the scene at publish time — owner edits don't
    affect what the community sees until the owner explicitly re-publishes.
    """

    MODERATION_PENDING  = "PENDING"
    MODERATION_APPROVED = "APPROVED"
    MODERATION_REJECTED = "REJECTED"
    MODERATION_FLAGGED  = "FLAGGED"
    MODERATION_CHOICES  = [
        (MODERATION_PENDING,  "Pending"),
        (MODERATION_APPROVED, "Approved"),
        (MODERATION_REJECTED, "Rejected"),
        (MODERATION_FLAGGED,  "Flagged"),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project   = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="published_listing",
    )
    publisher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="published_layouts",
    )

    # Discovery metadata (separate from raw scene data)
    title               = models.CharField(max_length=255)
    tagline             = models.CharField(max_length=500, blank=True)
    event_type          = models.CharField(max_length=50, db_index=True)
    theme               = models.CharField(max_length=100, blank=True)
    estimated_capacity  = models.PositiveIntegerField(null=True, blank=True)
    tags                = models.JSONField(default=list)
    cover_image_url     = models.URLField(blank=True)

    # Snapshot of scene data at publish time
    published_snapshot  = models.JSONField(default=dict)
    published_at_hash   = models.CharField(max_length=64, blank=True)

    # Moderation
    moderation_status   = models.CharField(
        max_length=20,
        choices=MODERATION_CHOICES,
        default=MODERATION_PENDING,
        db_index=True,
    )
    moderation_notes    = models.TextField(blank=True)
    moderated_by        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_layouts",
    )
    moderated_at        = models.DateTimeField(null=True, blank=True)
    auto_approved       = models.BooleanField(default=False)

    # Engagement counters — denormalized, updated asynchronously via F()
    view_count          = models.PositiveIntegerField(default=0)
    unique_view_count   = models.PositiveIntegerField(default=0)
    fork_count          = models.PositiveIntegerField(default=0)
    save_count          = models.PositiveIntegerField(default=0)
    like_count          = models.PositiveIntegerField(default=0)

    # Discovery ranking
    featured_at         = models.DateTimeField(null=True, blank=True, db_index=True)
    featured_until      = models.DateTimeField(null=True, blank=True)
    trending_score      = models.FloatField(default=0.0, db_index=True)
    trending_computed_at = models.DateTimeField(null=True, blank=True)

    published_at        = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return f"Published: {self.title} by {self.publisher}"


class LayoutVersion(models.Model):
    """
    Append-only scene snapshots. Never deleted.
    Created automatically on publish and optionally by user.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project        = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    label          = models.CharField(max_length=100, blank=True)
    scene_snapshot = models.JSONField()
    thumbnail_url  = models.URLField(blank=True)
    created_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("project", "version_number")]
        ordering = ["-version_number"]

    def __str__(self):
        return f"{self.project.name} v{self.version_number} — {self.label}"


class LayoutSave(models.Model):
    """User bookmarks a public layout into their inspiration library."""
    user     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_layouts")
    project  = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="saves")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "project")]


class LayoutLike(models.Model):
    """User likes a published listing."""
    user             = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="liked_layouts")
    published_layout = models.ForeignKey(PublishedLayout, on_delete=models.CASCADE, related_name="likes")
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "published_layout")]
