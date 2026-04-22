import { NextRequest, NextResponse } from "next/server";
import { validatePromptLayoutIntent } from "@/lib/aiSceneSchema";
import { generateSceneWithOllama } from "@/lib/ollama";
import { promptScenePlanToProject } from "@/lib/promptSceneMapper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return new NextResponse("Prompt is required.", { status: 400 });
    }

    const rawScene = await generateSceneWithOllama(prompt);
    const validatedIntent = validatePromptLayoutIntent(rawScene);
    const project = promptScenePlanToProject(validatedIntent);

    return NextResponse.json(project);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate scene.";

    return new NextResponse(message, { status: 500 });
  }
}
