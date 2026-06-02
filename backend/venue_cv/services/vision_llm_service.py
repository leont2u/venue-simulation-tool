"""
Vision LLM Service — uses Gemma 3 vision (Ollama) to analyse venue images.

Replaces all mock fallbacks in local development so every uploaded image
produces image-specific results without needing GPU / YOLO / Depth Anything.

One call produces:
  - Detected object groups with region bounding boxes and counts
  - Room dimensions (metres)
  - Venue type and layout type

Production uses YOLO World + Depth Anything V2 instead.
"""
import base64
import json
import logging
import re
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


VISION_PROMPT = """You are an expert venue layout analyst with computer vision expertise.

Carefully study this venue photograph and return a JSON analysis.

RULES — follow exactly:
1. Return ONLY valid JSON. No markdown fences, no explanation, nothing else.
2. Detect EVERY visible object: chairs, tables, sofas, stages, podiums, screens,
   chandeliers, curtains, windows, doors, wall lights, columns, plants, bars.
3. Group identical nearby objects (e.g. "6 chairs along left wall") rather than
   listing each one separately.
4. bbox_normalized = [x1, y1, x2, y2] as fractions 0.0–1.0 of image width/height,
   top-left origin. Cover the full region the group occupies.
5. Estimate room dimensions from perspective cues and visible furniture scale.
6. Be specific — if you can see it is a U-shaped table arrangement, say so.

Return this exact schema:
{
  "venue_type": "<conference_room|ballroom|banquet_hall|theater|auditorium|classroom|boardroom|hotel_lobby|restaurant|church|exhibition_hall|wedding_venue>",
  "layout_type": "<u_shape|classroom|theater|banquet|boardroom|hollow_square|cocktail|scattered>",
  "room": {
    "width_meters": <float>,
    "depth_meters": <float>,
    "height_meters": <float>
  },
  "object_groups": [
    {
      "class": "<chair|table|sofa|stage|podium|chandelier|curtain|door|window|lighting fixture|projection screen|speaker|column|plant|bar counter>",
      "label": "<descriptive label, e.g. left-wall chairs>",
      "count": <integer>,
      "bbox_normalized": [<x1>, <y1>, <x2>, <y2>],
      "confidence": <0.0–1.0>
    }
  ],
  "walls": {
    "material": "<painted_drywall|brick|glass|wood_panel|fabric>",
    "color": "<hex color e.g. #D0CEC8>"
  },
  "floor": {
    "material": "<carpet|hardwood|tile|concrete>",
    "color": "<hex color>"
  },
  "notes": "<one sentence observation>"
}"""


class VisionLLMService:
    """
    Sends the venue image to Gemma 3 (multimodal) via Ollama and parses
    the structured JSON response into per-stage pipeline data.
    """

    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model    = getattr(settings, "OLLAMA_MODEL",    "gemma3:latest")

    def analyse(self, image_path: str) -> dict | None:
        """
        Run vision analysis on the image file.

        Returns a parsed dict matching the schema above, or None on failure.
        """
        if not HTTPX_AVAILABLE:
            logger.warning("httpx not installed — VisionLLMService unavailable")
            return None

        b64 = self._encode_image(image_path)
        if not b64:
            return None

        try:
            response = httpx.post(
                f"{self.base_url}/api/generate",
                json={
                    "model":  self.model,
                    "prompt": VISION_PROMPT,
                    "images": [b64],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,   # low temp for deterministic JSON
                        "num_predict": 2000,
                    },
                },
                timeout=180.0,
            )
            response.raise_for_status()
            raw = response.json().get("response", "").strip()
            return self._parse(raw)
        except Exception:
            logger.exception("VisionLLMService.analyse failed for %s", image_path)
            return None

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _encode_image(self, image_path: str) -> str | None:
        try:
            path = Path(image_path)
            if not path.exists():
                logger.error("Image not found: %s", image_path)
                return None
            with open(path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except Exception:
            logger.exception("Failed to encode image %s", image_path)
            return None

    def _parse(self, raw: str) -> dict | None:
        # Strip accidental markdown fences
        raw = raw.strip()
        if "```" in raw:
            # Extract content between first ``` pair
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if match:
                raw = match.group(1).strip()

        # Find the outermost JSON object
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            logger.error("VisionLLMService: no JSON object found in response")
            return None

        try:
            data = json.loads(raw[start:end])
            return self._validate(data)
        except json.JSONDecodeError as e:
            logger.error("VisionLLMService: JSON parse error: %s", e)
            # Try to recover partial JSON
            return self._recover_partial(raw[start:end])

    def _validate(self, data: dict) -> dict:
        """Apply defaults for any missing keys."""
        data.setdefault("venue_type",  "conference_room")
        data.setdefault("layout_type", "scattered")
        room = data.setdefault("room", {})
        room.setdefault("width_meters",  10.0)
        room.setdefault("depth_meters",  8.0)
        room.setdefault("height_meters", 3.0)
        data.setdefault("object_groups", [])
        data.setdefault("walls",  {"material": "painted_drywall", "color": "#D0CEC8"})
        data.setdefault("floor",  {"material": "carpet",          "color": "#8B7355"})
        data.setdefault("notes",  "")
        return data

    def _recover_partial(self, text: str) -> dict | None:
        """Last-resort: extract what we can from a partially valid JSON string."""
        try:
            # Try json.loads with common fixes
            fixed = re.sub(r",\s*}", "}", text)      # trailing commas
            fixed = re.sub(r",\s*]", "]", fixed)
            return self._validate(json.loads(fixed))
        except Exception:
            return None


def expand_groups_to_objects(
    groups: list[dict],
    image_w: int = 1024,
    image_h: int = 1024,
) -> list[dict]:
    """
    Expand vision LLM object groups into individual YOLO-style detections.

    For a group of N chairs covering a region, distributes N individual
    bounding boxes across the region using a grid pattern.

    Returns list of { class, confidence, bbox: [x1,y1,x2,y2] } in pixels.
    """
    import numpy as np

    detections = []
    for group in groups:
        cls   = group.get("class", "unknown")
        count = max(1, int(group.get("count", 1)))
        conf  = float(group.get("confidence", 0.8))
        bn    = group.get("bbox_normalized", [0.1, 0.1, 0.9, 0.9])

        # Convert normalised bbox to pixels
        x1 = bn[0] * image_w
        y1 = bn[1] * image_h
        x2 = bn[2] * image_w
        y2 = bn[3] * image_h

        if count == 1:
            detections.append({
                "class": cls, "confidence": conf,
                "bbox": [x1, y1, x2, y2],
            })
            continue

        # Distribute N objects in a grid inside the region
        cols = max(1, int(np.ceil(np.sqrt(count))))
        rows = max(1, int(np.ceil(count / cols)))
        rw   = (x2 - x1) / cols
        rh   = (y2 - y1) / rows

        placed = 0
        for row in range(rows):
            for col in range(cols):
                if placed >= count:
                    break
                ox1 = x1 + col * rw + rw * 0.1
                oy1 = y1 + row * rh + rh * 0.1
                ox2 = ox1 + rw * 0.8
                oy2 = oy1 + rh * 0.8
                detections.append({
                    "class": cls, "confidence": conf,
                    "bbox": [ox1, oy1, ox2, oy2],
                })
                placed += 1

    return detections
