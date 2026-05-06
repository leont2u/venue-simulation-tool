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


def detect_walls(plan: PreprocessedFloorPlan):
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
    return sorted(merged, key=lambda line: _distance(line["x1"], line["y1"], line["x2"], line["y2"]), reverse=True)[:260]


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
    furniture = []
    image_height, image_width = plan.gray.shape[:2]
    image_area = image_height * image_width
    min_round_radius = max(22, int(min(image_width, image_height) * 0.014))
    max_round_radius = max(min_round_radius + 12, int(min(image_width, image_height) * 0.05))
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
            furniture.append(
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
        furniture.append(
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

    return _align_table_grid(_dedupe_objects(furniture))[:90]


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
