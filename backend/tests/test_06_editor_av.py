"""
MODULE 6 — 2D/3D EDITOR AND AV PLANNING MODULE
================================================
Tests for the scene-editing workflow: placing furniture items in the 'items'
JSONField, persisting AV cable connections in the 'connections' JSONField,
updating scene settings, validating item structure, and verifying that the
project state is faithfully round-tripped through the API.

These tests validate backend persistence rather than browser rendering.
The Zustand store and Three.js viewport are exercised by the frontend;
here we confirm that every scene mutation reaches the database intact.

Test data used
--------------
  Base project : name="Event Hall" room={width:20, depth:30, height:4}
  Furniture    : round_table at (5.0, 0.0, 5.0) · rotationY=0
  Chair        : chair at (3.5, 0.0, 5.0) · rotationY=270
  Stage        : stage at (10.0, 0.0, 2.0) · rotationY=0
  AV camera    : camera at (1.0, 2.0, 15.0)
  AV screen    : screen at (10.0, 2.0, 2.0)
  AV cable     : camera → screen  cableType='video'
  AV cable     : mixing_desk → speaker  cableType='audio'
  Scene settings: showGrid=True, lightingMood='wedding', floorMaterial='Wood'
"""

import uuid

from django.utils import timezone
from rest_framework import status

from .base import AuthenticatedTestCase, DEFAULT_ROOM, make_project_payload

# ── Scene-item fixtures ───────────────────────────────────────────────────────

def _item(item_type, x, y, z, rotation=0, label=None, layer="layout"):
    return {
        "id":        str(uuid.uuid4()),
        "type":      item_type,
        "x":         x,
        "y":         y,
        "z":         z,
        "rotationY": rotation,
        "scale":     [1.0, 1.0, 1.0],
        "label":     label or item_type,
        "layer":     layer,
        "color":     "#FFFFFF",
    }


ROUND_TABLE  = _item("round_table",      5.0,  0.0,  5.0)
CHAIR_1      = _item("chair",            3.5,  0.0,  5.0, rotation=270)
STAGE        = _item("stage",           10.0,  0.0,  2.0, label="Main Stage")
AV_CAMERA    = _item("camera",           1.0,  2.0, 15.0, layer="av")
AV_SCREEN    = _item("screen",          10.0,  2.0,  2.0, layer="av")
AV_MIXER     = _item("mixing_desk",      2.0,  1.0, 14.0, layer="av")
AV_SPEAKER   = _item("speaker",         18.0,  2.0,  5.0, layer="av")

VIDEO_CABLE  = {
    "id":         str(uuid.uuid4()),
    "fromItemId": AV_CAMERA["id"],
    "toItemId":   AV_SCREEN["id"],
    "cableType":  "video",
}
AUDIO_CABLE  = {
    "id":         str(uuid.uuid4()),
    "fromItemId": AV_MIXER["id"],
    "toItemId":   AV_SPEAKER["id"],
    "cableType":  "audio",
}

SCENE_SETTINGS = {
    "showGrid":                True,
    "enableHdri":              True,
    "ambientLightIntensity":   1.1,
    "directionalLightIntensity": 2.1,
    "snapToGrid":              True,
    "lightingMood":            "wedding",
    "floorMaterial":           "Wood",
    "venueEnvironment":        "indoor",
    "wallColor":               "#F6F2EC",
    "floorColor":              "#F4F1EA",
}


class EditorAndAVPlanningTests(AuthenticatedTestCase):
    """TC-40 → TC-47 : Scene editing and AV cable planning."""

    MODULE = "MODULE 6 — 2D/3D EDITOR AND AV PLANNING MODULE"

    def _create_project(self, name="Event Hall"):
        """Helper: create a base project and return its id."""
        payload = make_project_payload(name)
        resp = self.client.post("/api/projects/", data=payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        return resp.data["id"]

    # ── TC-40 ──────────────────────────────────────────────────────────────────

    def test_TC40_place_furniture_items_persists_in_db(self):
        """TC-40 | PATCH items array with furniture → items round-trip correctly"""
        pid = self._create_project()
        items = [ROUND_TABLE, CHAIR_1, STAGE]

        print(f"  Input Data : project_id='{pid}'")
        print(f"               items=[round_table(5,0,5), chair(3.5,0,5,rot=270), stage(10,0,2)]")
        print("  Expected   : HTTP 200 OK  ·  items persisted with correct x/y/z")

        patch = self.client.patch(
            f"/api/projects/{pid}/",
            data={"items": items, "updatedAt": timezone.now().isoformat()},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)

        get = self.client.get(f"/api/projects/{pid}/")
        saved_items = get.data["items"]
        self.assertEqual(len(saved_items), 3)
        types = {i["type"] for i in saved_items}
        self.assertIn("round_table", types)
        self.assertIn("chair", types)
        self.assertIn("stage", types)

    # ── TC-41 ──────────────────────────────────────────────────────────────────

    def test_TC41_item_position_and_rotation_persisted(self):
        """TC-41 | Item x/y/z and rotationY stored and retrieved unchanged"""
        pid = self._create_project()

        print("  Input Data : chair at x=3.5, y=0.0, z=5.0, rotationY=270")
        print("  Expected   : Exact same values returned from GET /api/projects/<id>/")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={"items": [CHAIR_1], "updatedAt": timezone.now().isoformat()},
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        chair = next(i for i in get.data["items"] if i["type"] == "chair")

        self.assertAlmostEqual(float(chair["x"]),         3.5)
        self.assertAlmostEqual(float(chair["y"]),         0.0)
        self.assertAlmostEqual(float(chair["z"]),         5.0)
        self.assertEqual(int(chair["rotationY"]),         270)

    # ── TC-42 ──────────────────────────────────────────────────────────────────

    def test_TC42_room_dimensions_stored_in_project(self):
        """TC-42 | Room width/depth/height/wallThickness stored correctly"""
        pid = self._create_project()

        print(f"  Input Data : room={DEFAULT_ROOM}")
        print("  Expected   : GET returns same room object")

        get = self.client.get(f"/api/projects/{pid}/")
        room = get.data["room"]

        self.assertEqual(float(room["width"]),        DEFAULT_ROOM["width"])
        self.assertEqual(float(room["depth"]),        DEFAULT_ROOM["depth"])
        self.assertEqual(float(room["height"]),       DEFAULT_ROOM["height"])
        self.assertEqual(float(room["wallThickness"]), DEFAULT_ROOM["wallThickness"])

    # ── TC-43 ──────────────────────────────────────────────────────────────────

    def test_TC43_av_video_cable_connection_persisted(self):
        """TC-43 | AV camera→screen video cable stored and retrieved"""
        pid = self._create_project()

        print(f"  Input Data : camera id={AV_CAMERA['id'][:8]}…")
        print(f"               screen id={AV_SCREEN['id'][:8]}…")
        print(f"               connection cableType='video'")
        print("  Expected   : connections list contains VIDEO_CABLE with correct ids")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={
                "items":       [AV_CAMERA, AV_SCREEN],
                "connections": [VIDEO_CABLE],
                "updatedAt":   timezone.now().isoformat(),
            },
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        connections = get.data["connections"]
        self.assertEqual(len(connections), 1)
        conn = connections[0]
        self.assertEqual(conn["cableType"],  "video")
        self.assertEqual(conn["fromItemId"], AV_CAMERA["id"])
        self.assertEqual(conn["toItemId"],   AV_SCREEN["id"])

    # ── TC-44 ──────────────────────────────────────────────────────────────────

    def test_TC44_av_audio_cable_connection_persisted(self):
        """TC-44 | AV mixing_desk→speaker audio cable stored and retrieved"""
        pid = self._create_project()

        print(f"  Input Data : mixing_desk→speaker  cableType='audio'")
        print("  Expected   : connections list contains AUDIO_CABLE")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={
                "items":       [AV_MIXER, AV_SPEAKER],
                "connections": [AUDIO_CABLE],
                "updatedAt":   timezone.now().isoformat(),
            },
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        connections = get.data["connections"]
        self.assertEqual(len(connections), 1)
        self.assertEqual(connections[0]["cableType"], "audio")

    # ── TC-45 ──────────────────────────────────────────────────────────────────

    def test_TC45_multiple_av_connections_all_persisted(self):
        """TC-45 | Multiple AV cables (video + audio) persisted together"""
        pid = self._create_project()

        print("  Input Data : [VIDEO_CABLE (camera→screen), AUDIO_CABLE (mixer→speaker)]")
        print("  Expected   : Both connections returned, types correct")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={
                "items":       [AV_CAMERA, AV_SCREEN, AV_MIXER, AV_SPEAKER],
                "connections": [VIDEO_CABLE, AUDIO_CABLE],
                "updatedAt":   timezone.now().isoformat(),
            },
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        connections = get.data["connections"]
        self.assertEqual(len(connections), 2)
        cable_types = {c["cableType"] for c in connections}
        self.assertIn("video", cable_types)
        self.assertIn("audio", cable_types)

    # ── TC-46 ──────────────────────────────────────────────────────────────────

    def test_TC46_scene_settings_persisted(self):
        """TC-46 | Scene settings (lighting, floor, grid) stored correctly"""
        pid = self._create_project()

        print(f"  Input Data : sceneSettings={SCENE_SETTINGS}")
        print("  Expected   : GET returns same sceneSettings object")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={
                "sceneSettings": SCENE_SETTINGS,
                "updatedAt":     timezone.now().isoformat(),
            },
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        settings = get.data.get("sceneSettings", {})
        self.assertEqual(settings.get("lightingMood"),   SCENE_SETTINGS["lightingMood"])
        self.assertEqual(settings.get("floorMaterial"),  SCENE_SETTINGS["floorMaterial"])
        self.assertEqual(settings.get("showGrid"),       SCENE_SETTINGS["showGrid"])

    # ── TC-47 ──────────────────────────────────────────────────────────────────

    def test_TC47_full_scene_structure_valid_for_export(self):
        """TC-47 | Complete scene with items + connections + settings → all keys present"""
        pid = self._create_project("Full Scene Export Test")

        print("  Input Data : Patch with items, connections, and sceneSettings")
        print("  Expected   : GET returns 'room', 'items', 'connections', 'sceneSettings'")

        self.client.patch(
            f"/api/projects/{pid}/",
            data={
                "items":         [ROUND_TABLE, STAGE, AV_CAMERA, AV_SCREEN],
                "connections":   [VIDEO_CABLE],
                "sceneSettings": SCENE_SETTINGS,
                "updatedAt":     timezone.now().isoformat(),
            },
            format="json",
        )

        get = self.client.get(f"/api/projects/{pid}/")
        self.assertEqual(get.status_code, status.HTTP_200_OK)

        for key in ("room", "items", "connections", "sceneSettings"):
            self.assertIn(key, get.data, msg=f"Key '{key}' missing from project response")

        self.assertGreater(len(get.data["items"]),       0)
        self.assertGreater(len(get.data["connections"]), 0)
