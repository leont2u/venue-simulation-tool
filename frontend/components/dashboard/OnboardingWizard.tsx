"use client";

import { ProjectPipeline } from "@/components/dashboard/ProjectModal";
import {
  SpotlightTour,
  SpotlightTourStep,
} from "@/components/onboarding/SpotlightTour";

const TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "new-project",
    selector: '[data-tour="new-project"]',
    title: "Start here: create a new project",
    description:
      "This is the main launch point. From here, users can create a project manually, from a template, from a prompt, or from an imported floor plan.",
    accent: "#2563eb",
  },
  {
    id: "templates",
    selector: '[data-tour="templates-section"]',
    title: "Templates help users avoid starting from scratch",
    description:
      "This section gives first-time users polished venue starters. They can open a template, rename it, edit it, and save their own copy.",
    accent: "#16a34a",
    actionLabel: "Open template flow",
  },
  {
    id: "ai",
    selector: '[data-tour="ai-generate"]',
    title: "AI generation is the fastest route from idea to layout",
    description:
      "Users can describe the event in natural language and the system generates a structured room layout that opens in the editor.",
    accent: "#7c3aed",
    actionLabel: "Open AI flow",
  },
  {
    id: "imports",
    selector: '[data-tour="import-launch"]',
    title: "Import existing 2D plans instead of redrawing everything",
    description:
      "This lets users bring in draw.io, XML, or HTML floor plans and convert them into editable 3D-aware projects.",
    accent: "#ea580c",
    actionLabel: "Open import flow",
  },
];

const STEP_PIPELINES: Partial<Record<string, ProjectPipeline>> = {
  templates: "template",
  ai: "prompt",
  imports: "upload",
};

export function OnboardingWizard({
  open,
  onClose,
  onFinish,
  onLaunchPipeline,
}: {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  onLaunchPipeline: (pipeline: ProjectPipeline) => void;
}) {
  return (
    <SpotlightTour
      open={open}
      title="Dashboard Tour"
      steps={TOUR_STEPS.map((step) => ({
        ...step,
        onAction: STEP_PIPELINES[step.id]
          ? () => {
              onFinish();
              onLaunchPipeline(STEP_PIPELINES[step.id]!);
            }
          : undefined,
      }))}
      onClose={onClose}
      onFinish={onFinish}
    />
  );
}
