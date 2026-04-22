import json
import math
import re
from datetime import datetime, timezone
from html import unescape
from uuid import uuid4
from xml.etree import ElementTree as ET


PX_TO_WORLD = 0.02

ASSET_VISUALS = {
    "chair": {"scale": [0.7, 0.7, 0.7], "assetUrl": "/models/chair.glb"},
    "podium": {"scale": [0.1, 0.1, 0.1], "assetUrl": "/models/podium.glb"},
    "desk": {"scale": [1, 1, 1], "assetUrl": "/models/desk.glb"},
    "screen": {"scale": [1, 1, 1], "assetUrl": "/models/screen.glb"},
    "tv": {"scale": [1, 1, 1], "assetUrl": "/models/tv.glb"},
    "camera": {"scale": [1, 1, 1], "assetUrl": "/models/camera.glb"},
    "piano": {"scale": [1, 1, 1], "assetUrl": "/models/piano.glb"},
    "altar": {"scale": [1, 1, 1], "assetUrl": "/models/altar.glb"},
}


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def strip_html(value: str):
    return re.sub(r"<[^>]+>", "", unescape(value or "")).strip()


def extract_xml_from_content(content: str):
    trimmed = content.strip()
    if trimmed.startswith("<mxfile") or trimmed.startswith("<?xml"):
        return trimmed

    match = re.search(r'data-mxgraph="([^"]+)"', content, flags=re.IGNORECASE)
    if not match:
        raise ValueError("Could not find draw.io data in the uploaded file.")

    parsed = json.loads(unescape(match.group(1)))
    if not parsed.get("xml"):
        raise ValueError("Could not extract XML from draw.io HTML export.")

    return parsed["xml"]


def parse_rotation(style: str):
    match = re.search(r"rotation=([0-9.]+)", style or "")
    return float(match.group(1)) if match else 0.0


def parse_cells(xml: str):
    root = ET.fromstring(xml)
    parsed = []

    for cell in root.iter():
        tag = cell.tag.split("}")[-1]
        if tag != "mxCell" or cell.attrib.get("vertex") != "1":
            continue

        geometry = next(
            (child for child in cell if child.tag.split("}")[-1] == "mxGeometry"),
            None,
        )
        if geometry is None:
            continue

        width = float(geometry.attrib.get("width", 0) or 0)
        height = float(geometry.attrib.get("height", 0) or 0)
        if not width and not height:
            continue

        parsed.append(
            {
                "id": cell.attrib.get("id") or str(uuid4()),
                "style": cell.attrib.get("style", ""),
                "value": cell.attrib.get("value", ""),
                "x": float(geometry.attrib.get("x", 0) or 0),
                "y": float(geometry.attrib.get("y", 0) or 0),
                "width": width,
                "height": height,
                "rotationDeg": parse_rotation(cell.attrib.get("style", "")),
            }
        )

    return parsed


def classify_cell(cell):
    style = cell["style"].lower()
    label = strip_html(cell["value"]).lower()

    if "mxgraph.floorplan.office_chair" in style:
        return {**cell, "objectType": "chair", "label": "Chair"}
    if "podium" in label:
        return {**cell, "objectType": "podium", "label": "Podium"}
    if "operation desk" in label or "desk" in label:
        return {**cell, "objectType": "desk", "label": "Operation Desk"}
    if "led screen" in label:
        return {**cell, "objectType": "screen", "label": "LED Screen"}
    if "tv" in label:
        return {**cell, "objectType": "tv", "label": "TV"}
    if "camera" in label:
        return {**cell, "objectType": "camera", "label": "Camera"}
    if "piano" in label:
        return {**cell, "objectType": "piano", "label": "Piano"}
    if "altar" in label:
        return {**cell, "objectType": "altar", "label": "Altar"}

    return None


def nearest_shape_center(label_cell, cells):
    label_cx = label_cell["x"] + label_cell["width"] / 2
    label_cy = label_cell["y"] + label_cell["height"] / 2

    best = None
    best_distance = float("inf")

    for candidate in cells:
        if candidate["id"] == label_cell["id"]:
            continue

        candidate_label = strip_html(candidate["value"])
        is_text_only = "text;" in candidate["style"]
        if candidate_label and is_text_only:
            continue
        if not candidate["width"] or not candidate["height"]:
            continue

        cx = candidate["x"] + candidate["width"] / 2
        cy = candidate["y"] + candidate["height"] / 2
        dx = cx - label_cx
        dy = cy - label_cy
        distance = math.sqrt(dx * dx + dy * dy)

        if distance < best_distance:
            best_distance = distance
            best = candidate

    return best if best_distance <= 120 else None


def create_scene_item(cell, bounds, all_cells):
    asset = ASSET_VISUALS.get(cell["objectType"])
    if asset is None:
        raise ValueError(f'No asset mapping found for {cell["objectType"]}')

    center_x = cell["x"] + cell["width"] / 2
    center_y = cell["y"] + cell["height"] / 2

    if cell["objectType"] != "chair":
        attached_shape = nearest_shape_center(cell, all_cells)
        if attached_shape:
            center_x = attached_shape["x"] + attached_shape["width"] / 2
            center_y = attached_shape["y"] + attached_shape["height"] / 2

    mid_x = (bounds["minX"] + bounds["maxX"]) / 2
    mid_y = (bounds["minY"] + bounds["maxY"]) / 2
    world_x = (center_x - mid_x) * PX_TO_WORLD
    world_z = (center_y - mid_y) * PX_TO_WORLD

    return {
        "id": str(uuid4()),
        "type": cell["objectType"],
        "x": round(world_x, 2),
        "y": 0,
        "z": round(world_z, 2),
        "rotationY": round(math.radians(cell["rotationDeg"]), 3),
        "scale": asset["scale"],
        "assetUrl": asset["assetUrl"],
        "label": cell.get("label"),
    }


def dedupe_items(items):
    result = []

    for item in items:
        exists = any(
            existing["type"] == item["type"]
            and math.sqrt((existing["x"] - item["x"]) ** 2 + (existing["z"] - item["z"]) ** 2)
            < 0.35
            for existing in result
        )
        if not exists:
            result.append(item)

    return result


def drawio_file_to_project(content: str, file_name: str, project_name: str | None = None):
    xml = extract_xml_from_content(content)
    cells = parse_cells(xml)
    classified = [cell for cell in (classify_cell(cell) for cell in cells) if cell]

    if not classified:
        raise ValueError("No supported draw.io objects were found.")

    bounds = {
        "minX": min(cell["x"] for cell in classified),
        "minY": min(cell["y"] for cell in classified),
        "maxX": max(cell["x"] + cell["width"] for cell in classified),
        "maxY": max(cell["y"] + cell["height"] for cell in classified),
    }

    items = dedupe_items(
        [create_scene_item(cell, bounds, cells) for cell in classified]
    )

    room_width = max(20, round((bounds["maxX"] - bounds["minX"]) * PX_TO_WORLD + 6, 1))
    room_depth = max(14, round((bounds["maxY"] - bounds["minY"]) * PX_TO_WORLD + 6, 1))
    project_title = (
        (project_name or "").strip()
        or re.sub(r"\.(drawio|xml|html)$", "", file_name, flags=re.IGNORECASE)
        or "Imported Draw.io Project"
    )

    return {
        "id": str(uuid4()),
        "name": project_title,
        "createdAt": iso_now(),
        "updatedAt": iso_now(),
        "room": {
            "width": room_width,
            "depth": room_depth,
            "height": 4,
        },
        "items": items,
    }
