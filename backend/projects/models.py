import uuid

from django.conf import settings
from django.db import models


class LayoutVisibility(models.TextChoices):
    PRIVATE  = "PRIVATE",  "Private"
    UNLISTED = "UNLISTED", "Unlisted (link only)"
    PUBLIC   = "PUBLIC",   "Public"


class EventType(models.TextChoices):
    WEDDING          = "wedding",          "Wedding"
    ENGAGEMENT       = "engagement",       "Engagement"
    CONFERENCE       = "conference",       "Conference"
    AGM              = "agm",              "AGM"
    CORPORATE_DINNER = "corporate_dinner", "Corporate Dinner"
    PRODUCT_LAUNCH   = "product_launch",   "Product Launch"
    FUNERAL          = "funeral",          "Funeral"
    MEMORIAL         = "memorial",         "Memorial"
    CONCERT          = "concert",          "Concert"
    AWARD_CEREMONY   = "award_ceremony",   "Award Ceremony"
    GRADUATION       = "graduation",       "Graduation"
    BIRTHDAY         = "birthday",         "Birthday"
    GALA             = "gala",             "Gala"
    FUNDRAISER       = "fundraiser",       "Fundraiser"
    CHURCH_SERVICE   = "church_service",   "Church Service"
    LIVESTREAM       = "livestream",       "Livestream"
    EXHIBITION       = "exhibition",       "Exhibition"
    OTHER            = "other",            "Other"


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    room = models.JSONField()
    items = models.JSONField(default=list)
    connections = models.JSONField(default=list, blank=True)
    measurements = models.JSONField(default=list, blank=True)
    scene_settings = models.JSONField(default=dict, blank=True)
    architecture = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    # Phase 1: visibility and community fields
    visibility = models.CharField(
        max_length=20,
        choices=LayoutVisibility.choices,
        default=LayoutVisibility.PRIVATE,
        db_index=True,
    )
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        null=True,
        blank=True,
        db_index=True,
    )
    tags = models.JSONField(default=list, blank=True)
    thumbnail_url = models.URLField(null=True, blank=True)

    # Fork lineage — SET_NULL so forks survive source deletion
    forked_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="forks",
    )
    fork_depth = models.PositiveSmallIntegerField(default=0)

    # Attribution cache — preserved even if source is deleted
    attribution_source_title   = models.CharField(max_length=255, blank=True)
    attribution_source_creator = models.CharField(max_length=120, blank=True)

    # Soft delete
    archived_at = models.DateTimeField(null=True, blank=True)
    deleted_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} ({self.owner})"


class SharedProject(models.Model):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="share_record",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Share {self.project_id}"


class SharedProjectComment(models.Model):
    shared_project = models.ForeignKey(
        SharedProject,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="replies",
        null=True,
        blank=True,
    )
    author_name = models.CharField(max_length=120)
    body = models.TextField()
    is_admin_reply = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.shared_project_id} by {self.author_name}"
