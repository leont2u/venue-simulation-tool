import json
import math
import re
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
SUPPORTED_LAYOUT_STYLES = {
    "banquet_round_table",
    "theatre",
    "classroom",
    "boardroom",
    "u_shape",
    "hollow_square",
    "cocktail_reception",
    "cabaret",
    "pods",
    "auditorium",
    "exhibition_booth",
    "lounge",
}

ROOM_DEFAULTS = {
    "conference": {"width": 20, "depth": 30, "height": 4},
    "wedding": {"width": 24, "depth": 28, "height": 4},
    "funeral": {"width": 18, "depth": 26, "height": 4},
    "church": {"width": 22, "depth": 32, "height": 5},
}

STYLE_SEATING_TYPE = {
    "banquet_round_table": "round_tables",
    "theatre": "rows",
    "classroom": "mixed",
    "boardroom": "mixed",
    "u_shape": "mixed",
    "hollow_square": "mixed",
    "cocktail_reception": "round_tables",
    "cabaret": "round_tables",
    "pods": "mixed",
    "auditorium": "rows",
    "exhibition_booth": "mixed",
    "lounge": "mixed",
}

STYLE_DEFAULT_EVENT = {
    "banquet_round_table": "wedding",
    "theatre": "conference",
    "classroom": "conference",
    "boardroom": "conference",
    "u_shape": "conference",
    "hollow_square": "conference",
    "cocktail_reception": "wedding",
    "cabaret": "conference",
    "pods": "conference",
    "auditorium": "conference",
    "exhibition_booth": "conference",
    "lounge": "wedding",
}

STYLE_ROOM_MINIMUMS = {
    "banquet_round_table": {"width": 24, "depth": 28},
    "theatre": {"width": 20, "depth": 24},
    "classroom": {"width": 22, "depth": 26},
    "boardroom": {"width": 14, "depth": 16},
    "u_shape": {"width": 18, "depth": 18},
    "hollow_square": {"width": 18, "depth": 18},
    "cocktail_reception": {"width": 20, "depth": 22},
    "cabaret": {"width": 24, "depth": 28},
    "pods": {"width": 22, "depth": 24},
    "auditorium": {"width": 24, "depth": 34},
    "exhibition_booth": {"width": 26, "depth": 30},
    "lounge": {"width": 18, "depth": 20},
}

STYLE_KEYWORDS = {
    "banquet_round_table": {
        "banquet",
        "banquet table",
        "banquet tables",
        "round table",
        "round tables",
        "dinner",
    },
    "theatre": {"theatre", "theater", "cinema", "church setup", "presentation seating"},
    "classroom": {"classroom", "training", "seminar", "workshop tables"},
    "boardroom": {"boardroom", "board room", "executive meeting"},
    "u_shape": {"u-shape", "u shape", "horseshoe"},
    "hollow_square": {"hollow square", "square discussion", "square layout"},
    "cocktail_reception": {"cocktail", "reception", "standing", "mingle", "networking"},
    "cabaret": {"cabaret"},
    "pods": {"pods", "cluster", "clusters", "teams", "breakout"},
    "auditorium": {"auditorium", "arena", "large-scale seating", "large scale seating"},
    "exhibition_booth": {"exhibition", "booth", "booths", "expo", "trade show", "stands"},
    "lounge": {"lounge", "vip", "sofa", "casual seating", "relaxed seating"},
}

EVENT_KEYWORDS = {
    "wedding": {"wedding", "reception", "bride", "groom"},
    "funeral": {"funeral", "memorial"},
    "church": {"church", "worship", "chapel"},
    "conference": {"conference", "seminar", "meeting", "presentation"},
}

STAGE_KEYWORDS = {"stage", "platform", "performance", "speaker"}
PODIUM_KEYWORDS = {"podium", "lectern"}
SCREEN_KEYWORDS = {"screen", "projector", "led"}
AISLE_KEYWORDS = {"aisle", "central aisle"}
PLANT_KEYWORDS = {"plant", "plants", "flowers", "floral", "decor"}


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


def parse_capacity_from_prompt(prompt: str):
    matches = re.findall(r"\b(\d{2,4})\b", prompt)
    for match in matches:
        value = int(match)
        if 10 <= value <= 500:
            return value
    return None


def infer_layout_style_from_prompt(prompt: str):
    normalized = prompt.lower()
    for style, keywords in STYLE_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return style
    return None


def infer_event_type_from_prompt(prompt: str):
    normalized = prompt.lower()
    for event_type, keywords in EVENT_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return event_type
    return None


def infer_prompt_hints(prompt: str):
    normalized = prompt.lower()
    layout_style = infer_layout_style_from_prompt(normalized)
    event_type = infer_event_type_from_prompt(normalized)

    return {
        "eventType": event_type,
        "layoutStyle": layout_style,
        "capacity": parse_capacity_from_prompt(normalized),
        "mentionsStage": any(keyword in normalized for keyword in STAGE_KEYWORDS),
        "mentionsPodium": any(keyword in normalized for keyword in PODIUM_KEYWORDS),
        "mentionsScreen": any(keyword in normalized for keyword in SCREEN_KEYWORDS),
        "mentionsAisle": any(keyword in normalized for keyword in AISLE_KEYWORDS),
        "mentionsPlants": any(keyword in normalized for keyword in PLANT_KEYWORDS),
    }


def infer_layout_style(raw_style: Any, prompt_hints: dict[str, Any], raw_event_type: Any):
    if prompt_hints["layoutStyle"] in SUPPORTED_LAYOUT_STYLES:
        return prompt_hints["layoutStyle"]

    if isinstance(raw_style, str) and raw_style in SUPPORTED_LAYOUT_STYLES:
        return raw_style

    if isinstance(raw_event_type, str) and raw_event_type == "wedding":
        return "banquet_round_table"

    return "theatre"


def infer_event_type(raw_type: Any, layout_style: str, prompt_hints: dict[str, Any]):
    if prompt_hints["eventType"] in SUPPORTED_EVENT_TYPES:
        return prompt_hints["eventType"]

    if isinstance(raw_type, str) and raw_type in SUPPORTED_EVENT_TYPES:
        return raw_type

    return STYLE_DEFAULT_EVENT[layout_style]


def infer_seating_defaults(layout_style: str, capacity: int, event_type: str):
    if layout_style in {"banquet_round_table", "cabaret"}:
        seats_per_table = 8 if event_type == "wedding" else 6
        return {
            "rows": None,
            "columns": None,
            "tableCount": max(1, math.ceil(capacity / seats_per_table)),
            "seatsPerTable": seats_per_table,
            "hasCentralAisle": False,
        }

    if layout_style == "cocktail_reception":
        return {
            "rows": None,
            "columns": None,
            "tableCount": max(4, math.ceil(capacity / 12)),
            "seatsPerTable": 0,
            "hasCentralAisle": False,
        }

    if layout_style in {"classroom", "pods", "boardroom", "u_shape", "hollow_square", "exhibition_booth", "lounge"}:
        return {
            "rows": None,
            "columns": None,
            "tableCount": max(2, math.ceil(capacity / 8)),
            "seatsPerTable": 6 if layout_style == "pods" else 4,
            "hasCentralAisle": False,
        }

    rows = max(4, math.ceil(capacity / 8))
    columns = 8 if layout_style != "auditorium" else 10
    return {
        "rows": rows,
        "columns": columns,
        "tableCount": None,
        "seatsPerTable": None,
        "hasCentralAisle": layout_style in {"theatre", "auditorium"},
    }


def normalize_room(room: dict[str, Any] | None, event_type: str):
    defaults = ROOM_DEFAULTS[event_type]
    room = room or {}

    return {
        "width": clamp(to_finite_number(room.get("width")) or defaults["width"], 10, 60),
        "depth": clamp(to_finite_number(room.get("depth")) or defaults["depth"], 10, 80),
        "height": clamp(to_finite_number(room.get("height")) or defaults["height"], 3, 8),
    }


def ensure_room_capacity(room: dict[str, float], layout_style: str, capacity: int):
    adjusted = dict(room)
    minimums = STYLE_ROOM_MINIMUMS[layout_style]
    adjusted["width"] = clamp(max(adjusted["width"], minimums["width"]), 10, 60)
    adjusted["depth"] = clamp(max(adjusted["depth"], minimums["depth"]), 10, 80)

    if layout_style in {"banquet_round_table", "cabaret"}:
        seats_per_table = 8
        table_count = max(1, math.ceil(capacity / seats_per_table))
        columns = max(2, math.ceil(table_count**0.5))
        rows = max(1, math.ceil(table_count / columns))
        adjusted["width"] = clamp(max(adjusted["width"], 8 + (columns - 1) * 4.2), 10, 60)
        adjusted["depth"] = clamp(max(adjusted["depth"], 12 + (rows - 1) * 4.2), 10, 80)
    elif layout_style in {"theatre", "auditorium"}:
        needed_rows = max(4, math.ceil(capacity / (10 if layout_style == "auditorium" else 8)))
        adjusted["depth"] = clamp(max(adjusted["depth"], 8 + needed_rows * 1.15), 10, 80)
    elif layout_style == "classroom":
        needed_rows = max(4, math.ceil(capacity / 6))
        adjusted["depth"] = clamp(max(adjusted["depth"], 10 + needed_rows * 2.2), 10, 80)
    elif layout_style == "pods":
        cluster_count = max(2, math.ceil(capacity / 8))
        columns = max(2, math.ceil(cluster_count**0.5))
        rows = max(1, math.ceil(cluster_count / columns))
        adjusted["width"] = clamp(max(adjusted["width"], 8 + (columns - 1) * 5.4), 10, 60)
        adjusted["depth"] = clamp(max(adjusted["depth"], 10 + (rows - 1) * 5.4), 10, 80)
    elif layout_style == "exhibition_booth":
        booth_count = max(4, math.ceil(capacity / 10))
        columns = max(2, math.ceil(booth_count**0.5))
        rows = max(1, math.ceil(booth_count / columns))
        adjusted["width"] = clamp(max(adjusted["width"], 10 + (columns - 1) * 5.5), 10, 60)
        adjusted["depth"] = clamp(max(adjusted["depth"], 10 + (rows - 1) * 5.5), 10, 80)

    return adjusted


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


def validate_prompt_layout_intent(input_data: Any, user_prompt: str = ""):
    if not isinstance(input_data, dict):
        raise ValueError("The generated layout was not a JSON object.")

    prompt_hints = infer_prompt_hints(user_prompt)
    layout = input_data.get("layout")
    seating = layout.get("seating") if isinstance(layout, dict) else {}
    layout_style = infer_layout_style(
        input_data.get("layoutStyle"),
        prompt_hints,
        input_data.get("eventType"),
    )
    event_type = infer_event_type(input_data.get("eventType"), layout_style, prompt_hints)
    capacity = int(
        clamp(
            round(
                prompt_hints["capacity"]
                or to_finite_number(input_data.get("capacity"))
                or (120 if event_type == "wedding" else 80)
            ),
            10,
            500,
        )
    )
    seating_type = STYLE_SEATING_TYPE[layout_style]
    room = ensure_room_capacity(
        normalize_room(
            input_data.get("room") if isinstance(input_data.get("room"), dict) else {},
            event_type,
        ),
        layout_style,
        capacity,
    )
    defaults = infer_seating_defaults(layout_style, capacity, event_type)

    stage = layout.get("stage") if isinstance(layout, dict) and isinstance(layout.get("stage"), dict) else {}
    podium = layout.get("podium") if isinstance(layout, dict) and isinstance(layout.get("podium"), dict) else {}
    screen = layout.get("screen") if isinstance(layout, dict) and isinstance(layout.get("screen"), dict) else {}
    decor = layout.get("decor") if isinstance(layout, dict) and isinstance(layout.get("decor"), dict) else {}

    style_defaults = {
        "stageEnabled": layout_style in {"theatre", "classroom", "cabaret", "auditorium"},
        "podiumEnabled": layout_style in {"theatre", "classroom", "u_shape"},
        "screenEnabled": layout_style in {"theatre", "classroom", "cabaret", "auditorium", "church"},
        "plantsEnabled": event_type in {"wedding", "funeral"} or layout_style == "lounge",
    }

    return {
        "eventType": event_type,
        "layoutStyle": layout_style,
        "capacity": capacity,
        "room": room,
        "layout": {
            "seating": {
                "type": seating_type,
                "rows": normalize_nullable_count(
                    seating.get("rows") if isinstance(seating, dict) else None, 1, 60
                )
                or defaults["rows"],
                "columns": normalize_nullable_count(
                    seating.get("columns") if isinstance(seating, dict) else None, 1, 24
                )
                or defaults["columns"],
                "tableCount": normalize_nullable_count(
                    seating.get("tableCount") if isinstance(seating, dict) else None, 1, 80
                )
                or defaults["tableCount"],
                "seatsPerTable": normalize_nullable_count(
                    seating.get("seatsPerTable") if isinstance(seating, dict) else None, 0, 12
                )
                if isinstance(seating, dict) and seating.get("seatsPerTable") is not None
                else defaults["seatsPerTable"],
                "hasCentralAisle": to_boolean(
                    seating.get("hasCentralAisle") if isinstance(seating, dict) else None,
                    prompt_hints["mentionsAisle"] or defaults["hasCentralAisle"],
                ),
            },
            "stage": {
                "enabled": to_boolean(
                    stage.get("enabled"),
                    prompt_hints["mentionsStage"] or style_defaults["stageEnabled"],
                ),
                "position": "center" if stage.get("position") == "center" else "front",
            },
            "podium": {
                "enabled": to_boolean(
                    podium.get("enabled"),
                    prompt_hints["mentionsPodium"] or style_defaults["podiumEnabled"],
                ),
            },
            "screen": {
                "enabled": to_boolean(
                    screen.get("enabled"),
                    prompt_hints["mentionsScreen"] or style_defaults["screenEnabled"],
                ),
            },
            "decor": {
                "plants": to_boolean(
                    decor.get("plants"),
                    prompt_hints["mentionsPlants"] or style_defaults["plantsEnabled"],
                ),
                "lighting": to_boolean(decor.get("lighting"), True),
            },
        },
    }
