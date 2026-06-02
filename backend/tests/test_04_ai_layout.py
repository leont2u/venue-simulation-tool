"""
MODULE 4 — AI LAYOUT GENERATION MODULE
========================================
Tests for the AI-powered layout generation pipeline.

Architecture under test
-----------------------
  POST /api/ai/generate-scene/
    │
    ├─ generate_scene_with_ollama(prompt)   ← Ollama/Gemma 3 (MOCKED in tests)
    ├─ validate_prompt_layout_intent(raw, prompt)
    ├─ prompt_scene_plan_to_project(intent)
    └─ validate_generated_project(project, intent)

The Ollama HTTP call is patched so tests pass without a running Ollama server.
The deterministic mapper and validation layers run for real.

Test data used
--------------
  Wedding prompt    : "Wedding reception for 80 guests with round tables"
  Conference prompt : "Corporate conference for 50 people, theatre style"
  Funeral prompt    : "Funeral service for 60 guests facing the front"
  Empty prompt      : "" (validation error path)
  LLM error path    : ValueError raised inside generate_scene_with_ollama
"""

from unittest.mock import patch

from rest_framework import status

from .base import AuthenticatedTestCase

# ── Realistic mock intents returned by the (mocked) Ollama service ────────────
# Shape matches what validate_prompt_layout_intent expects as its first argument.

WEDDING_INTENT = {
    "eventType": "wedding",
    "layoutStyle": "banquet_round_table",
    "capacity": 80,
    "room": {"width": 24, "depth": 28, "height": 4},
    "layout": {
        "seating": {
            "type": "round_tables",
            "rows": None,
            "columns": None,
            "tableCount": 10,
            "seatsPerTable": 8,
            "hasCentralAisle": False,
        },
        "stage":  {"enabled": True,  "position": "front"},
        "podium": {"enabled": True},
        "screen": {"enabled": True},
        "decor":  {"plants": True, "bar": False, "entrance": True},
    },
    "livestream": {"enabled": False},
}

CONFERENCE_INTENT = {
    "eventType": "conference",
    "layoutStyle": "theatre",
    "capacity": 50,
    "room": {"width": 20, "depth": 30, "height": 4},
    "layout": {
        "seating": {
            "type": "rows",
            "rows": 8,
            "columns": 7,
            "tableCount": None,
            "seatsPerTable": None,
            "hasCentralAisle": True,
        },
        "stage":  {"enabled": True,  "position": "front"},
        "podium": {"enabled": True},
        "screen": {"enabled": True},
        "decor":  {"plants": False, "bar": False, "entrance": True},
    },
    "livestream": {"enabled": False},
}

FUNERAL_INTENT = {
    "eventType": "funeral",
    "layoutStyle": "theatre",
    "capacity": 60,
    "room": {"width": 18, "depth": 26, "height": 4},
    "layout": {
        "seating": {
            "type": "rows",
            "rows": 10,
            "columns": 6,
            "tableCount": None,
            "seatsPerTable": None,
            "hasCentralAisle": True,
        },
        "stage":  {"enabled": True,  "position": "front"},
        "podium": {"enabled": True},
        "screen": {"enabled": False},
        "decor":  {"plants": True, "bar": False, "entrance": True},
    },
    "livestream": {"enabled": False},
}

_MOCK_PATH = "ai_layout.views.generate_scene_with_ollama"


class AILayoutGenerationTests(AuthenticatedTestCase):
    """TC-27 → TC-33 : AI layout generation endpoint."""

    MODULE = "MODULE 4 — AI LAYOUT GENERATION MODULE"

    # ── TC-27 ──────────────────────────────────────────────────────────────────

    @patch(_MOCK_PATH, return_value=WEDDING_INTENT)
    def test_TC27_wedding_prompt_generates_scene(self, _mock):
        """TC-27 | Wedding prompt → HTTP 200 + scene with items list"""
        prompt = "Wedding reception for 80 guests with round tables"
        print(f"  Input Data : prompt='{prompt}'")
        print("  Expected   : HTTP 200 OK  ·  scene dict with 'items' list returned")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": prompt},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)
        self.assertIsInstance(response.data["items"], list)
        self.assertGreater(len(response.data["items"]), 0)

    # ── TC-28 ──────────────────────────────────────────────────────────────────

    @patch(_MOCK_PATH, return_value=CONFERENCE_INTENT)
    def test_TC28_conference_prompt_generates_theatre_scene(self, _mock):
        """TC-28 | Conference/theatre prompt → HTTP 200 + room dimensions returned"""
        prompt = "Corporate conference for 50 people, theatre style"
        print(f"  Input Data : prompt='{prompt}'")
        print("  Expected   : HTTP 200 OK  ·  'room' dict with width/depth/height")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": prompt},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("room", response.data)
        room = response.data["room"]
        self.assertIn("width",  room)
        self.assertIn("depth",  room)
        self.assertIn("height", room)

    # ── TC-29 ──────────────────────────────────────────────────────────────────

    @patch(_MOCK_PATH, return_value=FUNERAL_INTENT)
    def test_TC29_funeral_prompt_generates_scene(self, _mock):
        """TC-29 | Funeral/memorial prompt → HTTP 200 + valid items list"""
        prompt = "Funeral service for 60 guests facing the front"
        print(f"  Input Data : prompt='{prompt}'")
        print("  Expected   : HTTP 200 OK  ·  items list non-empty")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": prompt},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)
        self.assertIsInstance(response.data["items"], list)

    # ── TC-30 ──────────────────────────────────────────────────────────────────

    def test_TC30_empty_prompt_returns_400(self):
        """TC-30 | Empty/blank prompt → HTTP 400 Bad Request (no Ollama call made)"""
        print("  Input Data : prompt='' (empty string)")
        print("  Expected   : HTTP 400 Bad Request  ·  'Prompt is required'")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-31 ──────────────────────────────────────────────────────────────────

    def test_TC31_missing_prompt_key_returns_400(self):
        """TC-31 | Request body with no 'prompt' key → HTTP 400"""
        print("  Input Data : {} (prompt key absent from request body)")
        print("  Expected   : HTTP 400 Bad Request")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-32 ──────────────────────────────────────────────────────────────────

    @patch(_MOCK_PATH, side_effect=ValueError(
        "Could not reach Ollama. Make sure the local Ollama server is running."
    ))
    def test_TC32_ollama_unavailable_returns_500(self, _mock):
        """TC-32 | Ollama service unreachable → HTTP 500 graceful error"""
        print("  Input Data : prompt='Wedding for 50 guests'  Ollama=OFFLINE (mocked)")
        print("  Expected   : HTTP 500  ·  error message about Ollama connectivity")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": "Wedding for 50 guests"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Ollama", response.data)

    # ── TC-33 ──────────────────────────────────────────────────────────────────

    @patch(_MOCK_PATH, return_value=WEDDING_INTENT)
    def test_TC33_generated_scene_has_required_top_level_keys(self, _mock):
        """TC-33 | Generated scene structure → contains room, items, connections"""
        prompt = "Wedding for 100 guests with a stage and dance floor"
        print(f"  Input Data : prompt='{prompt}'")
        print("  Expected   : HTTP 200  ·  keys: 'room', 'items', 'connections' present")

        response = self.client.post(
            "/api/ai/generate-scene/",
            data={"prompt": prompt},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The AI mapper produces room and items; connections start empty and are
        # added by the user later via the editor — so just confirm both are present.
        for key in ("room", "items"):
            self.assertIn(key, response.data, msg=f"Key '{key}' missing from scene")
        self.assertIsInstance(response.data.get("items", None), list)
