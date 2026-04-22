import { extractJsonObject } from "@/lib/aiSceneSchema";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "gemma3";

function buildScenePrompt(userPrompt: string) {
  return `
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
{
  "eventType": string,
  "capacity": number,
  "room": {
    "width": number,
    "depth": number,
    "height": number
  },
  "layout": {
    "seating": {
      "type": "rows" | "round_tables" | "mixed",
      "rows": number | null,
      "columns": number | null,
      "tableCount": number | null,
      "seatsPerTable": number | null,
      "hasCentralAisle": boolean
    },
    "stage": {
      "enabled": boolean,
      "position": "front" | "center"
    },
    "podium": {
      "enabled": boolean
    },
    "screen": {
      "enabled": boolean
    },
    "decor": {
      "plants": boolean,
      "lighting": boolean
    }
  }
}

NOW PROCESS THIS INPUT:
${userPrompt}
`.trim();
}

export async function generateSceneWithOllama(prompt: string) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildScenePrompt(prompt),
      stream: false,
      format: "json",
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ollama failed to generate a scene.");
  }

  const data = await response.json();
  const content = data?.response;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Ollama returned an empty scene response.");
  }

  return extractJsonObject(content);
}
