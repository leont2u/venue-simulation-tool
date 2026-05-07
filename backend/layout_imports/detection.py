import math
from uuid import uuid4

import cv2
import numpy as np

from .preprocessing import PreprocessedFloorPlan


def _distance(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.hypot(x2 - x1, y2 - y1)


def _point_to_segment_distance(px, py, line):
    x1, y1, x2, y2 = line["x1"], line["y1"], line["x2"], line["y2"]
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return _distance(px, py, x1, y1)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    projection_x = x1 + t * dx
    projection_y = y1 + t * dy
    return _distance(px, py, projection_x, projection_y)


def _rect_bbox(item):
    width = item.get("width", item.get("radius", 0) * 2)
    height = item.get("height", item.get("radius", 0) * 2)
    return {
        "x1": item["x"] - width / 2,
        "y1": item["y"] - height / 2,
        "x2": item["x"] + width / 2,
        "y2": item["y"] + height / 2,
    }


def _bbox_overlap_ratio(first, second):
    a = _rect_bbox(first)
    b = _rect_bbox(second)
    overlap_width = max(0, min(a["x2"], b["x2"]) - max(a["x1"], b["x1"]))
    overlap_height = max(0, min(a["y2"], b["y2"]) - max(a["y1"], b["y1"]))
    overlap_area = overlap_width * overlap_height
    if overlap_area <= 0:
        return 0

    first_area = max(1, (a["x2"] - a["x1"]) * (a["y2"] - a["y1"]))
    second_area = max(1, (b["x2"] - b["x1"]) * (b["y2"] - b["y1"]))
    return overlap_area / min(first_area, second_area)


def _center_distance(first, second):
    return _distance(first["x"], first["y"], second["x"], second["y"])


def _dedupe_objects(items, overlap_threshold=0.38):
    ranked = sorted(
        items,
        key=lambda item: (
            item.get("confidence", 0),
            item.get("width", 0) * item.get("height", 0),
        ),
        reverse=True,
    )
    result = []

    for candidate in ranked:
        duplicate = False
        for existing in result:
            same_type = candidate["type"] == existing["type"]
            close_centers = _center_distance(candidate, existing) < max(
                candidate.get("width", 0),
                candidate.get("height", 0),
                existing.get("width", 0),
                existing.get("height", 0),
            ) * 0.42
            if same_type and (close_centers or _bbox_overlap_ratio(candidate, existing) >= overlap_threshold):
                duplicate = True
                break
            if _bbox_overlap_ratio(candidate, existing) >= 0.72:
                duplicate = True
                break

        if not duplicate:
            result.append(candidate)

    return sorted(result, key=lambda item: (item["y"], item["x"]))


def _snap_axis(values, tolerance):
    groups = []
    for value in sorted(values):
        group = next((entry for entry in groups if abs(entry["value"] - value) <= tolerance), None)
        if group is None:
            groups.append({"value": value, "values": [value]})
        else:
            group["values"].append(value)
            group["value"] = sum(group["values"]) / len(group["values"])
    return groups


def _align_table_grid(items):
    round_tables = [item for item in items if item["type"] == "round_table"]
    if len(round_tables) < 4:
        return items

    median_size = float(np.median([table["width"] for table in round_tables]))
    x_groups = _snap_axis([table["x"] for table in round_tables], median_size * 0.22)
    y_groups = _snap_axis([table["y"] for table in round_tables], median_size * 0.22)

    for table in round_tables:
        x_group = min(x_groups, key=lambda group: abs(group["value"] - table["x"]))
        y_group = min(y_groups, key=lambda group: abs(group["value"] - table["y"]))
        if len(x_group["values"]) >= 2:
            table["x"] = float(x_group["value"])
        if len(y_group["values"]) >= 2:
            table["y"] = float(y_group["value"])

    return items


def _merge_nearby_table_detections(items):
    if not items:
        return []

    ranked = sorted(
        items,
        key=lambda item: (
            item.get("confidence", 0),
            item.get("width", item.get("radius", 0) * 2) * item.get("height", item.get("radius", 0) * 2),
        ),
        reverse=True,
    )
    groups = []

    for table in ranked:
        width = table.get("width", table.get("radius", 0) * 2)
        height = table.get("height", table.get("radius", 0) * 2)
        group = next(
            (
                entry
                for entry in groups
                if entry["type"] == table["type"]
                and _center_distance(entry, table) <= max(entry["width"], entry["height"], width, height) * 0.45
            ),
            None,
        )
        if group is None:
            groups.append(
                {
                    "type": table["type"],
                    "members": [table],
                    "x": float(table["x"]),
                    "y": float(table["y"]),
                    "width": float(width),
                    "height": float(height),
                    "confidence": float(table.get("confidence", 0)),
                }
            )
            continue

        group["members"].append(table)
        count = len(group["members"])
        group["x"] = sum(member["x"] for member in group["members"]) / count
        group["y"] = sum(member["y"] for member in group["members"]) / count
        group["width"] = max(group["width"], width)
        group["height"] = max(group["height"], height)
        group["confidence"] = max(group["confidence"], float(table.get("confidence", 0)))

    merged = []
    for group in groups:
        base = max(group["members"], key=lambda member: member.get("confidence", 0))
        merged_item = {
            "id": str(uuid4()),
            "type": group["type"],
            "x": float(group["x"]),
            "y": float(group["y"]),
            "width": float(group["width"]),
            "height": float(group["height"]),
            "confidence": round(group["confidence"], 3),
        }
        if group["type"] == "round_table":
            merged_item["radius"] = round(max(group["width"], group["height"]) / 2, 2)
        else:
            angles = [member.get("rotationDeg", 0.0) for member in group["members"]]
            merged_item["rotationDeg"] = float(sum(angles) / max(1, len(angles)))
        merged.append(merged_item)

    return merged


def _normalize_table_geometry(items):
    normalized = []
    for table in items:
        width = float(table.get("width", table.get("radius", 0) * 2))
        height = float(table.get("height", table.get("radius", 0) * 2))
        candidate = {
            "id": table.get("id", str(uuid4())),
            "type": table["type"],
            "x": float(round(table["x"], 2)),
            "y": float(round(table["y"], 2)),
            "width": float(round(width, 2)),
            "height": float(round(height, 2)),
            "confidence": round(float(table.get("confidence", 0)), 3),
        }
        if table["type"] == "round_table":
            diameter = max(width, height)
            candidate["radius"] = float(round(diameter / 2, 2))
        else:
            candidate["rotationDeg"] = float(round(table.get("rotationDeg", 0.0), 2))
        normalized.append(candidate)
    return normalized


def _axis_cluster_values(values, tolerance):
    if not values:
        return []
    groups = _snap_axis(values, tolerance)
    return [group["value"] for group in groups if group["values"]]


def _snap_tables_to_grid(items):
    if not items:
        return []

    round_tables = [item for item in items if item["type"] == "round_table"]
    rectangular_tables = [item for item in items if item["type"] == "rectangular_table"]

    if len(round_tables) >= 2:
        median_size = float(np.median([max(table["width"], table["height"]) for table in round_tables]))
        x_values = _axis_cluster_values([table["x"] for table in round_tables], max(12.0, median_size * 0.4))
        y_values = _axis_cluster_values([table["y"] for table in round_tables], max(12.0, median_size * 0.4))
        for table in round_tables:
            if x_values:
                table["x"] = float(min(x_values, key=lambda value: abs(value - table["x"])))
            if y_values:
                table["y"] = float(min(y_values, key=lambda value: abs(value - table["y"])))

    if rectangular_tables:
        median_x = float(np.median([table["x"] for table in rectangular_tables]))
        for table in rectangular_tables:
            table["x"] = median_x
            table["rotationDeg"] = 0.0 if abs(table.get("rotationDeg", 0)) < 45 else 90.0

    return _normalize_table_geometry(items)


def _infer_table_groups(tables):
    round_tables = [table for table in tables if table["type"] == "round_table"]
    if len(round_tables) < 4:
        return []

    median_size = float(np.median([max(table["width"], table["height"]) for table in round_tables]))
    x_groups = _snap_axis([table["x"] for table in round_tables], max(12.0, median_size * 0.42))
    y_groups = _snap_axis([table["y"] for table in round_tables], max(12.0, median_size * 0.42))
    rows = len(y_groups)
    columns = len(x_groups)
    if rows < 2 or columns < 2:
        return []

    row_values = [group["value"] for group in y_groups]
    column_values = [group["value"] for group in x_groups]
    assignments = set()
    for table in round_tables:
        row_index = min(range(rows), key=lambda index: abs(row_values[index] - table["y"]))
        col_index = min(range(columns), key=lambda index: abs(column_values[index] - table["x"]))
        assignments.add((row_index, col_index))

    expected = rows * columns
    occupancy = len(assignments) / max(1, expected)
    if occupancy < 0.6:
        return []

    return [
        {
            "layout": "grid",
            "rows": rows,
            "columns": columns,
            "tableIds": [table["id"] for table in round_tables],
            "confidence": round(min(0.95, 0.55 + occupancy * 0.35), 3),
        }
    ]


def _rect_from_zone(zone):
    if not isinstance(zone, dict):
        return None
    if all(key in zone for key in ("x", "y", "width", "height")):
        return {
            "x": float(zone["x"]),
            "y": float(zone["y"]),
            "width": float(zone["width"]),
            "height": float(zone["height"]),
        }
    return None


def _bounds_from_geometry(walls=None, zones=None, tables=None):
    wall_bounds = _wall_bounds(walls or [])
    if wall_bounds is not None:
        return wall_bounds

    points = []
    for zone in zones or []:
        rect = _rect_from_zone(zone)
        if rect is None:
            continue
        points.extend([(rect["x"], rect["y"]), (rect["x"] + rect["width"], rect["y"] + rect["height"])])
    for table in tables or []:
        box = _rect_bbox(table)
        points.extend([(box["x1"], box["y1"]), (box["x2"], box["y2"])])

    if not points:
        return None
    return {
        "minX": min(point[0] for point in points),
        "minY": min(point[1] for point in points),
        "maxX": max(point[0] for point in points),
        "maxY": max(point[1] for point in points),
    }


def _zone_by_type(zones, zone_type):
    for zone in zones or []:
        if zone.get("type") == zone_type:
            rect = _rect_from_zone(zone)
            if rect is not None:
                return rect
    return None


def _table_sort_key(table):
    return (round(table["y"], 2), round(table["x"], 2), table["type"])


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def _center_from_tables(tables):
    if not tables:
        return None, None
    return (
        sum(table["x"] for table in tables) / len(tables),
        sum(table["y"] for table in tables) / len(tables),
    )


def _grid_shape_for_tables(round_tables, table_groups):
    if table_groups:
        primary = table_groups[0]
        rows = max(1, int(primary.get("rows", 1)))
        columns = max(1, int(primary.get("columns", 1)))
        if rows * columns >= len(round_tables):
            return rows, columns

    count = len(round_tables)
    if count <= 0:
        return 0, 0
    columns = max(1, round(math.sqrt(count)))
    rows = math.ceil(count / columns)
    while rows * columns < count:
        columns += 1
        rows = math.ceil(count / columns)
    return rows, columns


def _seat_zone_rect(bounds, zones):
    seating_zone = _zone_by_type(zones, "seating_area")
    if seating_zone is not None:
        return seating_zone

    if bounds is None:
        return None

    rect = {
        "x": bounds["minX"],
        "y": bounds["minY"],
        "width": bounds["maxX"] - bounds["minX"],
        "height": bounds["maxY"] - bounds["minY"],
    }
    stage = _zone_by_type(zones, "stage/head_table")
    if stage is not None:
        top_cut = (stage["y"] + stage["height"]) - rect["y"]
        if top_cut > 0 and top_cut < rect["height"] * 0.65:
            rect["y"] += top_cut
            rect["height"] -= top_cut
    return rect


def _symmetry_axis_x(bounds, zones, tables):
    seating_zone = _seat_zone_rect(bounds, zones)
    if seating_zone is not None:
        return seating_zone["x"] + seating_zone["width"] / 2
    center_x, _ = _center_from_tables(tables)
    if center_x is not None:
        return center_x
    if bounds is None:
        return 0.0
    return (bounds["minX"] + bounds["maxX"]) / 2


def _optimize_round_tables(round_tables, seat_zone, axis_x, table_groups):
    if not round_tables or seat_zone is None:
        return []

    rows, columns = _grid_shape_for_tables(round_tables, table_groups)
    if rows == 0 or columns == 0:
        return []

    diameters = [max(table.get("width", 0), table.get("height", 0), table.get("radius", 0) * 2) for table in round_tables]
    diameter = float(np.median(diameters)) if diameters else 40.0
    min_center_spacing_x = diameter * 1.8
    min_center_spacing_y = diameter * 1.8
    usable_margin_x = diameter * 0.85
    usable_margin_y = diameter * 0.9

    usable_width = max(diameter, seat_zone["width"] - usable_margin_x * 2)
    usable_height = max(diameter, seat_zone["height"] - usable_margin_y * 2)
    spacing_x = min_center_spacing_x if columns <= 1 else max(
        min_center_spacing_x,
        min(usable_width / max(1, columns - 1), diameter * 2.35),
    )
    spacing_y = min_center_spacing_y if rows <= 1 else max(
        min_center_spacing_y,
        min(usable_height / max(1, rows - 1), diameter * 2.35),
    )

    group_width = diameter if columns <= 1 else spacing_x * (columns - 1)
    group_height = diameter if rows <= 1 else spacing_y * (rows - 1)
    center_x = _clamp(axis_x, seat_zone["x"] + group_width / 2, seat_zone["x"] + seat_zone["width"] - group_width / 2)
    center_y = _clamp(
        seat_zone["y"] + seat_zone["height"] / 2,
        seat_zone["y"] + group_height / 2,
        seat_zone["y"] + seat_zone["height"] - group_height / 2,
    )

    start_x = center_x - spacing_x * (columns - 1) / 2
    start_y = center_y - spacing_y * (rows - 1) / 2
    ordered = sorted(round_tables, key=_table_sort_key)
    optimized = []
    table_index = 0
    for row in range(rows):
        for column in range(columns):
            if table_index >= len(ordered):
                break
            source = ordered[table_index]
            optimized.append(
                {
                    "id": source.get("id", str(uuid4())),
                    "type": "round_table",
                    "x": float(round(start_x + column * spacing_x, 2)),
                    "y": float(round(start_y + row * spacing_y, 2)),
                    "width": float(round(diameter, 2)),
                    "height": float(round(diameter, 2)),
                    "radius": float(round(diameter / 2, 2)),
                    "confidence": round(max(source.get("confidence", 0.7), 0.86), 3),
                }
            )
            table_index += 1
    return optimized


def _optimize_rectangular_tables(rectangular_tables, bounds, zones, axis_x):
    if not rectangular_tables:
        return []

    stage_zone = _zone_by_type(zones, "stage/head_table")
    reference = stage_zone
    if reference is None and bounds is not None:
        reference = {
            "x": bounds["minX"],
            "y": bounds["minY"],
            "width": bounds["maxX"] - bounds["minX"],
            "height": max(1.0, (bounds["maxY"] - bounds["minY"]) * 0.16),
        }

    optimized = []
    ordered = sorted(rectangular_tables, key=_table_sort_key)
    median_width = float(np.median([table.get("width", 0) for table in ordered]))
    median_height = float(np.median([table.get("height", 0) for table in ordered]))
    for index, source in enumerate(ordered):
        width = max(source.get("width", median_width), median_width)
        height = max(source.get("height", median_height), median_height)
        if reference is not None:
            x = _clamp(axis_x, reference["x"] + width / 2, reference["x"] + reference["width"] - width / 2)
            base_y = reference["y"] + min(reference["height"] * 0.5, height * 1.2)
            y = base_y + index * (height * 1.5)
        else:
            x = axis_x
            y = source["y"]
        optimized.append(
            {
                "id": source.get("id", str(uuid4())),
                "type": "rectangular_table",
                "x": float(round(x, 2)),
                "y": float(round(y, 2)),
                "width": float(round(width, 2)),
                "height": float(round(height, 2)),
                "rotationDeg": 0.0,
                "confidence": round(max(source.get("confidence", 0.68), 0.84), 3),
            }
        )
    return optimized


def optimize_event_layout(layout):
    tables = layout.get("tables") if isinstance(layout, dict) and isinstance(layout.get("tables"), list) else []
    table_groups = layout.get("table_groups") if isinstance(layout, dict) and isinstance(layout.get("table_groups"), list) else []
    walls = layout.get("walls") if isinstance(layout, dict) and isinstance(layout.get("walls"), list) else []
    zones = layout.get("zones") if isinstance(layout, dict) and isinstance(layout.get("zones"), list) else []

    normalized_tables = _normalize_table_geometry(_dedupe_objects(_merge_nearby_table_detections(tables)))
    bounds = _bounds_from_geometry(walls=walls, zones=zones, tables=normalized_tables)
    seat_zone = _seat_zone_rect(bounds, zones)
    axis_x = _symmetry_axis_x(bounds, zones, normalized_tables)

    round_tables = [table for table in normalized_tables if table["type"] == "round_table"]
    rectangular_tables = [table for table in normalized_tables if table["type"] == "rectangular_table"]

    optimized_round = _optimize_round_tables(round_tables, seat_zone, axis_x, table_groups)
    optimized_rectangular = _optimize_rectangular_tables(rectangular_tables, bounds, zones, axis_x)
    optimized_tables = sorted(optimized_rectangular + optimized_round, key=_table_sort_key)
    optimized_groups = _infer_table_groups(optimized_tables)

    result = {
        "tables": optimized_tables,
        "table_groups": optimized_groups,
    }
    if zones:
        result["zones"] = zones
    if walls:
        result["walls"] = _clean_wall_coordinates(walls)
    return result


def _zone_nearby_table_count(zone, furniture, margin):
    zone_box = _rect_bbox(zone)
    expanded = {
        "x1": zone_box["x1"] - margin,
        "y1": zone_box["y1"] - margin,
        "x2": zone_box["x2"] + margin,
        "y2": zone_box["y2"] + margin,
    }

    count = 0
    for table in furniture:
        table_box = _rect_bbox(table)
        if (
            table_box["x2"] >= expanded["x1"]
            and table_box["x1"] <= expanded["x2"]
            and table_box["y2"] >= expanded["y1"]
            and table_box["y1"] <= expanded["y2"]
        ):
            count += 1
    return count


def _merge_axis_aligned_segments(segments, axis: str, tolerance=9, gap=24):
    buckets: list[dict] = []

    for segment in segments:
        coord = segment["y1"] if axis == "h" else segment["x1"]
        start = min(segment["x1"], segment["x2"]) if axis == "h" else min(segment["y1"], segment["y2"])
        end = max(segment["x1"], segment["x2"]) if axis == "h" else max(segment["y1"], segment["y2"])

        bucket = next((entry for entry in buckets if abs(entry["coord"] - coord) <= tolerance), None)
        if bucket is None:
            bucket = {"coord": coord, "intervals": []}
            buckets.append(bucket)
        bucket["intervals"].append((start, end))

    merged = []
    for bucket in buckets:
        intervals = sorted(bucket["intervals"])
        if not intervals:
            continue

        current_start, current_end = intervals[0]
        for start, end in intervals[1:]:
            if start <= current_end + gap:
                current_end = max(current_end, end)
            else:
                merged.append((bucket["coord"], current_start, current_end))
                current_start, current_end = start, end
        merged.append((bucket["coord"], current_start, current_end))

    if axis == "h":
        return [
            {"id": str(uuid4()), "x1": start, "y1": coord, "x2": end, "y2": coord}
            for coord, start, end in merged
            if end - start > 26
        ]

    return [
        {"id": str(uuid4()), "x1": coord, "y1": start, "x2": coord, "y2": end}
        for coord, start, end in merged
        if end - start > 26
    ]


def _wall_length(line):
    return _distance(line["x1"], line["y1"], line["x2"], line["y2"])


def _axis_segments_from_mask(mask, axis: str, min_length: int, max_thickness: int):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    segments = []

    for contour in contours:
        x, y, width, height = cv2.boundingRect(contour)
        area = cv2.contourArea(contour)
        if area < min_length:
            continue

        if axis == "h":
            if width < min_length or height > max_thickness:
                continue
            segments.append(
                {
                    "x1": float(x),
                    "y1": float(y + height / 2),
                    "x2": float(x + width),
                    "y2": float(y + height / 2),
                    "weight": float(width),
                }
            )
        else:
            if height < min_length or width > max_thickness:
                continue
            segments.append(
                {
                    "x1": float(x + width / 2),
                    "y1": float(y),
                    "x2": float(x + width / 2),
                    "y2": float(y + height),
                    "weight": float(height),
                }
            )

    return segments


def _merge_collinear_segments(segments, axis: str, tolerance: int, gap: int, min_length: int):
    if not segments:
        return []

    buckets = []
    for segment in sorted(segments, key=lambda line: line["y1"] if axis == "h" else line["x1"]):
        coord = segment["y1"] if axis == "h" else segment["x1"]
        start = min(segment["x1"], segment["x2"]) if axis == "h" else min(segment["y1"], segment["y2"])
        end = max(segment["x1"], segment["x2"]) if axis == "h" else max(segment["y1"], segment["y2"])
        weight = max(1.0, segment.get("weight", end - start))

        bucket = next((entry for entry in buckets if abs(entry["coord"] - coord) <= tolerance), None)
        if bucket is None:
            bucket = {"coord": coord, "weight": 0.0, "intervals": []}
            buckets.append(bucket)

        bucket["coord"] = (bucket["coord"] * bucket["weight"] + coord * weight) / (bucket["weight"] + weight)
        bucket["weight"] += weight
        bucket["intervals"].append((float(start), float(end)))

    merged = []
    for bucket in buckets:
        intervals = sorted(bucket["intervals"])
        current_start, current_end = intervals[0]
        for start, end in intervals[1:]:
            if start <= current_end + gap:
                current_end = max(current_end, end)
            else:
                if current_end - current_start >= min_length:
                    merged.append((bucket["coord"], current_start, current_end))
                current_start, current_end = start, end
        if current_end - current_start >= min_length:
            merged.append((bucket["coord"], current_start, current_end))

    if axis == "h":
        return [{"x1": start, "y1": coord, "x2": end, "y2": coord} for coord, start, end in merged]
    return [{"x1": coord, "y1": start, "x2": coord, "y2": end} for coord, start, end in merged]


def _overlap_ratio(first_interval, second_interval):
    start = max(first_interval[0], second_interval[0])
    end = min(first_interval[1], second_interval[1])
    overlap = max(0.0, end - start)
    shorter = max(1.0, min(first_interval[1] - first_interval[0], second_interval[1] - second_interval[0]))
    return overlap / shorter


def _remove_duplicate_parallel_walls(segments, axis: str, tolerance: int, min_length: int):
    ranked = sorted(segments, key=_wall_length, reverse=True)
    groups = []

    for segment in ranked:
        coord = segment["y1"] if axis == "h" else segment["x1"]
        interval = (
            (min(segment["x1"], segment["x2"]), max(segment["x1"], segment["x2"]))
            if axis == "h"
            else (min(segment["y1"], segment["y2"]), max(segment["y1"], segment["y2"]))
        )
        group = next(
            (
                entry
                for entry in groups
                if abs(entry["coord"] - coord) <= tolerance
                and any(_overlap_ratio(interval, existing) >= 0.35 for existing in entry["intervals"])
            ),
            None,
        )
        if group is None:
            groups.append({"coord": coord, "weight": _wall_length(segment), "intervals": [interval]})
            continue

        weight = _wall_length(segment)
        group["coord"] = (group["coord"] * group["weight"] + coord * weight) / (group["weight"] + weight)
        group["weight"] += weight
        group["intervals"].append(interval)

    collapsed = []
    for group in groups:
        intervals = sorted(group["intervals"])
        start, end = intervals[0]
        for next_start, next_end in intervals[1:]:
            if next_start <= end:
                end = max(end, next_end)
            else:
                if end - start >= min_length:
                    collapsed.append((group["coord"], start, end))
                start, end = next_start, next_end
        if end - start >= min_length:
            collapsed.append((group["coord"], start, end))

    if axis == "h":
        return [{"x1": start, "y1": coord, "x2": end, "y2": coord} for coord, start, end in collapsed]
    return [{"x1": coord, "y1": start, "x2": coord, "y2": end} for coord, start, end in collapsed]


def _snap_wall_intersections(horizontal, vertical, tolerance: int):
    snapped_horizontal = [line.copy() for line in horizontal]
    snapped_vertical = [line.copy() for line in vertical]

    for h_line in snapped_horizontal:
        h_start, h_end = sorted((h_line["x1"], h_line["x2"]))
        y = h_line["y1"]
        for v_line in snapped_vertical:
            x = v_line["x1"]
            v_start, v_end = sorted((v_line["y1"], v_line["y2"]))
            crosses_x = h_start - tolerance <= x <= h_end + tolerance
            crosses_y = v_start - tolerance <= y <= v_end + tolerance
            if not (crosses_x and crosses_y):
                continue
            if abs(h_line["x1"] - x) <= tolerance:
                h_line["x1"] = x
            if abs(h_line["x2"] - x) <= tolerance:
                h_line["x2"] = x
            if abs(v_line["y1"] - y) <= tolerance:
                v_line["y1"] = y
            if abs(v_line["y2"] - y) <= tolerance:
                v_line["y2"] = y

    return snapped_horizontal, snapped_vertical


def _clean_wall_coordinates(walls):
    cleaned = []
    for wall in walls:
        x1 = float(round(wall["x1"], 2))
        y1 = float(round(wall["y1"], 2))
        x2 = float(round(wall["x2"], 2))
        y2 = float(round(wall["y2"], 2))
        if _distance(x1, y1, x2, y2) <= 0:
            continue
        cleaned.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2})
    return cleaned


def extract_structural_layout(plan: PreprocessedFloorPlan):
    height, width = plan.gray.shape[:2]
    min_side = min(width, height)
    min_length = max(42, int(min_side * 0.055))
    merge_tolerance = max(5, int(min_side * 0.006))
    duplicate_tolerance = max(9, int(min_side * 0.014))
    gap = max(18, int(min_side * 0.026))
    max_thickness = max(22, int(min_side * 0.055))

    noise_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    wall_ink = cv2.morphologyEx(plan.binary, cv2.MORPH_OPEN, noise_kernel, iterations=1)
    wall_ink = cv2.morphologyEx(wall_ink, cv2.MORPH_CLOSE, noise_kernel, iterations=1)

    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(25, int(min_side * 0.045)), 3))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, max(25, int(min_side * 0.045))))
    horizontal_mask = cv2.morphologyEx(wall_ink, cv2.MORPH_OPEN, horizontal_kernel, iterations=1)
    horizontal_mask = cv2.morphologyEx(horizontal_mask, cv2.MORPH_CLOSE, horizontal_kernel, iterations=1)
    vertical_mask = cv2.morphologyEx(wall_ink, cv2.MORPH_OPEN, vertical_kernel, iterations=1)
    vertical_mask = cv2.morphologyEx(vertical_mask, cv2.MORPH_CLOSE, vertical_kernel, iterations=1)

    horizontal = _axis_segments_from_mask(horizontal_mask, "h", min_length, max_thickness)
    vertical = _axis_segments_from_mask(vertical_mask, "v", min_length, max_thickness)

    if not horizontal and not vertical:
        return {"walls": []}

    horizontal = _merge_collinear_segments(horizontal, "h", merge_tolerance, gap, min_length)
    vertical = _merge_collinear_segments(vertical, "v", merge_tolerance, gap, min_length)
    horizontal = _remove_duplicate_parallel_walls(horizontal, "h", duplicate_tolerance, min_length)
    vertical = _remove_duplicate_parallel_walls(vertical, "v", duplicate_tolerance, min_length)
    horizontal, vertical = _snap_wall_intersections(horizontal, vertical, duplicate_tolerance)
    horizontal = _merge_collinear_segments(horizontal, "h", merge_tolerance, gap, min_length)
    vertical = _merge_collinear_segments(vertical, "v", merge_tolerance, gap, min_length)

    walls = sorted(
        _clean_wall_coordinates(horizontal + vertical),
        key=lambda line: _distance(line["x1"], line["y1"], line["x2"], line["y2"]),
        reverse=True,
    )
    return {"walls": walls[:180]}


def _wall_bounds(walls):
    points = []
    for wall in walls:
        points.extend([(wall["x1"], wall["y1"]), (wall["x2"], wall["y2"])])
    if not points:
        return None
    return {
        "minX": min(point[0] for point in points),
        "minY": min(point[1] for point in points),
        "maxX": max(point[0] for point in points),
        "maxY": max(point[1] for point in points),
    }


def _snap_wall_axes(walls, tolerance):
    xs = _snap_axis(
        [wall["x1"] for wall in walls if abs(wall["x1"] - wall["x2"]) <= tolerance]
        + [wall["x2"] for wall in walls if abs(wall["x1"] - wall["x2"]) <= tolerance],
        tolerance,
    )
    ys = _snap_axis(
        [wall["y1"] for wall in walls if abs(wall["y1"] - wall["y2"]) <= tolerance]
        + [wall["y2"] for wall in walls if abs(wall["y1"] - wall["y2"]) <= tolerance],
        tolerance,
    )
    return [group["value"] for group in xs], [group["value"] for group in ys]


def _line_covers_interval(line, axis, coord, start, end, tolerance):
    if axis == "h":
        if abs(line["y1"] - line["y2"]) > tolerance or abs(line["y1"] - coord) > tolerance:
            return False
        line_start, line_end = sorted((line["x1"], line["x2"]))
    else:
        if abs(line["x1"] - line["x2"]) > tolerance or abs(line["x1"] - coord) > tolerance:
            return False
        line_start, line_end = sorted((line["y1"], line["y2"]))
    return line_start <= start + tolerance and line_end >= end - tolerance


def _has_wall_between(walls, axis, coord, start, end, tolerance):
    return any(_line_covers_interval(wall, axis, coord, start, end, tolerance) for wall in walls)


def _region_record(region, kind, label, confidence):
    return {
        "id": str(uuid4()),
        "type": kind,
        "label": label,
        "x": float(round(region["x"], 2)),
        "y": float(round(region["y"], 2)),
        "width": float(round(region["width"], 2)),
        "height": float(round(region["height"], 2)),
        "area": float(round(region["width"] * region["height"], 2)),
        "confidence": confidence,
    }


def _rects_overlap(first, second):
    return not (
        first["x"] + first["width"] <= second["x"]
        or second["x"] + second["width"] <= first["x"]
        or first["y"] + first["height"] <= second["y"]
        or second["y"] + second["height"] <= first["y"]
    )


def _room_label(region, bounds, median_area):
    center_x = region["x"] + region["width"] / 2
    center_y = region["y"] + region["height"] / 2
    total_width = max(1.0, bounds["maxX"] - bounds["minX"])
    total_height = max(1.0, bounds["maxY"] - bounds["minY"])
    area = region["width"] * region["height"]
    near_back = center_y < bounds["minY"] + total_height * 0.32
    near_side = center_x < bounds["minX"] + total_width * 0.28 or center_x > bounds["maxX"] - total_width * 0.28
    near_rear = center_y > bounds["maxY"] - total_height * 0.28

    if area <= median_area * 0.75 and near_rear:
        return "restrooms"
    if area <= median_area * 0.9 and near_side:
        return "storage"
    if region["width"] >= region["height"] * 1.45 and (near_back or near_side):
        return "kitchen"
    if near_back or near_side:
        return "green_room"
    return "storage"


def _add_zone(zones, region, kind, label, confidence):
    candidate = _region_record(region, kind, label, confidence)
    if candidate["width"] <= 0 or candidate["height"] <= 0:
        return
    if any(_rects_overlap(candidate, existing) for existing in zones):
        return
    zones.append(candidate)


def _event_zones_from_open_region(open_region, bounds):
    zones = []
    region_width = open_region["width"]
    region_height = open_region["height"]
    if region_width <= 0 or region_height <= 0:
        return zones

    front_height = min(region_height * 0.2, max(region_height * 0.14, (bounds["maxY"] - bounds["minY"]) * 0.14))
    stage_width = min(region_width * 0.64, max(region_width * 0.42, (bounds["maxX"] - bounds["minX"]) * 0.28))
    stage = {
        "x": open_region["x"] + (region_width - stage_width) / 2,
        "y": open_region["y"],
        "width": stage_width,
        "height": front_height,
    }
    _add_zone(zones, stage, "stage/head_table", "Stage or head table", 0.74)

    remaining_y = stage["y"] + stage["height"]
    remaining_height = open_region["y"] + region_height - remaining_y
    if remaining_height <= region_height * 0.28:
        return zones

    seating_height = remaining_height * (0.72 if remaining_height > region_height * 0.5 else 1.0)
    seating = {
        "x": open_region["x"],
        "y": remaining_y,
        "width": region_width,
        "height": seating_height,
    }
    _add_zone(zones, seating, "seating_area", "Seating area", 0.82)

    dance_height = open_region["y"] + region_height - (seating["y"] + seating["height"])
    if dance_height >= region_height * 0.16:
        dance_width = region_width * 0.52
        dance = {
            "x": open_region["x"] + (region_width - dance_width) / 2,
            "y": seating["y"] + seating["height"],
            "width": dance_width,
            "height": dance_height,
        }
        _add_zone(zones, dance, "dance_floor", "Dance floor", 0.66)

    if region_width >= region_height * 0.85:
        bar_width = min(region_width * 0.18, max(region_width * 0.12, 36))
        bar_height = min(region_height * 0.28, max(region_height * 0.18, 28))
        bar = {
            "x": open_region["x"] + region_width - bar_width,
            "y": open_region["y"] + region_height - bar_height,
            "width": bar_width,
            "height": bar_height,
        }
        _add_zone(zones, bar, "bar", "Bar", 0.52)

    return zones


def analyze_layout_from_walls(walls):
    clean_walls = _clean_wall_coordinates(walls)
    bounds = _wall_bounds(clean_walls)
    if bounds is None:
        return {"rooms": [], "zones": []}

    overall_width = max(1.0, bounds["maxX"] - bounds["minX"])
    overall_height = max(1.0, bounds["maxY"] - bounds["minY"])
    tolerance = max(4.0, min(overall_width, overall_height) * 0.015)
    x_axes, y_axes = _snap_wall_axes(clean_walls, tolerance)
    x_axes = sorted(set(round(value, 2) for value in x_axes))
    y_axes = sorted(set(round(value, 2) for value in y_axes))

    if len(x_axes) < 2 or len(y_axes) < 2:
        return {"rooms": [], "zones": []}

    min_cell_width = overall_width * 0.025
    min_cell_height = overall_height * 0.025
    cells = {}
    for y_index in range(len(y_axes) - 1):
        for x_index in range(len(x_axes) - 1):
            x1, x2 = x_axes[x_index], x_axes[x_index + 1]
            y1, y2 = y_axes[y_index], y_axes[y_index + 1]
            if x2 - x1 < min_cell_width or y2 - y1 < min_cell_height:
                continue
            cells[(x_index, y_index)] = {
                "x1": x1,
                "x2": x2,
                "y1": y1,
                "y2": y2,
                "top": _has_wall_between(clean_walls, "h", y1, x1, x2, tolerance),
                "bottom": _has_wall_between(clean_walls, "h", y2, x1, x2, tolerance),
                "left": _has_wall_between(clean_walls, "v", x1, y1, y2, tolerance),
                "right": _has_wall_between(clean_walls, "v", x2, y1, y2, tolerance),
            }

    visited = set()
    regions = []
    for key in cells:
        if key in visited:
            continue

        stack = [key]
        visited.add(key)
        members = []
        enclosed = True
        while stack:
            current_key = stack.pop()
            members.append(current_key)
            cell = cells[current_key]
            x_index, y_index = current_key
            neighbors = [
                ((x_index, y_index - 1), "top", "bottom"),
                ((x_index, y_index + 1), "bottom", "top"),
                ((x_index - 1, y_index), "left", "right"),
                ((x_index + 1, y_index), "right", "left"),
            ]
            for next_key, side, opposite in neighbors:
                if cell[side]:
                    continue
                if next_key not in cells:
                    enclosed = False
                    continue
                if cells[next_key][opposite]:
                    continue
                if next_key not in visited:
                    visited.add(next_key)
                    stack.append(next_key)

        min_x = min(cells[item]["x1"] for item in members)
        max_x = max(cells[item]["x2"] for item in members)
        min_y = min(cells[item]["y1"] for item in members)
        max_y = max(cells[item]["y2"] for item in members)
        regions.append(
            {
                "x": min_x,
                "y": min_y,
                "width": max_x - min_x,
                "height": max_y - min_y,
                "area": (max_x - min_x) * (max_y - min_y),
                "enclosed": enclosed,
                "cellCount": len(members),
            }
        )

    if not regions:
        return {"rooms": [], "zones": []}

    regions = sorted(regions, key=lambda region: region["area"], reverse=True)
    largest = regions[0]
    room_candidates = [
        region
        for region in regions[1:]
        if region["enclosed"]
        and region["area"] >= overall_width * overall_height * 0.01
        and region["area"] <= largest["area"] * 0.42
    ]
    median_area = float(np.median([region["area"] for region in room_candidates])) if room_candidates else largest["area"] * 0.12

    rooms = []
    for region in sorted(room_candidates, key=lambda entry: (entry["y"], entry["x"]))[:12]:
        room_type = _room_label(region, bounds, median_area)
        rooms.append(_region_record(region, room_type, room_type.replace("_", " ").title(), 0.58))

    zones = _event_zones_from_open_region(largest, bounds)
    return {"rooms": rooms, "zones": zones}


def extract_table_layout(plan: PreprocessedFloorPlan):
    image_height, image_width = plan.gray.shape[:2]
    image_area = image_height * image_width
    min_round_radius = max(22, int(min(image_width, image_height) * 0.014))
    max_round_radius = max(min_round_radius + 12, int(min(image_width, image_height) * 0.05))
    tables = []

    circles = cv2.HoughCircles(
        plan.gray,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=58,
        param1=80,
        param2=50,
        minRadius=min_round_radius,
        maxRadius=max_round_radius,
    )
    if circles is not None:
        for x, y, radius in np.round(circles[0, :]).astype("int")[:90]:
            if y > image_height * 0.94 or x < image_width * 0.025 or x > image_width * 0.975:
                continue
            diameter = float(radius * 2)
            tables.append(
                {
                    "id": str(uuid4()),
                    "type": "round_table",
                    "x": float(x),
                    "y": float(y),
                    "radius": float(radius),
                    "width": diameter,
                    "height": diameter,
                    "confidence": 0.78,
                }
            )

    contours, _ = cv2.findContours(plan.binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 900 or area > image_area * 0.04:
            continue
        rect = cv2.minAreaRect(contour)
        (cx, cy), (w, h), angle = rect
        long_side = max(w, h)
        short_side = min(w, h)
        if short_side <= 0 or long_side / short_side < 2.3 or long_side < 70:
            continue
        if short_side < 12 or long_side * short_side > image_area * 0.03:
            continue
        tables.append(
            {
                "id": str(uuid4()),
                "type": "rectangular_table",
                "x": float(cx),
                "y": float(cy),
                "width": float(long_side),
                "height": float(short_side),
                "rotationDeg": float(angle if w >= h else angle + 90),
                "confidence": 0.68,
            }
        )

    clean_tables = _dedupe_objects(_merge_nearby_table_detections(tables))
    clean_tables = _snap_tables_to_grid(clean_tables)[:90]
    return {
        "tables": clean_tables,
        "table_groups": _infer_table_groups(clean_tables),
    }


def detect_walls(plan: PreprocessedFloorPlan):
    structural = extract_structural_layout(plan)["walls"]
    if structural:
        return structural

    height, width = plan.gray.shape[:2]
    min_length = max(32, int(min(width, height) * 0.035))
    lines = cv2.HoughLinesP(
        plan.edges,
        rho=1,
        theta=np.pi / 180,
        threshold=70,
        minLineLength=min_length,
        maxLineGap=14,
    )
    if lines is None:
        return []

    horizontal = []
    vertical = []
    diagonal = []

    for raw_line in lines[:, 0]:
        x1, y1, x2, y2 = [float(value) for value in raw_line]
        length = _distance(x1, y1, x2, y2)
        if length < min_length:
            continue

        angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1)))
        if angle <= 8 or angle >= 172:
            y = round((y1 + y2) / 2)
            horizontal.append({"x1": x1, "y1": y, "x2": x2, "y2": y})
        elif 82 <= angle <= 98:
            x = round((x1 + x2) / 2)
            vertical.append({"x1": x, "y1": y1, "x2": x, "y2": y2})
        else:
            diagonal.append({"id": str(uuid4()), "x1": x1, "y1": y1, "x2": x2, "y2": y2})

    merged = _merge_axis_aligned_segments(horizontal, "h") + _merge_axis_aligned_segments(vertical, "v")
    merged.extend(diagonal[:40])
    return _clean_wall_coordinates(
        sorted(merged, key=lambda line: _distance(line["x1"], line["y1"], line["x2"], line["y2"]), reverse=True)[:260]
    )


def detect_rooms(plan: PreprocessedFloorPlan):
    kernel_size = max(5, int(min(plan.gray.shape[:2]) * 0.006))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    closed = cv2.morphologyEx(plan.binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    image_area = plan.gray.shape[0] * plan.gray.shape[1]
    rooms = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.002:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if w < 40 or h < 40:
            continue
        epsilon = 0.018 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        rooms.append(
            {
                "id": str(uuid4()),
                "x": float(x),
                "y": float(y),
                "width": float(w),
                "height": float(h),
                "area": float(area),
                "polygon": [
                    {"x": float(point[0][0]), "y": float(point[0][1])}
                    for point in approx[:24]
                ],
            }
        )

    return sorted(rooms, key=lambda room: room["area"], reverse=True)[:24]


def detect_doors(plan: PreprocessedFloorPlan, walls):
    circles = cv2.HoughCircles(
        plan.gray,
        cv2.HOUGH_GRADIENT,
        dp=1.25,
        minDist=42,
        param1=80,
        param2=24,
        minRadius=16,
        maxRadius=90,
    )
    if circles is None:
        return []

    doors = []
    for x, y, radius in np.round(circles[0, :]).astype("int")[:80]:
        near_wall = any(
            _point_to_segment_distance(x, y, wall) <= radius + 18
            for wall in walls
            if _distance(wall["x1"], wall["y1"], wall["x2"], wall["y2"]) > radius
        )
        if not near_wall:
            continue

        # Door swing arcs are partial circles with strong dark pixels on only part of the perimeter.
        mask = np.zeros_like(plan.binary)
        cv2.circle(mask, (x, y), int(radius), 255, 2)
        perimeter = cv2.countNonZero(mask)
        overlap = cv2.countNonZero(cv2.bitwise_and(plan.binary, mask))
        coverage = overlap / max(1, perimeter)
        if 0.08 <= coverage <= 0.42:
            doors.append(
                {
                    "id": str(uuid4()),
                    "x": float(x),
                    "y": float(y),
                    "radius": float(radius),
                    "confidence": round(float(coverage), 3),
                }
            )
    return doors[:18]


def detect_windows(walls):
    windows = []
    for index, first in enumerate(walls):
        for second in walls[index + 1 :]:
            first_horizontal = abs(first["y1"] - first["y2"]) < 1
            second_horizontal = abs(second["y1"] - second["y2"]) < 1
            first_vertical = abs(first["x1"] - first["x2"]) < 1
            second_vertical = abs(second["x1"] - second["x2"]) < 1

            if first_horizontal and second_horizontal and abs(first["y1"] - second["y1"]) <= 8:
                start = max(min(first["x1"], first["x2"]), min(second["x1"], second["x2"]))
                end = min(max(first["x1"], first["x2"]), max(second["x1"], second["x2"]))
                if 24 <= end - start <= 180:
                    windows.append({"id": str(uuid4()), "x1": start, "y1": (first["y1"] + second["y1"]) / 2, "x2": end, "y2": (first["y1"] + second["y1"]) / 2})
            elif first_vertical and second_vertical and abs(first["x1"] - second["x1"]) <= 8:
                start = max(min(first["y1"], first["y2"]), min(second["y1"], second["y2"]))
                end = min(max(first["y1"], first["y2"]), max(second["y1"], second["y2"]))
                if 24 <= end - start <= 180:
                    windows.append({"id": str(uuid4()), "x1": (first["x1"] + second["x1"]) / 2, "y1": start, "x2": (first["x1"] + second["x1"]) / 2, "y2": end})

    return windows[:40]


def detect_furniture(plan: PreprocessedFloorPlan):
    return extract_table_layout(plan)["tables"]


def detect_zones(plan: PreprocessedFloorPlan, furniture):
    zones = []
    image_height, image_width = plan.gray.shape[:2]
    image_area = image_width * image_height

    edge_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edge_closed = cv2.morphologyEx(plan.edges, cv2.MORPH_CLOSE, edge_kernel, iterations=1)
    contour_sources = [plan.binary, edge_closed]
    edge_rectangles = []

    for source in contour_sources:
        contours, _ = cv2.findContours(source, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < image_area * 0.006 or area > image_area * 0.13:
                continue

            rect = cv2.minAreaRect(contour)
            (cx, cy), (w, h), angle = rect
            long_side = max(w, h)
            short_side = min(w, h)
            if short_side <= 0:
                continue

            aspect = long_side / short_side
            if not 1.15 <= aspect <= 3.8:
                continue

            x, y, bw, bh = cv2.boundingRect(contour)
            if bw < image_width * 0.08 or bh < image_height * 0.06:
                continue
            if bw > image_width * 0.72 or bh > image_height * 0.72:
                continue

            if source is edge_closed and bw > image_width * 0.11 and image_height * 0.025 <= bh <= image_height * 0.11:
                edge_rectangles.append(
                    {
                        "type": "edge_rectangle",
                        "x": float(x + bw / 2),
                        "y": float(y + bh / 2),
                        "width": float(bw),
                        "height": float(bh),
                    }
                )

            candidate = {
                "id": str(uuid4()),
                "type": "dance_floor",
                "x": float(cx),
                "y": float(cy),
                "width": float(bw),
                "height": float(bh),
                "rotationDeg": float(angle if w >= h else angle + 90),
                "confidence": 0.64,
            }
            nearby_tables = _zone_nearby_table_count(candidate, furniture, min(image_width, image_height) * 0.08)
            if nearby_tables < 2:
                continue
            candidate["score"] = candidate["confidence"] + nearby_tables * 0.08

            table_overlap = any(_bbox_overlap_ratio(candidate, table) > 0.2 for table in furniture)
            if table_overlap:
                continue

            crop = plan.binary[y : y + bh, x : x + bw]
            density = cv2.countNonZero(crop) / max(1, bw * bh)
            if density > 0.24:
                continue

            zones.append(candidate)

    for index, first in enumerate(edge_rectangles):
        for second in edge_rectangles[index + 1 :]:
            aligned_x = abs(first["x"] - second["x"]) <= max(first["width"], second["width"]) * 0.35
            similar_width = min(first["width"], second["width"]) / max(first["width"], second["width"], 1) >= 0.72
            gap = abs(first["y"] - second["y"]) - (first["height"] + second["height"]) / 2
            if not aligned_x or not similar_width or gap < image_height * 0.11:
                continue
            candidate = {
                "id": str(uuid4()),
                "type": "dance_floor",
                "x": float((first["x"] + second["x"]) / 2),
                "y": float((first["y"] + second["y"]) / 2),
                "width": float(min(max(first["width"], second["width"]) * 1.55, image_width * 0.34)),
                "height": float(min(gap * 0.78, image_height * 0.25)),
                "rotationDeg": 0.0,
                "confidence": 0.96,
                "score": 1.3,
            }
            if not any(_bbox_overlap_ratio(candidate, table) > 0.18 for table in furniture):
                zones.append(candidate)

    rectangular_tables = [item for item in furniture if item["type"] == "rectangular_table"]
    for index, first in enumerate(rectangular_tables):
        for second in rectangular_tables[index + 1 :]:
            first_angle = abs(((first.get("rotationDeg", 0) + 90) % 180) - 90)
            second_angle = abs(((second.get("rotationDeg", 0) + 90) % 180) - 90)
            if first_angle > 18 or second_angle > 18:
                continue
            aligned_x = abs(first["x"] - second["x"]) <= max(first["width"], second["width"]) * 0.65
            similar_width = min(first["width"], second["width"]) / max(first["width"], second["width"], 1) >= 0.58
            gap = abs(first["y"] - second["y"]) - (first["height"] + second["height"]) / 2
            if not aligned_x or not similar_width or gap < image_height * 0.09:
                continue

            width = min(max(first["width"], second["width"]) * 1.45, image_width * 0.32)
            height = min(gap * 0.76, image_height * 0.24)
            candidate = {
                "id": str(uuid4()),
                "type": "dance_floor",
                "x": float((first["x"] + second["x"]) / 2),
                "y": float((first["y"] + second["y"]) / 2),
                "width": float(width),
                "height": float(height),
                "rotationDeg": 0.0,
                "confidence": 0.95,
            }
            if not any(_bbox_overlap_ratio(candidate, table) > 0.2 for table in furniture):
                candidate["score"] = 1.15
                zones.append(candidate)

    if zones:
        clean_zones = _dedupe_objects(zones)
        return sorted(clean_zones, key=lambda zone: zone.get("score", zone.get("confidence", 0)), reverse=True)[:1]

    contours, _ = cv2.findContours(plan.binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.006 or area > image_area * 0.13:
            continue

        rect = cv2.minAreaRect(contour)
        (cx, cy), (w, h), angle = rect
        long_side = max(w, h)
        short_side = min(w, h)
        if short_side <= 0:
            continue

        aspect = long_side / short_side
        if not 1.15 <= aspect <= 3.8:
            continue

        x, y, bw, bh = cv2.boundingRect(contour)
        if bw < image_width * 0.08 or bh < image_height * 0.06:
            continue

        table_overlap = any(
            _bbox_overlap_ratio(
                {"type": "zone", "x": float(cx), "y": float(cy), "width": float(bw), "height": float(bh)},
                table,
            )
            > 0.2
            for table in furniture
        )
        if table_overlap:
            continue

        crop = plan.binary[y : y + bh, x : x + bw]
        density = cv2.countNonZero(crop) / max(1, bw * bh)
        if density > 0.24:
            continue

        zones.append(
            {
                "id": str(uuid4()),
                "type": "dance_floor",
                "x": float(cx),
                "y": float(cy),
                "width": float(bw),
                "height": float(bh),
                "rotationDeg": float(angle if w >= h else angle + 90),
                "confidence": 0.64,
            }
        )

    clean_zones = _dedupe_objects(zones)
    return sorted(clean_zones, key=lambda zone: zone.get("score", zone.get("confidence", 0)), reverse=True)[:1]


def understand_floorplan(plan: PreprocessedFloorPlan):
    walls = detect_walls(plan)
    furniture = detect_furniture(plan)
    return {
        "walls": walls,
        "doors": detect_doors(plan, walls),
        "windows": detect_windows(walls),
        "rooms": detect_rooms(plan),
        "furniture": furniture,
        "zones": detect_zones(plan, furniture),
        "image": {
            "width": plan.gray.shape[1],
            "height": plan.gray.shape[0],
            "sourceWidth": plan.source_width,
            "sourceHeight": plan.source_height,
            "scaleFactor": plan.scale_factor,
        },
    }
