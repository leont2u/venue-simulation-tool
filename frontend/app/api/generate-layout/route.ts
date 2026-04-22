import { NextRequest, NextResponse } from "next/server";
import { LayoutPlan } from "@/types/types";

function buildMockLayoutPlan(prompt: string): LayoutPlan {
  const lower = prompt.toLowerCase();

  const hasChurch = lower.includes("church");
  const hasConference = lower.includes("conference");
  const hasPiano = lower.includes("piano");
  const hasPodium = lower.includes("podium");
  const hasScreen = lower.includes("screen");
  const hasTv = lower.includes("tv");
  const hasCamera = lower.includes("camera");
  const hasAltar = lower.includes("altar");

  let chairCount = 80;
  const countMatch = lower.match(/(\d+)\s+chairs?/);
  if (countMatch) {
    chairCount = Math.max(10, Number(countMatch[1]));
  }

  const colsLeft = Math.floor(chairCount / 2 / 6);
  const colsRight = Math.ceil(chairCount / 2 / 6);

  const baseItems: LayoutPlan["items"] = [];

  if (hasChurch || hasAltar) {
    baseItems.push({
      type: "altar",
      x: 0,
      z: -6.4,
      rotationY: 0,
      label: "Altar",
    });
  }

  if (hasPodium || hasChurch || hasConference) {
    baseItems.push({
      type: "podium",
      x: 0,
      z: -5.2,
      rotationY: 0,
      label: "Main Podium",
    });
  }

  if (hasScreen || hasConference || hasChurch) {
    baseItems.push({
      type: "screen",
      x: 0,
      z: -7.2,
      rotationY: 0,
      label: "LED Screen",
    });
  }

  if (hasPiano) {
    baseItems.push({
      type: "piano",
      x: 5.4,
      z: -5.7,
      rotationY: 0,
      label: "Piano",
    });
  }

  if (hasTv) {
    baseItems.push({
      type: "tv",
      x: 8,
      z: -3.5,
      rotationY: 0,
      label: "TV",
    });
  }

  if (hasCamera || hasChurch || hasConference) {
    baseItems.push(
      {
        type: "camera",
        x: -8.5,
        z: 6.8,
        rotationY: 0.3,
        label: "Camera 1",
      },
      {
        type: "camera",
        x: 8.5,
        z: 6.8,
        rotationY: -0.3,
        label: "Camera 2",
      },
    );
  }

  return {
    projectName: hasChurch
      ? "Church Event Layout"
      : hasConference
        ? "Conference Venue Layout"
        : "Prompt Generated Venue",
    room: {
      width: 24,
      depth: 18,
      height: 4,
    },
    chairBlocks: [
      {
        label: "Left Seating",
        rows: 6,
        cols: Math.max(4, colsLeft),
        startX: -7.5,
        startZ: -2.5,
        spacingX: 0.85,
        spacingZ: 1.1,
        rotationY: 0,
      },
      {
        label: "Right Seating",
        rows: 6,
        cols: Math.max(4, colsRight),
        startX: 1.8,
        startZ: -2.5,
        spacingX: 0.85,
        spacingZ: 1.1,
        rotationY: 0,
      },
    ],
    items: baseItems,
  };
}

async function buildOpenAIPlan(prompt: string): Promise<LayoutPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockLayoutPlan(prompt);
  }

  const systemPrompt = `
You are generating a venue layout plan for a 3D venue editor.

Return ONLY valid JSON.
Do not wrap the response in markdown.
Do not include explanations.

Use this exact schema:
{
  "projectName": string,
  "room": {
    "width": number,
    "depth": number,
    "height": number
  },
  "chairBlocks": [
    {
      "label": string,
      "rows": number,
      "cols": number,
      "startX": number,
      "startZ": number,
      "spacingX": number,
      "spacingZ": number,
      "rotationY": number,
      "aisleAfterCol": number,
      "aisleWidth": number
    }
  ],
  "items": [
    {
      "type": "chair" | "desk" | "podium" | "piano" | "camera" | "altar" | "screen" | "tv",
      "x": number,
      "z": number,
      "rotationY": number,
      "label": string
    }
  ]
}

Rules:
- Prefer chairBlocks for repeated seating instead of individual chair items.
- Keep room sizes realistic.
- Keep items inside the room.
- Use meters.
- Use rotationY in radians.
- Return only valid JSON.
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return buildMockLayoutPlan(prompt);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    return buildMockLayoutPlan(prompt);
  }

  try {
    return JSON.parse(content) as LayoutPlan;
  } catch {
    return buildMockLayoutPlan(prompt);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return new NextResponse("Prompt is required.", { status: 400 });
    }

    const plan = await buildOpenAIPlan(prompt);
    return NextResponse.json(plan);
  } catch {
    return new NextResponse("Failed to generate layout.", { status: 500 });
  }
}
