import json
import os
from urllib import error, request

from .schemas import extract_json_object


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3").strip()


def build_scene_prompt(user_prompt: str):
    return f"""
You are an AI layout planner for a 3D scene generation system.

IMPORTANT:
You DO NOT generate 3D coordinates.
You DO NOT place objects in space.
You ONLY describe layout intent in a structured JSON format.

Your output will be used by a deterministic layout engine that handles positioning.

TASK:
Convert a user prompt into a clean layout description.

STRICT RULES:
- Return ONLY a valid JSON object.
- Do NOT include x, y, z, rotation, scale, or assetUrl.
- Do NOT include explanations, markdown, or extra text.
- Use ONLY the schema below.
- If a value is unknown, make a reasonable assumption.
- Be consistent and realistic with capacity.

SUPPORTED VALUES:
- eventType: "conference" | "wedding" | "funeral" | "church"
- seatingLayout: "rows" | "round_tables" | "mixed"

OUTPUT SCHEMA:
{{
  "eventType": string,
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
  }}
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
