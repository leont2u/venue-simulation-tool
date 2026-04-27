import json
import math
import re
from datetime import datetime, timezone
from html import unescape
from statistics import median
from uuid import uuid4
from xml.etree import ElementTree as ET


DEFAULT_PX_TO_WORLD = 0.02
MAX_LABEL_DISTANCE_PX = 180

ASSET_VISUALS = {
    "chair": {"scale": [0.7, 0.7, 0.7], "assetUrl": "/models/chair.glb"},
    "podium": {"scale": [0.1, 0.1, 0.1], "assetUrl": "/models/podium.glb"},
    "desk": {"scale": [1, 1, 1], "assetUrl": "/models/desk.glb"},
    "screen": {"scale": [1, 1, 1], "assetUrl": "/models/screen.glb"},
    "tv": {"scale": [0.1, 0.1, 0.1], "assetUrl": "/models/tv.glb"},
    "camera": {"scale": [0.7, 0.7, 0.7], "assetUrl": "/models/camera.glb"},
    "piano": {"scale": [1, 1, 1], "assetUrl": "/models/piano.glb"},
    "altar": {"scale": [1, 1, 1], "assetUrl": "/models/altar.glb"},
    "entrance": {"scale": [2.0, 2.4, 0.4], "assetUrl": "primitive://entrance"},
}

TYPE_LABELS = {
    "chair": "Chair",
    "podium": "Podium",
    "desk": "Operation Desk",
    "screen": "LED Screen",
    "tv": "TV",
    "camera": "Camera",
    "piano": "Piano",
    "altar": "Altar",
    "entrance": "Entrance",
}

TEXT_TYPE_PATTERNS = (
    ("screen", ("led screen", "screen")),
    ("podium", ("podium",)),
    ("desk", ("operation desk", "operators", "operator", "desk")),
    ("camera", ("camera",)),
    ("piano", ("piano",)),
    ("altar", ("altar",)),
    ("entrance", ("main entrance", "mani entrance", "entrance")),
    ("tv", ("comfort monitor", "monitor", "tv")),
)


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def strip_html(value: str):
    return re.sub(r"<[^>]+>", "", unescape(value or "")).strip()


def parse_style(style: str):
    parsed = {}

    for part in (style or "").split(";"):
        if not part:
            continue

        if "=" in part:
            key, value = part.split("=", 1)
            parsed[key] = value
        else:
            parsed[part] = "1"

    return parsed


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


def tag_name(element):
    return element.tag.split("}")[-1]


def find_graph_root(xml: str):
    root = ET.fromstring(xml)
    root_tag = tag_name(root)

    if root_tag == "mxfile":
        diagrams = [child for child in root if tag_name(child) == "diagram"]
        if not diagrams:
            raise ValueError("The draw.io file does not contain any diagrams.")

        # Some files contain multiple pages. Pick the page with the richest vertex
        # content so we import the actual floor layout instead of blending pages.
        def score_diagram(diagram):
            graph_model = next(
                (child for child in diagram if tag_name(child) == "mxGraphModel"),
                None,
            )
            if graph_model is None:
                return 0
            return sum(
                1
                for cell in graph_model.iter()
                if tag_name(cell) == "mxCell" and cell.attrib.get("vertex") == "1"
            )

        selected_diagram = max(diagrams, key=score_diagram)
        graph_model = next(
            (child for child in selected_diagram if tag_name(child) == "mxGraphModel"),
            None,
        )
        if graph_model is None:
            raise ValueError("The selected draw.io page has no graph model.")

        root_element = next(
            (child for child in graph_model if tag_name(child) == "root"),
            None,
        )
        if root_element is None:
            raise ValueError("The selected draw.io page has no graph root.")

        return root_element

    if root_tag == "mxGraphModel":
        root_element = next((child for child in root if tag_name(child) == "root"), None)
        if root_element is None:
            raise ValueError("The uploaded graph model has no root element.")
        return root_element

    if root_tag == "root":
        return root

    raise ValueError("Unsupported draw.io XML structure.")


def geometry_value(geometry, key, default=0.0):
    if geometry is None:
        return default
    return float(geometry.attrib.get(key, default) or default)


def geometry_child(geometry, child_name):
    if geometry is None:
        return None
    return next((child for child in geometry if tag_name(child) == child_name), None)


def parse_rotation_degrees(style_map):
    explicit_rotation = float(style_map.get("rotation", 0) or 0)
    direction = (style_map.get("direction") or "").lower()
    direction_offset = {
        "south": 0,
        "east": 90,
        "north": 180,
        "west": -90,
    }.get(direction, 0)
    return explicit_rotation + direction_offset


def parse_cells(xml: str):
    graph_root = find_graph_root(xml)
    raw_cells = {}

    for cell in graph_root.iter():
        if tag_name(cell) != "mxCell":
            continue

        geometry = next((child for child in cell if tag_name(child) == "mxGeometry"), None)
        source_point = geometry_child(geometry, "mxPoint")
        target_points = [
            child
            for child in (geometry or [])
            if tag_name(child) == "mxPoint" and child.attrib.get("as") == "targetPoint"
        ]
        target_point = target_points[0] if target_points else None

        raw_cells[cell.attrib.get("id") or str(uuid4())] = {
            "id": cell.attrib.get("id") or str(uuid4()),
            "parent": cell.attrib.get("parent"),
            "vertex": cell.attrib.get("vertex") == "1",
            "edge": cell.attrib.get("edge") == "1",
            "value": cell.attrib.get("value", ""),
            "style": cell.attrib.get("style", ""),
            "styleMap": parse_style(cell.attrib.get("style", "")),
            "geometryX": geometry_value(geometry, "x"),
            "geometryY": geometry_value(geometry, "y"),
            "width": geometry_value(geometry, "width"),
            "height": geometry_value(geometry, "height"),
            "sourcePoint": (
                None
                if source_point is None
                else {
                    "x": float(source_point.attrib.get("x", 0) or 0),
                    "y": float(source_point.attrib.get("y", 0) or 0),
                }
            ),
            "targetPoint": (
                None
                if target_point is None
                else {
                    "x": float(target_point.attrib.get("x", 0) or 0),
                    "y": float(target_point.attrib.get("y", 0) or 0),
                }
            ),
        }

    offset_cache = {}

    def absolute_offset(cell_id):
        if not cell_id or cell_id not in raw_cells:
            return (0.0, 0.0)
        if cell_id in offset_cache:
            return offset_cache[cell_id]

        cell = raw_cells[cell_id]
        parent_x, parent_y = absolute_offset(cell["parent"])
        absolute = (
            parent_x + cell["geometryX"],
            parent_y + cell["geometryY"],
        )
        offset_cache[cell_id] = absolute
        return absolute

    parsed_vertices = []
    parsed_edges = []

    edge_child_labels = {}
    for cell in raw_cells.values():
        parent_id = cell["parent"]
        if not parent_id or parent_id not in raw_cells:
            continue
        if raw_cells[parent_id]["edge"] and "edgeLabel" in cell["styleMap"]:
            edge_child_labels[parent_id] = strip_html(cell["value"])

    for cell in raw_cells.values():
        absolute_x, absolute_y = absolute_offset(cell["id"])
        label = strip_html(cell["value"])

        if cell["vertex"] and (cell["width"] or cell["height"]):
            parsed_vertices.append(
                {
                    "id": cell["id"],
                    "parent": cell["parent"],
                    "style": cell["style"],
                    "styleMap": cell["styleMap"],
                    "value": cell["value"],
                    "labelText": label,
                    "x": absolute_x,
                    "y": absolute_y,
                    "width": cell["width"],
                    "height": cell["height"],
                    "rotationDeg": parse_rotation_degrees(cell["styleMap"]),
                    "isTextOnly": "text" in cell["styleMap"],
                    "shape": (cell["styleMap"].get("shape") or "").lower(),
                }
            )

        if cell["edge"] and cell["sourcePoint"] and cell["targetPoint"]:
            parent_x, parent_y = absolute_offset(cell["parent"])
            parsed_edges.append(
                {
                    "id": cell["id"],
                    "style": cell["style"],
                    "styleMap": cell["styleMap"],
                    "labelText": label or edge_child_labels.get(cell["id"], ""),
                    "x1": cell["sourcePoint"]["x"] + parent_x,
                    "y1": cell["sourcePoint"]["y"] + parent_y,
                    "x2": cell["targetPoint"]["x"] + parent_x,
                    "y2": cell["targetPoint"]["y"] + parent_y,
                }
            )

    return parsed_vertices, parsed_edges


def infer_label_type(text: str):
    lowered = text.lower()

    for object_type, patterns in TEXT_TYPE_PATTERNS:
        if any(pattern in lowered for pattern in patterns):
            return object_type

    return None


def classify_shape_cell(cell):
    style = cell["style"].lower()
    label = cell["labelText"].lower()
    shape = cell["shape"]

    if "mxgraph.floorplan.office_chair" in style:
        return {**cell, "objectType": "chair", "label": TYPE_LABELS["chair"]}
    if "mxgraph.floorplan.flat_tv" in style or "mxgraph.office.devices.tv" in style:
        return {**cell, "objectType": "tv", "label": TYPE_LABELS["tv"]}
    if "camera" in style or "camera" in shape:
        return {**cell, "objectType": "camera", "label": TYPE_LABELS["camera"]}

    inferred = infer_label_type(label)
    if inferred and inferred in ASSET_VISUALS:
        return {**cell, "objectType": inferred, "label": TYPE_LABELS[inferred]}

    return None


def cell_center(cell):
    return (
        cell["x"] + cell["width"] / 2,
        cell["y"] + cell["height"] / 2,
    )


def cell_area(cell):
    return cell["width"] * cell["height"]


def line_distance(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    return math.sqrt(dx * dx + dy * dy)


def nearest_shape_for_label(label_cell, candidates, object_type):
    label_cx, label_cy = cell_center(label_cell)
    best = None
    best_score = float("inf")

    for candidate in candidates:
        if candidate["id"] == label_cell["id"]:
            continue
        if candidate["isTextOnly"]:
            continue
        if not candidate["width"] or not candidate["height"]:
            continue

        candidate_cx, candidate_cy = cell_center(candidate)
        distance = line_distance(label_cx, label_cy, candidate_cx, candidate_cy)
        if distance > MAX_LABEL_DISTANCE_PX:
            continue

        width_ratio = max(candidate["width"], candidate["height"]) / max(
            1.0, min(candidate["width"], candidate["height"])
        )
        score = distance

        # Bias candidate choice so text labels attach to the most plausible base shape.
        if object_type == "entrance" and width_ratio > 4:
            score -= 30
        if object_type == "podium" and cell_area(candidate) < 4000:
            score -= 15
        if object_type == "desk" and candidate["width"] > candidate["height"]:
            score -= 10
        if object_type in {"screen", "tv"} and (
            "flat_tv" in candidate["shape"] or "tv" in candidate["style"].lower()
        ):
            score -= 50

        if score < best_score:
            best_score = score
            best = candidate

    return best


def find_room_outline(cells):
    outline_candidates = [
        cell
        for cell in cells
        if not cell["isTextOnly"]
        and not cell["shape"]
        and not cell["labelText"]
        and cell["width"] >= 120
        and cell["height"] >= 120
    ]

    if not outline_candidates:
        return None

    return max(outline_candidates, key=cell_area)


def extract_measurements(edges):
    measurements = []

    for edge in edges:
        if "startArrow" not in edge["styleMap"] and "endArrow" not in edge["styleMap"]:
            continue

        label = edge["labelText"]
        match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*m", label.lower())
        if not match:
            continue

        measurements.append(
            {
                "id": str(uuid4()),
                "text": label,
                "meters": float(match.group(1)),
                "x1": edge["x1"],
                "y1": edge["y1"],
                "x2": edge["x2"],
                "y2": edge["y2"],
                "pixels": line_distance(edge["x1"], edge["y1"], edge["x2"], edge["y2"]),
            }
        )

    return [measurement for measurement in measurements if measurement["pixels"] > 0]


def px_to_world_scale(measurements):
    ratios = [measurement["meters"] / measurement["pixels"] for measurement in measurements]
    if not ratios:
        return DEFAULT_PX_TO_WORLD
    return median(ratios)


def create_scene_item(cell, bounds, px_scale):
    asset = ASSET_VISUALS.get(cell["objectType"])
    if asset is None:
        raise ValueError(f'No asset mapping found for {cell["objectType"]}')

    center_x, center_y = cell_center(cell)
    mid_x = (bounds["minX"] + bounds["maxX"]) / 2
    mid_y = (bounds["minY"] + bounds["maxY"]) / 2
    world_x = (center_x - mid_x) * px_scale
    world_z = (center_y - mid_y) * px_scale

    return {
        "id": str(uuid4()),
        "type": cell["objectType"],
        "x": round(world_x, 2),
        "y": 0,
        "z": round(world_z, 2),
        "rotationY": round(math.radians(cell["rotationDeg"]), 3),
        "scale": asset["scale"],
        "assetUrl": asset["assetUrl"],
        "label": cell.get("label") or TYPE_LABELS.get(cell["objectType"]),
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


def bounds_from_outline_or_cells(room_outline, cells):
    if room_outline:
        return {
            "minX": room_outline["x"],
            "minY": room_outline["y"],
            "maxX": room_outline["x"] + room_outline["width"],
            "maxY": room_outline["y"] + room_outline["height"],
        }

    fallback_cells = [cell for cell in cells if not cell["isTextOnly"]]
    if not fallback_cells:
        raise ValueError("No drawable geometry found in the uploaded draw.io file.")

    return {
        "minX": min(cell["x"] for cell in fallback_cells),
        "minY": min(cell["y"] for cell in fallback_cells),
        "maxX": max(cell["x"] + cell["width"] for cell in fallback_cells),
        "maxY": max(cell["y"] + cell["height"] for cell in fallback_cells),
    }


def build_measurement_lines(measurements, bounds, px_scale):
    mid_x = (bounds["minX"] + bounds["maxX"]) / 2
    mid_y = (bounds["minY"] + bounds["maxY"]) / 2

    lines = []
    for measurement in measurements:
        lines.append(
            {
                "id": measurement["id"],
                "type": "measurement",
                "startX": round((measurement["x1"] - mid_x) * px_scale, 2),
                "startZ": round((measurement["y1"] - mid_y) * px_scale, 2),
                "endX": round((measurement["x2"] - mid_x) * px_scale, 2),
                "endZ": round((measurement["y2"] - mid_y) * px_scale, 2),
                "text": measurement["text"],
            }
        )

    return lines


def drawio_file_to_project(content: str, file_name: str, project_name: str | None = None):
    xml = extract_xml_from_content(content)
    cells, edges = parse_cells(xml)

    direct_classified = [
        classified
        for classified in (classify_shape_cell(cell) for cell in cells)
        if classified is not None
    ]

    label_classified = []
    for cell in cells:
        if not cell["isTextOnly"]:
            continue

        object_type = infer_label_type(cell["labelText"])
        if object_type is None:
            continue

        attached_shape = nearest_shape_for_label(cell, cells, object_type)
        source = attached_shape or cell
        label_classified.append(
            {
                **source,
                "objectType": object_type,
                "label": TYPE_LABELS.get(object_type, cell["labelText"] or object_type.title()),
            }
        )

    classified = direct_classified + label_classified
    if not classified:
        raise ValueError("No supported draw.io objects were found.")

    measurements = extract_measurements(edges)
    px_scale = px_to_world_scale(measurements)
    room_outline = find_room_outline(cells)
    bounds = bounds_from_outline_or_cells(room_outline, cells)

    items = dedupe_items([create_scene_item(cell, bounds, px_scale) for cell in classified])
    room_width = round((bounds["maxX"] - bounds["minX"]) * px_scale, 1)
    room_depth = round((bounds["maxY"] - bounds["minY"]) * px_scale, 1)

    if room_outline is None:
        room_width = max(20, round(room_width + 2, 1))
        room_depth = max(14, round(room_depth + 2, 1))

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
        "measurements": build_measurement_lines(measurements, bounds, px_scale),
    }
