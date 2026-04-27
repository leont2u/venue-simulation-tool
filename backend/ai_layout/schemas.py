import json
import math
import re
from typing import Any

from .knowledge import get_event_rule


SUPPORTED_EVENT_TYPES = {
    "conference",
    "wedding",
    "funeral",
    "church",
    "corporate_event",
    "concert",
    "outdoor_event",
    "exhibition",
    "graduation_ceremony",
    "product_launch",
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
    "corporate_event": {"width": 26, "depth": 34, "height": 4},
    "concert": {"width": 34, "depth": 46, "height": 6},
    "outdoor_event": {"width": 34, "depth": 40, "height": 5},
    "exhibition": {"width": 34, "depth": 42, "height": 5},
    "graduation_ceremony": {"width": 32, "depth": 44, "height": 5},
    "product_launch": {"width": 28, "depth": 36, "height": 5},
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
    "exhibition_booth": "exhibition",
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
    "wedding": {"wedding", "wedding reception", "bride", "groom", "bridal"},
    "funeral": {"funeral", "memorial", "celebration of life", "wake"},
    "church": {"church", "worship", "chapel", "service", "sunday service", "sermon"},
    "conference": {"conference", "seminar", "meeting", "presentation", "workshop", "training", "summit"},
    "corporate_event": {"corporate", "company event", "town hall", "staff event", "business event"},
    "concert": {"concert", "music show", "performance", "festival stage", "live show"},
    "outdoor_event": {"outdoor", "tent", "marquee", "garden event", "field event"},
    "exhibition": {"exhibition", "expo", "trade show", "booth", "booths", "stands"},
    "graduation_ceremony": {"graduation", "commencement", "graduates", "certificate ceremony"},
    "product_launch": {"product launch", "launch event", "product reveal", "demo launch", "media launch"},
}

EVENT_TYPE_ALIASES = {
    "corporate": "corporate_event",
    "corporate event": "corporate_event",
    "graduation": "graduation_ceremony",
    "graduation ceremony": "graduation_ceremony",
    "product": "product_launch",
    "launch": "product_launch",
    "product launch": "product_launch",
    "outdoor": "outdoor_event",
    "outdoor event": "outdoor_event",
    "expo": "exhibition",
}

STAGE_KEYWORDS = {"stage", "platform", "performance", "speaker", "altar", "main table", "bridal table"}
PODIUM_KEYWORDS = {"podium", "lectern"}
SCREEN_KEYWORDS = {"screen", "projector", "led"}
AISLE_KEYWORDS = {"aisle", "central aisle"}
PLANT_KEYWORDS = {"plant", "plants", "flowers", "floral", "decor"}
LIVESTREAM_KEYWORDS = {"livestream", "live stream", "streaming", "broadcast", "camera", "cameras", "recording", "hybrid"}
OUTDOOR_KEYWORDS = {"outdoor", "outside", "tent", "marquee", "garden", "field"}
PREMIUM_KEYWORDS = {"premium", "vip", "high end", "luxury", "executive", "media launch"}


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


def normalize_event_type(value: Any):
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in SUPPORTED_EVENT_TYPES:
        return normalized
    alias_key = value.strip().lower().replace("_", " ")
    return EVENT_TYPE_ALIASES.get(alias_key)


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
        "mentionsLivestream": any(keyword in normalized for keyword in LIVESTREAM_KEYWORDS),
        "mentionsOutdoor": any(keyword in normalized for keyword in OUTDOOR_KEYWORDS),
        "mentionsPremium": any(keyword in normalized for keyword in PREMIUM_KEYWORDS),
    }


def infer_layout_style(raw_style: Any, prompt_hints: dict[str, Any], raw_event_type: Any):
    if prompt_hints["layoutStyle"] in SUPPORTED_LAYOUT_STYLES:
        return prompt_hints["layoutStyle"]

    if isinstance(raw_style, str) and raw_style in SUPPORTED_LAYOUT_STYLES:
        return raw_style

    event_type = prompt_hints["eventType"] or normalize_event_type(raw_event_type)
    rule = get_event_rule(event_type) if event_type else None
    if rule and rule["typical_layout_style"] in SUPPORTED_LAYOUT_STYLES:
        return rule["typical_layout_style"]

    return "theatre"


def infer_event_type(raw_type: Any, layout_style: str, prompt_hints: dict[str, Any]):
    if prompt_hints["eventType"] in SUPPORTED_EVENT_TYPES:
        return prompt_hints["eventType"]

    normalized_type = normalize_event_type(raw_type)
    if normalized_type in SUPPORTED_EVENT_TYPES:
        return normalized_type

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


def get_rule_inferences(event_type: str):
    rule = get_event_rule(event_type) or {}
    return rule.get("inferences", {})


def normalize_priority(value: Any, fallback: str = "recommended"):
    if isinstance(value, str) and value in {"required", "recommended", "optional"}:
        return value
    return fallback


def normalize_text_list(value: Any, fallback: list[str], limit: int = 8):
    if not isinstance(value, list):
        return fallback[:limit]

    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return (cleaned or fallback)[:limit]


def normalize_spacing_rules(value: Any, event_type: str):
    rule = get_event_rule(event_type) or {}
    spacing = rule.get("recommended_spacing", {})
    value = value if isinstance(value, dict) else {}

    return {
        "mainAisleWidthM": clamp(
            to_finite_number(value.get("mainAisleWidthM")) or spacing.get("main_aisle_width_m") or spacing.get("central_aisle_width_m") or 1.5,
            1.0,
            4.0,
        ),
        "tableSpacingM": clamp(to_finite_number(value.get("tableSpacingM")) or spacing.get("table_spacing_m") or 2.4, 1.8, 5.0),
        "rowSpacingM": clamp(to_finite_number(value.get("rowSpacingM")) or spacing.get("row_spacing_m") or 1.1, 0.9, 2.0),
        "frontClearanceM": clamp(
            to_finite_number(value.get("frontClearanceM")) or spacing.get("front_clearance_m") or spacing.get("stage_clearance_m") or 2.0,
            1.2,
            5.0,
        ),
        "emergencyExitClearanceM": clamp(
            to_finite_number(value.get("emergencyExitClearanceM")) or spacing.get("emergency_exit_clearance_m") or 1.5,
            1.2,
            4.0,
        ),
    }


def default_camera_plan(event_type: str, livestream_required: bool):
    if not livestream_required:
        return []

    if event_type == "funeral":
        return [
            {
                "role": "discreet_wide_camera",
                "placement": "rear center outside family sightlines",
                "purpose": "ceremony livestream with minimal intrusion",
                "priority": "recommended",
            }
        ]

    if event_type in {"wedding", "church", "graduation_ceremony"}:
        return [
            {
                "role": "wide_camera",
                "placement": "rear center with clear aisle sightline",
                "purpose": "full room and front focus coverage",
                "priority": "required",
            },
            {
                "role": "side_camera",
                "placement": "front side outside guest circulation",
                "purpose": "speaker, vows, altar, or certificate close-ups",
                "priority": "recommended",
            },
        ]

    return [
        {
            "role": "wide_camera",
            "placement": "rear center with stage and screen sightline",
            "purpose": "full room and presenter coverage",
            "priority": "recommended",
        },
        {
            "role": "closeup_camera",
            "placement": "front side outside main aisle",
            "purpose": "speaker or product close-up",
            "priority": "optional",
        },
    ]


def normalize_camera_plan(value: Any, event_type: str, livestream_required: bool):
    fallback = default_camera_plan(event_type, livestream_required)
    if not isinstance(value, list):
        return fallback

    cameras = []
    for item in value[:4]:
        if not isinstance(item, dict):
            continue
        cameras.append(
            {
                "role": str(item.get("role") or "camera"),
                "placement": str(item.get("placement") or "rear or side position with line of sight"),
                "purpose": str(item.get("purpose") or "event coverage"),
                "priority": normalize_priority(item.get("priority")),
            }
        )
    return cameras or fallback


def normalize_av_layering(value: Any, livestream_required: bool, screen_enabled: bool):
    fallback = []
    if screen_enabled:
        fallback.append({"type": "screen", "purpose": "visual reinforcement", "priority": "recommended"})
    if livestream_required:
        fallback.extend(
            [
                {"type": "av_desk", "purpose": "stream switching, audio monitoring, and cue control", "priority": "recommended"},
                {"type": "cable_paths", "purpose": "protected runs away from aisles and exits", "priority": "required"},
            ]
        )

    if not isinstance(value, list):
        return fallback

    layers = []
    for item in value[:5]:
        if not isinstance(item, dict):
            continue
        layers.append(
            {
                "type": str(item.get("type") or "av_element"),
                "purpose": str(item.get("purpose") or "event operations support"),
                "priority": normalize_priority(item.get("priority")),
            }
        )
    return layers or fallback


def ensure_room_capacity(room: dict[str, float], layout_style: str, capacity: int):
    adjusted = dict(room)
    minimums = STYLE_ROOM_MINIMUMS[layout_style]
    adjusted["width"] = clamp(max(adjusted["width"], minimums["width"]), 10, 60)
    adjusted["depth"] = clamp(max(adjusted["depth"], minimums["depth"]), 10, 80)

    if layout_style in {"banquet_round_table", "cabaret"}:
        seats_per_table = 8
        table_count = max(1, math.ceil(capacity / seats_per_table))
        columns = max(2, math.ceil(table_count**0.5))
        if columns % 2 and table_count > 4:
            columns += 1
        rows = max(1, math.ceil(table_count / columns))
        adjusted["width"] = clamp(max(adjusted["width"], 10 + (columns - 1) * 4.2), 10, 60)
        adjusted["depth"] = clamp(max(adjusted["depth"], 18 + (rows - 1) * 4.2), 10, 80)
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
    rule_inferences = get_rule_inferences(event_type)

    stage = layout.get("stage") if isinstance(layout, dict) and isinstance(layout.get("stage"), dict) else {}
    podium = layout.get("podium") if isinstance(layout, dict) and isinstance(layout.get("podium"), dict) else {}
    screen = layout.get("screen") if isinstance(layout, dict) and isinstance(layout.get("screen"), dict) else {}
    decor = layout.get("decor") if isinstance(layout, dict) and isinstance(layout.get("decor"), dict) else {}
    prompt_understanding = (
        input_data.get("promptUnderstanding") if isinstance(input_data.get("promptUnderstanding"), dict) else {}
    )

    style_defaults = {
        "stageEnabled": rule_inferences.get("stage", layout_style in {"theatre", "classroom", "cabaret", "auditorium"}),
        "podiumEnabled": rule_inferences.get("podium", layout_style in {"theatre", "classroom", "u_shape"}),
        "screenEnabled": rule_inferences.get(
            "screen",
            layout_style in {"theatre", "classroom", "cabaret", "auditorium", "church"},
        ),
        "plantsEnabled": rule_inferences.get("plants", event_type in {"wedding", "funeral"} or layout_style == "lounge"),
    }
    livestream_required = to_boolean(
        prompt_understanding.get("livestreamRequired"),
        prompt_hints["mentionsLivestream"] or bool(rule_inferences.get("livestream_likely")),
    )
    stage_enabled = to_boolean(
        stage.get("enabled"),
        prompt_hints["mentionsStage"] or style_defaults["stageEnabled"],
    )
    podium_enabled = to_boolean(
        podium.get("enabled"),
        prompt_hints["mentionsPodium"] or style_defaults["podiumEnabled"],
    )
    screen_enabled = to_boolean(
        screen.get("enabled"),
        prompt_hints["mentionsScreen"] or livestream_required or style_defaults["screenEnabled"],
    )
    plants_enabled = to_boolean(
        decor.get("plants"),
        prompt_hints["mentionsPlants"] or style_defaults["plantsEnabled"],
    )
    indoor_outdoor = prompt_understanding.get("indoorOutdoor")
    if indoor_outdoor not in {"indoor", "outdoor", "inferred_indoor", "inferred_outdoor"}:
        indoor_outdoor = "inferred_outdoor" if (event_type == "outdoor_event" or prompt_hints["mentionsOutdoor"]) else "inferred_indoor"
    premium_level = prompt_understanding.get("premiumLevel")
    if premium_level not in {"basic", "standard", "premium"}:
        premium_level = "premium" if prompt_hints["mentionsPremium"] or rule_inferences.get("premium_level") == "premium" else "standard"
    spacing_rules = normalize_spacing_rules(input_data.get("spacingRules"), event_type)
    camera_plan = normalize_camera_plan(input_data.get("cameraPlan"), event_type, livestream_required)
    av_layering = normalize_av_layering(input_data.get("avLayering"), livestream_required, screen_enabled)
    rule = get_event_rule(event_type) or {}
    default_notes = [
        *(rule.get("audience_flow_rules", [])[:2]),
        *(rule.get("visibility_rules", [])[:2]),
        *(rule.get("safety_accessibility", [])[:2]),
    ]

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
                "enabled": stage_enabled,
                "position": "center" if stage.get("position") == "center" else "front",
            },
            "podium": {
                "enabled": podium_enabled,
            },
            "screen": {
                "enabled": screen_enabled,
            },
            "decor": {
                "plants": plants_enabled,
                "lighting": to_boolean(decor.get("lighting"), True),
            },
        },
        "promptUnderstanding": {
            "guestCount": capacity,
            "layoutPreference": layout_style,
            "livestreamRequired": livestream_required,
            "indoorOutdoor": indoor_outdoor,
            "premiumLevel": premium_level,
        },
        "spacingRules": spacing_rules,
        "cameraPlan": camera_plan,
        "avLayering": av_layering,
        "professionalNotes": normalize_text_list(input_data.get("professionalNotes"), default_notes),
    }
