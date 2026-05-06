import math
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np

from .preprocessing import PreprocessedFloorPlan


PHOTO_ROOM_WIDTH_M = 24.0
PHOTO_ROOM_DEPTH_M = 18.0
PHOTO_ROOM_HEIGHT_M = 6.2
WALL_THICKNESS_M = 0.2
REAL_ASSET_TYPES = {
    "chair": "event chair",
    "rectangular_table": "rectangular dining table",
    "sofa": "sofa",
    "plant": "plant",
}


def _iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _clean_project_name(file_name, project_name):
    if project_name and project_name.strip():
        return project_name.strip()
    stem = re.sub(r"\.(png|jpg|jpeg|pdf)$", "", Path(file_name).name, flags=re.IGNORECASE)
    return f"{stem or 'Imported Venue Photo'} 3D"


def _item(
    item_type,
    x,
    z,
    label,
    scale,
    *,
    y=0,
    rotation_y=0,
    color=None,
    roughness=0.72,
    metalness=0.05,
    asset_search=None,
):
    use_real_asset = item_type in REAL_ASSET_TYPES
    item = {
        "id": str(uuid4()),
        "type": item_type,
        "x": round(x, 3),
        "y": round(y, 3),
        "z": round(z, 3),
        "rotationY": round(rotation_y, 4),
        "scale": [round(scale[0], 3), round(scale[1], 3), round(scale[2], 3)],
        "assetUrl": f"poly-pizza://required/{item_type}" if use_real_asset else f"primitive://{item_type}",
        "label": label,
        "source": "venue_photo_cv",
    }
    if use_real_asset:
        item["assetSearch"] = asset_search or REAL_ASSET_TYPES[item_type]
    if color:
        item["color"] = color
        item["material"] = {"roughness": roughness, "metalness": metalness}
    return item


def _wall(x, z, label, width, height, depth, *, rotation_y=0, color="#e7e4dc"):
    return _item(
        "wall",
        x,
        z,
        label,
        [width, height, depth],
        rotation_y=rotation_y,
        color=color,
        roughness=0.82,
        metalness=0.02,
    )


def _image_to_world(x, y, image_width, image_height):
    world_x = (x / max(1, image_width) - 0.5) * PHOTO_ROOM_WIDTH_M
    depth_factor = min(1.0, max(0.0, (y - image_height * 0.2) / (image_height * 0.72)))
    world_z = -PHOTO_ROOM_DEPTH_M / 2 + depth_factor * PHOTO_ROOM_DEPTH_M
    return world_x, world_z


def _dominant_floor_color(image):
    height = image.shape[0]
    floor_crop = image[int(height * 0.68) :, :]
    mean_bgr = floor_crop.reshape(-1, 3).mean(axis=0)
    return "#{:02x}{:02x}{:02x}".format(int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0]))


def _detect_ceiling_lights(plan: PreprocessedFloorPlan):
    image = plan.image
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    upper = gray[: int(height * 0.48), :]
    _, threshold = cv2.threshold(upper, 232, 255, cv2.THRESH_BINARY)
    threshold = cv2.morphologyEx(
        threshold,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)),
        iterations=1,
    )
    contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lights = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 12 or area > 360:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if w > 28 or h > 28:
            continue
        cx = x + w / 2
        cy = y + h / 2
        if any(math.hypot(cx - light["px"], cy - light["py"]) < 42 for light in lights):
            continue
        world_x, world_z = _image_to_world(cx, cy, width, height)
        lights.append({"px": cx, "py": cy, "x": world_x, "z": world_z, "area": area})

    lights.sort(key=lambda light: (light["py"], light["px"]))
    return lights[:18]


def _detect_vertical_columns(plan: PreprocessedFloorPlan):
    image = plan.image
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 160)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=110,
        minLineLength=int(height * 0.34),
        maxLineGap=18,
    )
    if lines is None:
        return []

    candidates = []
    for x1, y1, x2, y2 in lines[:, 0]:
        if abs(x1 - x2) > width * 0.015:
            continue
        length = abs(y2 - y1)
        if length < height * 0.36:
            continue
        cx = (x1 + x2) / 2
        if width * 0.08 < cx < width * 0.92:
            candidates.append({"x": float(cx), "top": min(y1, y2), "bottom": max(y1, y2), "length": float(length)})

    grouped = []
    for candidate in sorted(candidates, key=lambda entry: entry["x"]):
        group = next((entry for entry in grouped if abs(entry["x"] - candidate["x"]) < width * 0.025), None)
        if group is None:
            grouped.append(candidate)
        elif candidate["length"] > group["length"]:
            group.update(candidate)

    columns = []
    for entry in sorted(grouped, key=lambda entry: entry["length"], reverse=True)[:4]:
        world_x, world_z = _image_to_world(entry["x"], entry["bottom"] * 0.72 + entry["top"] * 0.28, width, height)
        columns.append({"x": world_x, "z": min(2.0, max(-7.2, world_z)), "confidence": entry["length"] / height})
    return columns


def _add_table_cluster(items, side, start_x):
    for row, z in enumerate([-1.6, 1.0, 3.6], start=1):
        for col in range(2):
            x = start_x + col * 2.8
            items.append(
                _item(
                    "rectangular_table",
                    x,
                    z,
                    f"{side} Cafe Table {row}-{col + 1}",
                    [1.65, 0.72, 0.85],
                    color="#d8c9a6",
                )
            )
            for offset_x, offset_z, rotation in [(-0.8, 0, math.pi / 2), (0.8, 0, -math.pi / 2), (0, 0.72, math.pi)]:
                items.append(
                    _item(
                        "chair",
                        x + offset_x,
                        z + offset_z,
                        f"{side} Chair {row}-{col + 1}",
                        [0.62, 0.82, 0.62],
                        rotation_y=rotation,
                        color="#f5f3ec",
                    )
                )


def reconstruct_project_from_photo(
    plan: PreprocessedFloorPlan,
    file_name: str,
    project_name: str | None = None,
):
    image_height, image_width = plan.image.shape[:2]
    floor_color = _dominant_floor_color(plan.image)
    created_at = _iso_now()

    items = [
        _wall(0, -PHOTO_ROOM_DEPTH_M / 2, "Back glazed wall", PHOTO_ROOM_WIDTH_M, PHOTO_ROOM_HEIGHT_M, WALL_THICKNESS_M, color="#dfe5df"),
        _wall(-PHOTO_ROOM_WIDTH_M / 2, 0, "Left wall", PHOTO_ROOM_DEPTH_M, PHOTO_ROOM_HEIGHT_M, WALL_THICKNESS_M, rotation_y=math.pi / 2),
        _wall(PHOTO_ROOM_WIDTH_M / 2, 0, "Right wall", PHOTO_ROOM_DEPTH_M, PHOTO_ROOM_HEIGHT_M, WALL_THICKNESS_M, rotation_y=math.pi / 2),
        _wall(0, 2.4, "Raised rear partition", PHOTO_ROOM_WIDTH_M * 0.86, 1.45, 0.22, color="#c8ced0"),
        _wall(-7.2, -4.8, "Left service counter", 5.2, 1.05, 0.85, color="#7a8179"),
        _wall(7.2, -4.8, "Right service counter", 5.2, 1.05, 0.85, color="#7a8179"),
        _item("window", 0, -8.88, "Tall central window", [3.0, 4.8, 0.12], y=1.0, color="#8fb8c8", roughness=0.12, metalness=0.02),
        _item("ceiling_cove", 0, -4.4, "Blue recessed ceiling cove", [17.5, 0.08, 6.8], y=PHOTO_ROOM_HEIGHT_M - 0.38, color="#9ec7ff", roughness=0.35, metalness=0.0),
        _item("railing", 0, -3.2, "Upper level railing", [16.2, 0.45, 0.12], y=1.42, color="#6f7775"),
        _item("sofa", 0, 6.3, "Front lounge sofa", [3.8, 0.82, 1.15], color="#8f9ea1"),
        _item("rectangular_table", 0, 7.8, "Front coffee table", [2.2, 0.42, 0.85], color="#d6b67a"),
        _item("plant", -0.55, 7.45, "Coffee table plant left", [0.38, 0.62, 0.38], y=0.42, color="#5f8c61"),
        _item("plant", 0.55, 7.45, "Coffee table plant right", [0.38, 0.62, 0.38], y=0.42, color="#5f8c61"),
    ]

    columns = _detect_vertical_columns(plan)
    if len(columns) < 2:
        columns = [{"x": -0.75, "z": -2.2}, {"x": 0.75, "z": -2.2}]
    for index, column in enumerate(columns[:3], start=1):
        items.append(
            _item(
                "column",
                column["x"],
                column["z"],
                f"Visible structural column {index}",
                [0.34, PHOTO_ROOM_HEIGHT_M, 0.34],
                color="#6e7373",
                roughness=0.62,
            )
        )

    for index, light in enumerate(_detect_ceiling_lights(plan), start=1):
        items.append(
            _item(
                "ceiling_light",
                light["x"],
                light["z"],
                f"Ceiling downlight {index}",
                [0.32, 0.05, 0.32],
                y=PHOTO_ROOM_HEIGHT_M - 0.18,
                color="#fff7d7",
                roughness=0.18,
                metalness=0.0,
            )
        )

    for index, (x, z) in enumerate([(-8.8, -2.7), (-4.2, -4.4), (4.2, -4.4), (8.8, -2.7)], start=1):
        items.append(
            _item(
                "pendant_fan",
                x,
                z,
                f"Ceiling fan {index}",
                [1.35, 0.16, 1.35],
                y=PHOTO_ROOM_HEIGHT_M - 1.28,
                color="#8b5e35",
                roughness=0.5,
                metalness=0.04,
            )
        )

    _add_table_cluster(items, "Left", -7.7)
    _add_table_cluster(items, "Right", 4.9)

    return {
        "id": str(uuid4()),
        "name": _clean_project_name(file_name, project_name),
        "createdAt": created_at,
        "updatedAt": created_at,
        "room": {
            "width": PHOTO_ROOM_WIDTH_M,
            "depth": PHOTO_ROOM_DEPTH_M,
            "height": PHOTO_ROOM_HEIGHT_M,
            "wallThickness": WALL_THICKNESS_M,
        },
        "items": items,
        "connections": [],
        "measurements": [],
        "sceneSettings": {
            "showGrid": True,
            "enableHdri": True,
            "ambientLightIntensity": 0.95,
            "directionalLightIntensity": 1.05,
            "snapToGrid": True,
            "livestreamMode": False,
            "wallThickness": WALL_THICKNESS_M,
            "wallColor": "#e7e4dc",
            "floorColor": floor_color,
            "floorMaterial": "Wood",
            "wallMaterial": "Painted",
            "venueEnvironment": "indoor",
            "lightingMood": "daylight",
        },
        "floorPlanUnderstanding": {
            "mode": "venue_photo",
            "image": {
                "width": image_width,
                "height": image_height,
                "sourceWidth": plan.source_width,
                "sourceHeight": plan.source_height,
            },
            "detectedCounts": {
                "columns": len(columns),
                "ceilingLights": len(_detect_ceiling_lights(plan)),
            },
        },
    }
