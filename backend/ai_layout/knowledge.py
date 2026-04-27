import json
from functools import lru_cache
from pathlib import Path


KNOWLEDGE_PATH = Path(__file__).with_name("event_knowledge.json")


@lru_cache(maxsize=1)
def load_event_knowledge():
    return json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))


def get_event_rule(event_type: str):
    return load_event_knowledge()["event_types"].get(event_type)


def build_prompt_knowledge_summary():
    knowledge = load_event_knowledge()["event_types"]
    lines = []

    for event_type, rules in knowledge.items():
        inferences = rules["inferences"]
        spacing = rules["recommended_spacing"]
        lines.append(
            "- {event}: style={style}; required={required}; optional={optional}; "
            "defaults(stage={stage}, podium={podium}, screen={screen}, aisle={aisle}, "
            "livestream={livestream}); spacing={spacing}; flow={flow}; cameras={cameras}; safety={safety}".format(
                event=event_type,
                style=rules["typical_layout_style"],
                required=", ".join(rules["required_objects"]),
                optional=", ".join(rules["optional_objects"]),
                stage=str(inferences["stage"]).lower(),
                podium=str(inferences["podium"]).lower(),
                screen=str(inferences["screen"]).lower(),
                aisle=str(inferences["central_aisle"]).lower(),
                livestream=str(inferences["livestream_likely"]).lower(),
                spacing=", ".join(f"{key}:{value}" for key, value in spacing.items()),
                flow=" ".join(rules["audience_flow_rules"][:2]),
                cameras=" ".join(rules["camera_placement_best_practices"][:2]),
                safety=" ".join(rules["safety_accessibility"][:2]),
            )
        )

    return "\n".join(lines)
