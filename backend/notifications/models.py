import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    FORK     = "fork"
    LIKE     = "like"
    APPROVED = "approved"
    FLAGGED  = "flagged"
    COMMENT  = "comment"

    TYPE_CHOICES = [
        (FORK,     "Layout forked"),
        (LIKE,     "Layout liked"),
        (APPROVED, "Layout approved"),
        (FLAGGED,  "Layout flagged"),
        (COMMENT,  "New comment"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    ntype      = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)

    # optional references — use GenericForeignKey pattern via explicit FKs for simplicity
    layout     = models.ForeignKey(
        "community.PublishedLayout", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    project    = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )

    is_read    = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ntype} → {self.recipient_id}"
