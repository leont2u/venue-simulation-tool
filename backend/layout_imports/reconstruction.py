import math
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


DEFAULT_ROOM_WIDTH_M = 38.0
WALL_HEIGHT_M = 3.0
WALL_THICKNESS_M = 0.2
CHAIR_DISTANCE_M = 1.05


def _required_asset_url(asset_type: str):
    return f"poly-pizza://required/{asset_type}"


def _iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _line_length(line):
    return math.hypot(line["x2"] - line["x1"], line["y2"] - line["y1"])


def _bounds(understanding):
    points = []
    for wall in understanding["walls"]:
        points.extend([(wall["x1"], wall["y1"]), (wall["x2"], wall["y2"])])
    for room in understanding["rooms"][:4]:
        points.extend(
            [
                (room["x"], room["y"]),
                (room["x"] + room["width"], room["y"] + room["height"]),
            ]
        )
    for item in understanding.get("furniture", []):
        points.append((item["x"], item["y"]))

    if not points:
        image = understanding["image"]
        return {"minX": 0, "minY": 0, "maxX": image["width"], "maxY": image["height"]}

    return {
        "minX": min(point[0] for point in points),
        "minY": min(point[1] for point in points),
        "maxX": max(point[0] for point in points),
        "maxY": max(point[1] for point in points),
    }


def _world_point(x, y, bounds, px_to_meter):
    mid_x = (bounds["minX"] + bounds["maxX"]) / 2
    mid_y = (bounds["minY"] + bounds["maxY"]) / 2
    return (x - mid_x) * px_to_meter, (y - mid_y) * px_to_meter


def _estimate_scale(understanding, bounds, user_px_to_meter=None):
    if user_px_to_meter:
        return float(user_px_to_meter)

    width_px = max(1.0, bounds["maxX"] - bounds["minX"])
    depth_px = max(1.0, bounds["maxY"] - bounds["minY"])
    dominant_px = max(width_px, depth_px)
    return DEFAULT_ROOM_WIDTH_M / dominant_px


def _wall_item(line, bounds, px_to_meter):
    x1, z1 = _world_point(line["x1"], line["y1"], bounds, px_to_meter)
    x2, z2 = _world_point(line["x2"], line["y2"], bounds, px_to_meter)
    length = math.hypot(x2 - x1, z2 - z1)
    rotation_y = -math.atan2(z2 - z1, x2 - x1)

    return {
        "id": str(uuid4()),
        "type": "wall",
        "x": round((x1 + x2) / 2, 3),
        "y": 0,
        "z": round((z1 + z2) / 2, 3),
        "rotationY": round(rotation_y, 4),
        "scale": [round(max(length, 0.15), 3), WALL_HEIGHT_M, WALL_THICKNESS_M],
        "assetUrl": "primitive://wall",
        "label": "Detected wall",
        "color": "#d9d3c7",
        "material": {"roughness": 0.82, "metalness": 0.02},
        "source": "floorplan_cv",
        "sourceId": line.get("id"),
    }


def _marker_item(kind, source, bounds, px_to_meter):
    if "x1" in source:
        x1, z1 = _world_point(source["x1"], source["y1"], bounds, px_to_meter)
        x2, z2 = _world_point(source["x2"], source["y2"], bounds, px_to_meter)
        length = math.hypot(x2 - x1, z2 - z1)
        rotation_y = -math.atan2(z2 - z1, x2 - x1)
        x = (x1 + x2) / 2
        z = (z1 + z2) / 2
    else:
        x, z = _world_point(source["x"], source["y"], bounds, px_to_meter)
        length = max(0.9, source.get("radius", 30) * px_to_meter)
        rotation_y = 0

    return {
        "id": str(uuid4()),
        "type": kind,
        "x": round(x, 3),
        "y": 0,
        "z": round(z, 3),
        "rotationY": round(rotation_y, 4),
        "scale": [round(max(length, 0.5), 3), 0.08 if kind == "window" else 2.1, 0.16],
        "assetUrl": f"primitive://{kind}",
        "label": kind.title(),
        "color": "#8fb8c8" if kind == "window" else "#7b5a43",
        "source": "floorplan_cv",
        "sourceId": source.get("id"),
    }


def _asset_item(
    item_type,
    x,
    z,
    label,
    scale,
    *,
    rotation_y=0,
    asset_search=None,
    source_id=None,
):
    return {
        "id": str(uuid4()),
        "type": item_type,
        "x": round(x, 3),
        "y": 0,
        "z": round(z, 3),
        "rotationY": round(rotation_y, 4),
        "scale": [round(scale[0], 3), round(scale[1], 3), round(scale[2], 3)],
        "assetUrl": _required_asset_url(item_type),
        "label": label,
        "source": "floorplan_cv",
        "sourceId": source_id,
        "assetSearch": asset_search or item_type.replace("_", " "),
    }


def _chair_item(x, z, label, rotation_y, source_id=None):
    return _asset_item(
        "chair",
        x,
        z,
        label,
        [0.62, 0.82, 0.62],
        rotation_y=rotation_y,
        asset_search="event chair",
        source_id=source_id,
    )


def _round_table_items(source, x, z, diameter):
    items = [
        _asset_item(
            "round_table",
            x,
            z,
            "Detected round table",
            [diameter, 0.75, diameter],
            asset_search="round banquet table",
            source_id=source.get("id"),
        )
    ]
    seats = 8 if diameter < 2.1 else 10
    radius = max(0.9, diameter / 2 + 0.38)
    for index in range(seats):
        angle = (math.pi * 2 * index) / seats
        chair_x = x + math.cos(angle) * radius
        chair_z = z + math.sin(angle) * radius
        items.append(
            _chair_item(
                chair_x,
                chair_z,
                f"Round table chair {index + 1}",
                -angle + math.pi / 2,
                source.get("id"),
            )
        )
    return items


def _rectangular_table_items(source, x, z, width, depth, rotation_y):
    segment_count = max(1, math.ceil(width / 2.0))
    segment_width = width / segment_count
    direction_x = math.cos(-rotation_y)
    direction_z = math.sin(-rotation_y)
    items = []

    for index in range(segment_count):
        offset = (index - (segment_count - 1) / 2) * segment_width
        segment_x = x + direction_x * offset
        segment_z = z + direction_z * offset
        label = "Detected rectangular table" if segment_count == 1 else f"Detected long table segment {index + 1}"
        items.append(
            _asset_item(
                "rectangular_table",
                segment_x,
                segment_z,
                label,
                [segment_width, 0.75, depth],
                rotation_y=rotation_y,
                asset_search="rectangular dining table",
                source_id=source.get("id"),
            )
        )

    seats_per_side = max(2, math.ceil(width / 0.95))
    normal_x = math.cos(-rotation_y + math.pi / 2)
    normal_z = math.sin(-rotation_y + math.pi / 2)
    start_offset = -width / 2 + width / (seats_per_side * 2)
    spacing = width / seats_per_side

    for side, side_rotation in [(-1, rotation_y), (1, rotation_y + math.pi)]:
        for index in range(seats_per_side):
            offset = start_offset + index * spacing
            chair_x = x + direction_x * offset + normal_x * side * (depth / 2 + 0.52)
            chair_z = z + direction_z * offset + normal_z * side * (depth / 2 + 0.52)
            items.append(
                _chair_item(
                    chair_x,
                    chair_z,
                    f"Rectangular table chair {index + 1}",
                    side_rotation,
                    source.get("id"),
                )
            )

    if width >= 2.2:
        for offset, rotation in [(-width / 2 - 0.48, rotation_y - math.pi / 2), (width / 2 + 0.48, rotation_y + math.pi / 2)]:
            items.append(
                _chair_item(
                    x + direction_x * offset,
                    z + direction_z * offset,
                    "Rectangular table end chair",
                    rotation,
                    source.get("id"),
                )
            )

    return items


def _furniture_items(source, bounds, px_to_meter):
    x, z = _world_point(source["x"], source["y"], bounds, px_to_meter)
    if source["type"] in {"banquet_table", "round_table"}:
        diameter = max(1.1, min(2.4, source.get("width", 70) * px_to_meter))
        if diameter < 1.25:
            return []
        return _round_table_items(source, x, z, diameter)

    width = max(1.0, min(6.0, source.get("width", 100) * px_to_meter))
    depth = max(0.5, min(1.8, source.get("height", 35) * px_to_meter))
    rotation_y = -math.radians(source.get("rotationDeg", 0))
    return _rectangular_table_items(source, x, z, width, depth, rotation_y)


def _zone_item(source, bounds, px_to_meter):
    x, z = _world_point(source["x"], source["y"], bounds, px_to_meter)
    width = max(2.0, min(12.0, source.get("width", 120) * px_to_meter))
    depth = max(1.8, min(9.0, source.get("height", 90) * px_to_meter))
    kind = source.get("type", "zone")

    return {
        "id": str(uuid4()),
        "type": kind,
        "x": round(x, 3),
        "y": 0,
        "z": round(z, 3),
        "rotationY": round(-math.radians(source.get("rotationDeg", 0)), 4),
        "scale": [round(width, 3), 0.035, round(depth, 3)],
        "assetUrl": f"primitive://{kind}",
        "label": "Dance Floor" if kind == "dance_floor" else "Detected zone",
        "color": "#d4a373" if kind == "dance_floor" else "#e9edc9",
        "material": {"roughness": 0.58, "metalness": 0.02},
        "source": "floorplan_cv",
        "sourceId": source.get("id"),
    }


def _item_bbox(item, padding=0.0):
    return {
        "x1": item["x"] - item["scale"][0] / 2 - padding,
        "z1": item["z"] - item["scale"][2] / 2 - padding,
        "x2": item["x"] + item["scale"][0] / 2 + padding,
        "z2": item["z"] + item["scale"][2] / 2 + padding,
    }


def _bbox_overlap_ratio(first, second, padding=0.0):
    a = _item_bbox(first, padding)
    b = _item_bbox(second, padding)
    overlap_width = max(0.0, min(a["x2"], b["x2"]) - max(a["x1"], b["x1"]))
    overlap_depth = max(0.0, min(a["z2"], b["z2"]) - max(a["z1"], b["z1"]))
    overlap_area = overlap_width * overlap_depth
    if overlap_area <= 0:
        return 0.0

    first_area = max(0.01, (a["x2"] - a["x1"]) * (a["z2"] - a["z1"]))
    second_area = max(0.01, (b["x2"] - b["x1"]) * (b["z2"] - b["z1"]))
    return overlap_area / min(first_area, second_area)


def _dedupe_scene_items(items):
    priority = {
        "dance_floor": 0,
        "rectangular_table": 1,
        "round_table": 1,
        "chair": 2,
    }
    result = []
    for item in sorted(items, key=lambda entry: (priority.get(entry["type"], 3), entry["z"], entry["x"])):
        duplicate = False
        for existing in result:
            same_type = item["type"] == existing["type"]
            center_distance = math.hypot(item["x"] - existing["x"], item["z"] - existing["z"])
            size = max(item["scale"][0], item["scale"][2], existing["scale"][0], existing["scale"][2])
            if same_type and center_distance < size * 0.36:
                duplicate = True
                break
            if same_type and _bbox_overlap_ratio(item, existing) > 0.55:
                duplicate = True
                break
        if not duplicate:
            result.append(item)
    return result


def _remove_overlapping_floor_objects(items):
    zones = [item for item in items if item["type"] == "dance_floor"]
    furniture = [item for item in items if item["type"] != "dance_floor"]
    clean_furniture = []

    for item in furniture:
        overlaps_zone = any(_bbox_overlap_ratio(item, zone, padding=0.08) > 0.18 for zone in zones)
        overlaps_furniture = any(
            item["type"] == existing["type"] and _bbox_overlap_ratio(item, existing, padding=0.12) > 0.52
            for existing in clean_furniture
        )
        if not overlaps_zone and not overlaps_furniture:
            clean_furniture.append(item)

    return zones + clean_furniture


def _clean_project_name(file_name, project_name):
    if project_name and project_name.strip():
        return project_name.strip()
    stem = re.sub(r"\.(png|jpg|jpeg|pdf)$", "", Path(file_name).name, flags=re.IGNORECASE)
    return stem or "Imported Floor Plan"


def reconstruct_project_from_understanding(
    understanding,
    file_name: str,
    project_name: str | None = None,
    px_to_meter: float | None = None,
):
    bounds = _bounds(understanding)
    scale = _estimate_scale(understanding, bounds, px_to_meter)
    room_width = max(6.0, round((bounds["maxX"] - bounds["minX"]) * scale + 1.6, 1))
    room_depth = max(6.0, round((bounds["maxY"] - bounds["minY"]) * scale + 1.6, 1))

    walls = [
        _wall_item(line, bounds, scale)
        for line in understanding["walls"]
        if _line_length(line) * scale >= 0.55
    ]
    windows = [_marker_item("window", window, bounds, scale) for window in understanding["windows"][:24]]
    doors = [_marker_item("door", door, bounds, scale) for door in understanding["doors"][:20]]
    zones = [
        _zone_item(zone, bounds, scale)
        for zone in understanding.get("zones", [])
    ]
    furniture_items = []
    for source_item in understanding.get("furniture", []):
        furniture_items.extend(_furniture_items(source_item, bounds, scale))
    furniture = _remove_overlapping_floor_objects(_dedupe_scene_items(furniture_items + zones))

    created_at = _iso_now()
    return {
        "id": str(uuid4()),
        "name": _clean_project_name(file_name, project_name),
        "createdAt": created_at,
        "updatedAt": created_at,
        "room": {
            "width": room_width,
            "depth": room_depth,
            "height": 3.4,
            "wallThickness": WALL_THICKNESS_M,
        },
        "items": walls + windows + doors + furniture,
        "connections": [],
        "measurements": [],
        "sceneSettings": {
            "showGrid": True,
            "enableHdri": True,
            "ambientLightIntensity": 0.75,
            "directionalLightIntensity": 1.25,
            "snapToGrid": True,
            "livestreamMode": False,
            "wallThickness": WALL_THICKNESS_M,
            "wallColor": "#f3efe7",
            "floorColor": "#f2eee6",
            "floorMaterial": "Concrete",
            "wallMaterial": "Painted",
            "venueEnvironment": "indoor",
            "lightingMood": "conference",
        },
        "floorPlanUnderstanding": {
            "scaleMetersPerPixel": scale,
            "detectedCounts": {
                "walls": len(understanding["walls"]),
                "doors": len(understanding["doors"]),
                "windows": len(understanding["windows"]),
                "rooms": len(understanding["rooms"]),
                "furniture": len(understanding.get("furniture", [])),
                "zones": len(understanding.get("zones", [])),
            },
            "rooms": understanding["rooms"],
            "zones": understanding.get("zones", []),
        },
    }
