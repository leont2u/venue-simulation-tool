"use client";

import Link from "next/link";
import { DrawioImportSection } from "./UploadSection";
import { PromptLayoutSection } from "./PromptLayoutSection";

const FEATURES = [
  {
    icon: "✦",
    title: "Prompt to 3D",
    description:
      "Generate event layouts from natural language and open them directly in the editor.",
  },
  {
    icon: "⬚",
    title: "2D Import",
    description:
      "Bring in draw.io, XML, and HTML floorplans and convert them into editable 3D scenes.",
  },
  {
    icon: "◫",
    title: "Unified Editor",
    description:
      "Refine imports, AI layouts, and manual scenes inside the same 2D/3D workspace.",
  },
  {
    icon: "⌁",
    title: "Client Sharing",
    description:
      "Share read-only layouts and export floorplans while keeping the editing workflow internal.",
  },
];

const PIPELINES = [
  {
    number: "01",
    title: "Manual 3D Scene",
    description: "Start from scratch in the editor and build your venue manually.",
  },
  {
    number: "02",
    title: "XML to 3D",
    description: "Convert structured XML floor plans into room-aware 3D layouts.",
  },
  {
    number: "03",
    title: "draw.io to 3D",
    description: "Read layered draw.io geometry, labels, and measurements into your editor.",
  },
  {
    number: "04",
    title: "Prompt to 3D",
    description: "Use Ollama + Gemma3 to turn venue intent into editable 3D scenes.",
  },
];

export function Hero() {
  return (
    <div className="sf-shell">
      <section className="mx-auto max-w-[960px] px-6 pb-16 pt-24 text-center">
        <div className="inline-block rounded-full bg-[var(--sf-surface-muted)] px-3 py-1 text-[12px] font-medium text-[var(--sf-text-muted)]">
          3D venue design platform
        </div>

        <h1 className="mx-auto mt-6 max-w-[840px] text-[42px] leading-[1.08] font-semibold tracking-[-0.05em] text-[var(--sf-text)] md:text-[64px]">
          Turn 2D Floor Plans into
          <span className="text-[var(--sf-accent-blue)]"> SpaceForge-ready </span>
          3D Venue Scenes
        </h1>

        <p className="mx-auto mt-5 max-w-[700px] text-[17px] leading-8 text-[var(--sf-text-muted)]">
          Keep your current flow and backend, but operate it inside a cleaner
          planning experience: prompt generation, draw.io import, project
          storage, editing, sharing, and exports in one workflow.
        </p>

        <div id="launch" className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-[7px] bg-[var(--sf-text)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#333333]"
          >
            Open Workspace
          </Link>
          <a
            href="#prompt-studio"
            className="rounded-[7px] border border-[var(--sf-border-strong)] px-6 py-3 text-[14px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
          >
            Start with AI
          </a>
        </div>
      </section>

      <section id="prompt-studio" className="mx-auto max-w-[960px] px-6 pb-16">
        <PromptLayoutSection />
      </section>

      <section id="features" className="mx-auto max-w-[960px] px-6 pb-16">
        <h2 className="sf-title text-[22px] font-semibold">Why SpaceForge UI</h2>
        <p className="mt-2 text-[14px] text-[var(--sf-text-muted)]">
          Your existing venue simulation capabilities, reorganized into a more
          professional workflow shell.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="sf-panel p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--sf-surface-muted)] text-[18px]">
                {feature.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--sf-text)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[var(--sf-text-muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="pipelines" className="mx-auto max-w-[960px] px-6 pb-16">
        <h2 className="sf-title text-[22px] font-semibold">Pipelines</h2>
        <p className="mt-2 text-[14px] text-[var(--sf-text-muted)]">
          All four creation paths now point toward the same SpaceForge-style editor.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINES.map((pipeline) => (
            <div
              key={pipeline.number}
              className="cursor-default rounded-[8px] border border-[var(--sf-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sf-shadow-md)]"
            >
              <div className="font-mono text-[11px] font-medium tracking-[0.12em] text-[var(--sf-text-faint)]">
                {pipeline.number}
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-[var(--sf-text)]">
                {pipeline.title}
              </h3>
              <p className="mt-2 text-[12px] leading-6 text-[var(--sf-text-muted)]">
                {pipeline.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-6 pb-20">
        <DrawioImportSection />
      </section>
    </div>
  );
}
