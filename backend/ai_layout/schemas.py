import json
from typing import Any


SUPPORTED_EVENT_TYPES = {
    "conference",
    "wedding",
    "funeral",
    "church",
}
SUPPORTED_SEATING_LAYOUTS = {
    "rows",
    "round_tables",
    "mixed",
}

ROOM_DEFAULTS = {
    "conference": {"width": 20, "depth": 30, "height": 4},
    "wedding": {"width": 24, "depth": 28, "height": 4},
    "funeral": {"width": 18, "depth": 26, "height": 4},
    "church": {"width": 22, "depth": 32, "height": 5},
}


def clamp(value: float, min_value: float, max_value: float):
    return min(max_value, max(min_value, value))


def to_finite_number(value: Any):
    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str) and value.strip():
        try:
            return float(value)
        except ValueError:
            return None

    return None


def to_boolean(value: Any, fallback: bool):
    return value if isinstance(value, bool) else fallback


def normalize_nullable_count(value: Any, min_value: int, max_value: int):
    parsed = to_finite_number(value)
    if parsed is None:
        return None
    return int(clamp(round(parsed), min_value, max_value))


def infer_event_type(raw_type: Any, seating_type: str):
    if isinstance(raw_type, str) and raw_type in SUPPORTED_EVENT_TYPES:
        return raw_type
    if seating_type == "round_tables":
        return "wedding"
    return "conference"


def infer_seating_defaults(seating_type: str, capacity: int, event_type: str):
    if seating_type == "round_tables":
        seats_per_table = 8 if event_type == "wedding" else 6
        return {
            "rows": None,
            "columns": None,
            "tableCount": max(1, -(-capacity // seats_per_table)),
            "seatsPerTable": seats_per_table,
            "hasCentralAisle": False,
        }

    if seating_type == "mixed":
        return {
            "rows": max(4, -(-int(capacity * 0.5) // 6)),
            "columns": 6,
            "tableCount": max(2, -(-int(capacity * 0.5) // 8)),
            "seatsPerTable": 8,
            "hasCentralAisle": True,
        }

    return {
        "rows": max(4, -(-capacity // 8)),
        "columns": 8,
        "tableCount": None,
        "seatsPerTable": None,
        "hasCentralAisle": event_type != "wedding",
    }


def normalize_room(room: dict[str, Any] | None, event_type: str):
    defaults = ROOM_DEFAULTS[event_type]
    room = room or {}

    return {
        "width": clamp(to_finite_number(room.get("width")) or defaults["width"], 10, 60),
        "depth": clamp(to_finite_number(room.get("depth")) or defaults["depth"], 10, 80),
        "height": clamp(to_finite_number(room.get("height")) or defaults["height"], 3, 8),
    }


def extract_json_object(text: str):
    trimmed = text.strip()

    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        pass

    fence_start = trimmed.find("```")
    if fence_start != -1:
        fence_end = trimmed.find("```", fence_start + 3)
        if fence_end != -1:
            fenced = trimmed[fence_start + 3 : fence_end].strip()
            if fenced.startswith("json"):
                fenced = fenced[4:].strip()
            try:
                return json.loads(fenced)
            except json.JSONDecodeError:
                pass

    start = trimmed.find("{")
    if start == -1:
        raise ValueError("The model response did not contain a JSON object.")

    depth = 0
    in_string = False
    is_escaped = False

    for index, char in enumerate(trimmed[start:], start=start):
        if in_string:
            if is_escaped:
                is_escaped = False
            elif char == "\\":
                is_escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return json.loads(trimmed[start : index + 1])

    raise ValueError("Could not extract valid JSON from the model response.")


def validate_prompt_layout_intent(input_data: Any):
    if not isinstance(input_data, dict):
        raise ValueError("The generated layout was not a JSON object.")

    layout = input_data.get("layout")
    seating = layout.get("seating") if isinstance(layout, dict) else {}
    seating_type = (
        seating.get("type")
        if isinstance(seating, dict) and seating.get("type") in SUPPORTED_SEATING_LAYOUTS
        else "rows"
    )
    event_type = infer_event_type(input_data.get("eventType"), seating_type)
    capacity = int(
        clamp(
            round(to_finite_number(input_data.get("capacity")) or (120 if event_type == "wedding" else 80)),
            10,
            500,
        )
    )
    room = normalize_room(
        input_data.get("room") if isinstance(input_data.get("room"), dict) else {},
        event_type,
    )
    defaults = infer_seating_defaults(seating_type, capacity, event_type)

    stage = layout.get("stage") if isinstance(layout, dict) and isinstance(layout.get("stage"), dict) else {}
    podium = layout.get("podium") if isinstance(layout, dict) and isinstance(layout.get("podium"), dict) else {}
    screen = layout.get("screen") if isinstance(layout, dict) and isinstance(layout.get("screen"), dict) else {}
    decor = layout.get("decor") if isinstance(layout, dict) and isinstance(layout.get("decor"), dict) else {}

    return {
        "eventType": event_type,
        "capacity": capacity,
        "room": room,
        "layout": {
            "seating": {
                "type": seating_type,
                "rows": normalize_nullable_count(seating.get("rows") if isinstance(seating, dict) else None, 1, 60)
                or defaults["rows"],
                "columns": normalize_nullable_count(
                    seating.get("columns") if isinstance(seating, dict) else None,
                    1,
                    24,
                )
                or defaults["columns"],
                "tableCount": normalize_nullable_count(
                    seating.get("tableCount") if isinstance(seating, dict) else None,
                    1,
                    80,
                )
                or defaults["tableCount"],
                "seatsPerTable": normalize_nullable_count(
                    seating.get("seatsPerTable") if isinstance(seating, dict) else None,
                    2,
                    12,
                )
                or defaults["seatsPerTable"],
                "hasCentralAisle": to_boolean(
                    seating.get("hasCentralAisle") if isinstance(seating, dict) else None,
                    defaults["hasCentralAisle"],
                ),
            },
            "stage": {
                "enabled": to_boolean(
                    stage.get("enabled"),
                    event_type != "wedding" or seating_type != "round_tables",
                ),
                "position": "center" if stage.get("position") == "center" else "front",
            },
            "podium": {
                "enabled": to_boolean(podium.get("enabled"), event_type != "wedding"),
            },
            "screen": {
                "enabled": to_boolean(
                    screen.get("enabled"),
                    event_type in {"conference", "church"},
                ),
            },
            "decor": {
                "plants": to_boolean(
                    decor.get("plants"),
                    event_type in {"wedding", "funeral"},
                ),
                "lighting": to_boolean(decor.get("lighting"), True),
            },
        },
    }

