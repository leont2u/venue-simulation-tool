"""
Shared test utilities for the Venue Simulation Tool test suite.
"""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

User = get_user_model()

# ── Reusable test credentials ────────────────────────────────────────────────

PLANNER_EMAIL    = "planner@venuesim.com"
PLANNER_PASSWORD = "SecurePass123!"

ALT_EMAIL        = "alt_planner@venuesim.com"
ALT_PASSWORD     = "AltSecure456!"

# ── Room fixture ─────────────────────────────────────────────────────────────

DEFAULT_ROOM = {
    "width": 20.0,
    "depth": 30.0,
    "height": 4.0,
    "wallThickness": 0.15,
}

# ── Project fixture ──────────────────────────────────────────────────────────

def make_project_payload(name="Grand Ballroom", room=None):
    """Return a minimal valid project creation payload (camelCase for the API)."""
    now = timezone.now().isoformat()
    return {
        "name": name,
        "room": room or DEFAULT_ROOM,
        "createdAt": now,
        "updatedAt": now,
    }


# ── User helpers ─────────────────────────────────────────────────────────────

def create_user(email=PLANNER_EMAIL, password=PLANNER_PASSWORD):
    """Create a Django User with username=email (matching RegisterSerializer)."""
    return User.objects.create_user(
        username=email,
        email=email,
        password=password,
    )


# ── Authenticated API test case ───────────────────────────────────────────────

class AuthenticatedTestCase(APITestCase):
    """Base class that creates a user and force-authenticates before each test."""

    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)
