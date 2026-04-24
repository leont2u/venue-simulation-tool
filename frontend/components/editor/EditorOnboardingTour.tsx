"use client";

import { SpotlightTour, SpotlightTourStep } from "@/components/onboarding/SpotlightTour";

const EDITOR_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "canvas",
    selector: '[data-tour="editor-canvas"]',
    title: "Start editing from the 2D floorplan",
    description:
      "This central canvas is the fastest way to move objects around and resize the room. Changes here immediately update the 3D scene.",
    accent: "#2563eb",
  },
  {
    id: "assets",
    selector: '[data-tour="editor-assets"]',
    title: "Use the compact asset rail to place furniture and AV gear",
    description:
      "Pick a tool, then click or drag assets into the layout. Chairs, tables, stages, cameras, speakers, and desks all come from this library.",
    accent: "#16a34a",
  },
  {
    id: "view-toggle",
    selector: '[data-tour="editor-view-toggle"]',
    title: "Switch between 2D precision and 3D preview",
    description:
      "Stay in 2D while arranging the room, then jump into 3D to inspect walls, materials, furniture, and cable runs from a realistic angle.",
    accent: "#7c3aed",
  },
  {
    id: "layer-toggle",
    selector: '[data-tour="editor-layer-toggle"]',
    title: "Toggle between layout planning and AV planning",
    description:
      "Use Layout for room elements, AV Layer for cameras and speakers, or Combined when you want to see the full production setup together.",
    accent: "#ea580c",
  },
  {
    id: "properties",
    selector: '[data-tour="editor-properties"]',
    title: "Refine the room from the right-side properties panel",
    description:
      "Adjust room dimensions, wall height, materials, exports, and scene details here without leaving the editor.",
    accent: "#0f766e",
  },
];

export function EditorOnboardingTour({
  open,
  onClose,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
}) {
  return (
    <SpotlightTour
      open={open}
      title="Editor Tour"
      steps={EDITOR_TOUR_STEPS}
      onClose={onClose}
      onFinish={onFinish}
    />
  );
}
