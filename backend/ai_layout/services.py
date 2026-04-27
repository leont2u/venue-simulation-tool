import json
import os
from urllib import error, request

from .feedback import build_feedback_prompt_context
from .knowledge import build_prompt_knowledge_summary
from .schemas import extract_json_object


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3").strip()


def build_scene_prompt(user_prompt: str):
    knowledge_summary = build_prompt_knowledge_summary()
    feedback_context = build_feedback_prompt_context()

    return f"""
You are a professional venue planner, event designer, and livestream production specialist with expertise in weddings, conferences, churches, funerals, corporate events, concerts, outdoor events, exhibitions, graduations, and product launches.

You optimize layouts for guest comfort, visual quality, livestream production, logistics, safety, accessibility, and realism.
You always think like a senior event planner, not a generic AI assistant.

IMPORTANT:
You DO NOT generate 3D coordinates.
You DO NOT place objects in space.
You ONLY describe professional layout intent in a structured JSON format.

Your output will be used by a deterministic layout engine that handles positioning.
Keep the intent realistic and mapper-friendly.

TASK:
Convert a user prompt into a clean professional layout intent.
Infer missing event-planning context from domain standards.
For example, "wedding for 200 guests" implies banquet round tables, bridal/stage focus, central aisle, possible dance floor/DJ/livestream needs, service spacing, and clear exits.

STRICT RULES:
- Return ONLY a valid JSON object.
- Do NOT include x, y, z, rotation, scale, or assetUrl.
- Do NOT include explanations, markdown, or extra text.
- Use ONLY the schema below.
- If a value is unknown, make a reasonable assumption.
- Be consistent and realistic with capacity.
- Use professional planning defaults from the knowledge rules.
- Do not invent unsupported layoutStyle values.

SUPPORTED VALUES:
- eventType:
  "conference" |
  "wedding" |
  "funeral" |
  "church" |
  "corporate_event" |
  "concert" |
  "outdoor_event" |
  "exhibition" |
  "graduation_ceremony" |
  "product_launch"
- layoutStyle:
  "banquet_round_table" |
  "theatre" |
  "classroom" |
  "boardroom" |
  "u_shape" |
  "hollow_square" |
  "cocktail_reception" |
  "cabaret" |
  "pods" |
  "auditorium" |
  "exhibition_booth" |
  "lounge"
- seatingLayout: "rows" | "round_tables" | "mixed"

DOMAIN KNOWLEDGE RULES:
{knowledge_summary}

RECENT PLANNER CORRECTIONS TO RESPECT WHEN RELEVANT:
{feedback_context}

OUTPUT SCHEMA:
{{
  "eventType": string,
  "layoutStyle": string,
  "capacity": number,
  "room": {{
    "width": number,
    "depth": number,
    "height": number
  }},
  "layout": {{
    "seating": {{
      "type": "rows" | "round_tables" | "mixed",
      "rows": number | null,
      "columns": number | null,
      "tableCount": number | null,
      "seatsPerTable": number | null,
      "hasCentralAisle": boolean
    }},
    "stage": {{
      "enabled": boolean,
      "position": "front" | "center"
    }},
    "podium": {{
      "enabled": boolean
    }},
    "screen": {{
      "enabled": boolean
    }},
    "decor": {{
      "plants": boolean,
      "lighting": boolean
    }}
  }},
  "promptUnderstanding": {{
    "guestCount": number,
    "layoutPreference": string,
    "livestreamRequired": boolean,
    "indoorOutdoor": "indoor" | "outdoor" | "inferred_indoor" | "inferred_outdoor",
    "premiumLevel": "basic" | "standard" | "premium"
  }},
  "spacingRules": {{
    "mainAisleWidthM": number,
    "tableSpacingM": number,
    "rowSpacingM": number,
    "frontClearanceM": number,
    "emergencyExitClearanceM": number
  }},
  "cameraPlan": [
    {{
      "role": string,
      "placement": string,
      "purpose": string,
      "priority": "required" | "recommended" | "optional"
    }}
  ],
  "avLayering": [
    {{
      "type": string,
      "purpose": string,
      "priority": "required" | "recommended" | "optional"
    }}
  ],
  "professionalNotes": [string]
}}

FEW-SHOT EXAMPLES:
Input: Wedding for 200 guests with livestream
Output:
{{
  "eventType": "wedding",
  "layoutStyle": "banquet_round_table",
  "capacity": 200,
  "room": {{"width": 36, "depth": 44, "height": 5}},
  "layout": {{
    "seating": {{"type": "round_tables", "rows": null, "columns": null, "tableCount": 25, "seatsPerTable": 8, "hasCentralAisle": true}},
    "stage": {{"enabled": true, "position": "front"}},
    "podium": {{"enabled": true}},
    "screen": {{"enabled": true}},
    "decor": {{"plants": true, "lighting": true}}
  }},
  "promptUnderstanding": {{"guestCount": 200, "layoutPreference": "banquet_round_table", "livestreamRequired": true, "indoorOutdoor": "inferred_indoor", "premiumLevel": "standard"}},
  "spacingRules": {{"mainAisleWidthM": 1.8, "tableSpacingM": 3.0, "rowSpacingM": 1.1, "frontClearanceM": 2.0, "emergencyExitClearanceM": 1.5}},
  "cameraPlan": [
    {{"role": "wide_camera", "placement": "rear center with clear aisle sightline", "purpose": "full room and stage coverage", "priority": "required"}},
    {{"role": "side_camera", "placement": "front side outside guest circulation", "purpose": "vows and speeches", "priority": "recommended"}}
  ],
  "avLayering": [
    {{"type": "av_desk", "purpose": "livestream switching and audio monitoring with stage sightline", "priority": "recommended"}},
    {{"type": "cable_paths", "purpose": "protected runs away from main aisle and exits", "priority": "required"}}
  ],
  "professionalNotes": ["Use banquet seating with a clear processional aisle.", "Keep emergency exits and catering service paths clear."]
}}

Input: Medium conference for 120 attendees
Output:
{{
  "eventType": "conference",
  "layoutStyle": "classroom",
  "capacity": 120,
  "room": {{"width": 30, "depth": 46, "height": 4}},
  "layout": {{
    "seating": {{"type": "mixed", "rows": null, "columns": null, "tableCount": 20, "seatsPerTable": 4, "hasCentralAisle": true}},
    "stage": {{"enabled": true, "position": "front"}},
    "podium": {{"enabled": true}},
    "screen": {{"enabled": true}},
    "decor": {{"plants": false, "lighting": true}}
  }},
  "promptUnderstanding": {{"guestCount": 120, "layoutPreference": "classroom", "livestreamRequired": true, "indoorOutdoor": "inferred_indoor", "premiumLevel": "standard"}},
  "spacingRules": {{"mainAisleWidthM": 1.5, "tableSpacingM": 2.4, "rowSpacingM": 1.1, "frontClearanceM": 2.0, "emergencyExitClearanceM": 1.5}},
  "cameraPlan": [
    {{"role": "wide_camera", "placement": "rear center", "purpose": "speaker and room context", "priority": "recommended"}},
    {{"role": "speaker_closeup", "placement": "front side", "purpose": "presenter close-up", "priority": "optional"}}
  ],
  "avLayering": [
    {{"type": "screen", "purpose": "slides and remote audience visibility", "priority": "required"}},
    {{"type": "av_desk", "purpose": "audio, slides, and stream control", "priority": "recommended"}}
  ],
  "professionalNotes": ["Use classroom seating because attendees may take notes.", "Keep registration near entrance without blocking queues."]
}}

Input: Funeral setup for 80 people
Output:
{{
  "eventType": "funeral",
  "layoutStyle": "theatre",
  "capacity": 80,
  "room": {{"width": 22, "depth": 32, "height": 4}},
  "layout": {{
    "seating": {{"type": "rows", "rows": 10, "columns": 8, "tableCount": null, "seatsPerTable": null, "hasCentralAisle": true}},
    "stage": {{"enabled": true, "position": "front"}},
    "podium": {{"enabled": true}},
    "screen": {{"enabled": true}},
    "decor": {{"plants": true, "lighting": true}}
  }},
  "promptUnderstanding": {{"guestCount": 80, "layoutPreference": "theatre", "livestreamRequired": true, "indoorOutdoor": "inferred_indoor", "premiumLevel": "standard"}},
  "spacingRules": {{"mainAisleWidthM": 1.8, "tableSpacingM": 2.4, "rowSpacingM": 1.1, "frontClearanceM": 2.0, "emergencyExitClearanceM": 1.5}},
  "cameraPlan": [
    {{"role": "discreet_wide_camera", "placement": "rear center", "purpose": "ceremony livestream without intrusion", "priority": "recommended"}}
  ],
  "avLayering": [
    {{"type": "screen", "purpose": "tribute media", "priority": "recommended"}},
    {{"type": "av_desk", "purpose": "audio, music, and stream control", "priority": "optional"}}
  ],
  "professionalNotes": ["Keep the central aisle dignified and clear.", "Avoid placing cameras in family sightlines."]
}}

NOW PROCESS THIS INPUT:
{user_prompt}
""".strip()


def generate_scene_with_ollama(prompt: str):
    payload = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "prompt": build_scene_prompt(prompt),
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
            },
        }
    ).encode("utf-8")

    req = request.Request(
        f"{OLLAMA_BASE_URL}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        message = exc.read().decode("utf-8").strip()
        raise ValueError(message or "Ollama failed to generate a scene.") from exc
    except error.URLError as exc:
        raise ValueError("Could not reach Ollama. Make sure the local Ollama server is running.") from exc

    data = json.loads(body)
    content = data.get("response")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Ollama returned an empty scene response.")

    return extract_json_object(content)
