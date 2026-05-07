import re
import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

SPECIALIZATION_CHOICES = [
    ("weddings",          "Weddings"),
    ("conferences",       "Conferences"),
    ("concerts",          "Concerts"),
    ("funerals",          "Funerals"),
    ("corporate",         "Corporate Events"),
    ("galas",             "Galas & Awards"),
    ("religious",         "Religious Services"),
    ("productions",       "AV / Livestream Productions"),
    ("exhibitions",       "Exhibitions & Trade Shows"),
    ("social",            "Social Events"),
]


def _slugify_email(email: str) -> str:
    """Derive a URL-safe handle from an email address."""
    local = email.split("@")[0]
    slug = re.sub(r"[^a-z0-9]", "", local.lower())
    return slug or "planner"


def _unique_handle(base: str) -> str:
    """Append incrementing suffix until handle is unique."""
    handle = base[:30]
    from profiles.models import UserProfile
    if not UserProfile.objects.filter(handle=handle).exists():
        return handle
    n = 1
    while UserProfile.objects.filter(handle=f"{base[:28]}{n}").exists():
        n += 1
    return f"{base[:28]}{n}"


class UserProfile(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    handle       = models.SlugField(max_length=40, unique=True, db_index=True)
    display_name = models.CharField(max_length=80, blank=True)
    bio          = models.TextField(max_length=500, blank=True)
    avatar_url   = models.URLField(blank=True)
    location     = models.CharField(max_length=120, blank=True)
    website      = models.URLField(blank=True)
    specializations = models.JSONField(default=list, blank=True)
    is_verified  = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"@{self.handle}"
