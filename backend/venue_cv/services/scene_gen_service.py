"""
Scene Generation Service.

Converts a finalised SceneGraph (with asset mappings) into a Project JSON
that the existing editor can open directly at /editor/[id].
"""
import uuid
import logging

from venue_cv.models import SceneGraph

logger = logging.getLogger(__name__)

# Wall / structural object types — placed via architecture, not as SceneItems
STRUCTURAL_TYPES = {"door", "window", "column", "wall", "curtain"}

HDRI_MAP = {
    "conference_room": "studio",
    "boardroom":       "studio",
    "ballroom":        "sunset",
    "banquet_hall":    "sunset",
    "theater":         "night",
    "auditorium":      "night",
    "wedding_venue":   "sunset",
    "church":          "sunrise",
    "exhibition_hall": "warehouse",
    "restaurant":      "studio",
    "hotel_lobby":     "lobby",
    "classroom":       "studio",
}


class SceneGenService:

    def generate(self, scene_graph: SceneGraph) -> dict:
        sg         = scene_graph.graph_json
        asset_map  = {
            m.class_name: m
            for m in scene_graph.asset_mappings.all()
        }

        items       = []
        seen_ids    = set()

        for obj in sg.get("objects", []):
            if obj["id"] in seen_ids:
                continue
            seen_ids.add(obj["id"])

            class_name = obj["type"]
            if class_name in STRUCTURAL_TYPES:
                continue   # walls/windows handled in architecture block

            mapping    = asset_map.get(class_name)
            asset_url, scale = self._resolve_asset(class_name, obj, mapping)

            items.append({
                "id":        str(uuid.uuid4()),
                "type":      class_name,
                "x":         obj.get("world_x", 0.0),
                "y":         obj.get("world_y", 0.0),
                "z":         obj.get("world_z", 0.0),
                "rotationY": obj.get("rotation_y", 0.0),
                "scale":     scale,
                "assetUrl":  asset_url,
                "label":     self._label(class_name),
                "source":    mapping.asset_source if mapping else "internal",
                "layer":     "layout",
                "_cvObjectId": obj["id"],  # traceability back to detection
            })

        semantic   = sg.get("semantic", {})
        venue_type = semantic.get("venue_type", "")

        return {
            "name":         self._project_name(semantic),
            "room":         sg.get("room", {"width": 10, "depth": 8, "height": 3}),
            "items":        items,
            "connections":  [],
            "architecture": sg.get("architecture", {}),
            "sceneSettings": self._scene_settings(sg, venue_type),
            "measurements": [],
        }

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _resolve_asset(
        self,
        class_name: str,
        obj: dict,
        mapping,
    ) -> tuple[str, list[float]]:
        if mapping:
            scale = [mapping.scale_x, mapping.scale_y, mapping.scale_z]
            # Override with estimated physical size when confidence is high
            if obj.get("est_width", 0) > 0.1:
                scale = [
                    obj["est_width"],
                    obj.get("est_height", scale[1]),
                    obj.get("est_depth", obj["est_width"]),
                ]
            return mapping.asset_url, scale

        # Fallback to primitive
        return "primitive://box", [
            obj.get("est_width",  1.0),
            obj.get("est_height", 1.0),
            obj.get("est_depth",  1.0),
        ]

    def _label(self, class_name: str) -> str:
        return class_name.replace("_", " ").title()

    def _project_name(self, semantic: dict) -> str:
        venue_type  = semantic.get("venue_type", "Venue")
        layout_type = semantic.get("event_setup_style", "")
        name        = venue_type.replace("_", " ").title()
        if layout_type:
            name += f" — {layout_type.replace('_', ' ').title()}"
        return f"CV: {name}"

    def _scene_settings(self, sg: dict, venue_type: str) -> dict:
        objects      = sg.get("objects", [])
        class_set    = {o["type"] for o in objects}
        has_chandelier = "chandelier" in class_set
        has_windows    = len(sg.get("architecture", {}).get("windows", [])) > 0

        return {
            "ambientLight":      0.5 if has_windows else 0.4,
            "directionalLight":  0.8,
            "shadows":           True,
            "hdri":              HDRI_MAP.get(venue_type, "studio"),
            "bloom":             has_chandelier,
            "fogEnabled":        False,
            "backgroundColor":   "#e8e8e8",
        }
