"use client";

import { useRef, useState } from "react";
import { createProjectFromDrawioFile } from "@/lib/drawioImport";
import { generateProjectFromPrompt } from "@/lib/promptLayout";
import { upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";

type ProjectPipeline = "menu" | "upload" | "draw2d" | "prompt" | "draw3d";

export default function ProjectModal({
  open,
  onClose,
  onProjectCreated,
  onOpenProject,
}: {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: () => void | Promise<void>;
  onOpenProject: (projectId: string) => void;
}) {
  const [step, setStep] = useState<ProjectPipeline>("menu");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const resetState = () => {
    setStep("menu");
    setName("");
    setPrompt("");
    setFile(null);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const createBlankProject = (projectName: string): Project => {
    return {
      id: crypto.randomUUID(),
      name: projectName.trim() || "Untitled Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      room: {
        width: 20,
        depth: 14,
        height: 4,
      },
      items: [],
    };
  };

  const handleCreate3D = async () => {
    const project = createBlankProject(name || "New 3D Layout");
    setLoading(true);
    setError("");

    try {
      const savedProject = await upsertProject(project);
      await onProjectCreated?.();
      handleClose();
      onOpenProject(savedProject.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate2D = async () => {
    const project = createBlankProject(name || "New 2D Layout");
    setLoading(true);
    setError("");

    try {
      const savedProject = await upsertProject(project);
      await onProjectCreated?.();
      handleClose();
      onOpenProject(savedProject.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromPrompt = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const project = await generateProjectFromPrompt(prompt);
      const finalProject = {
        ...project,
        name: name.trim() || project.name || "Prompt Generated Project",
      };

      const savedProject = await upsertProject(finalProject);
      await onProjectCreated?.();
      handleClose();
      onOpenProject(savedProject.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate from prompt.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromFile = async () => {
    if (!file) {
      setError("Please select a .drawio, .xml, or .html file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const savedProject = await createProjectFromDrawioFile(file, name.trim());
      await onProjectCreated?.();
      handleClose();
      onOpenProject(savedProject.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import project file.",
      );
    } finally {
      setLoading(false);
    }
  };

  const PipelineCard = ({
    title,
    subtitle,
    onClick,
  }: {
    title: string;
    subtitle: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[8px] border border-[var(--sf-border)] bg-white p-4 text-left transition hover:border-[var(--sf-border-strong)] hover:shadow-[var(--sf-shadow)]"
    >
      <div className="flex h-11 w-11 flex-0 items-center justify-center rounded-[8px] bg-[var(--sf-surface-soft)] text-lg text-[var(--sf-text-muted)]">
        ⬢
      </div>

      <div>
        <div className="text-[14px] font-semibold text-[var(--sf-text)]">{title}</div>
        <div className="text-[12px] text-[var(--sf-text-muted)]">{subtitle}</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[12px] border border-[var(--sf-border)] bg-white p-6 shadow-[var(--sf-shadow-md)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
              {step === "menu" ? "Create a new project" : "Project Details"}
            </h2>
            <p className="mt-2 text-[13px] text-[var(--sf-text-muted)]">
              {step === "menu"
                ? "Choose how you want to build your venue layout."
                : "Complete the details below to continue."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {step !== "menu" && (
              <button
                onClick={() => {
                  setStep("menu");
                  setError("");
                  setLoading(false);
                }}
                className="rounded-[6px] border border-[var(--sf-border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-soft)] hover:text-[var(--sf-text)]"
            >
              ×
            </button>
          </div>
        </div>

        {step === "menu" && (
          <div className="grid gap-3">
            <PipelineCard
              title="Upload File"
              subtitle="XML, draw.io, or HTML"
              onClick={() => setStep("upload")}
            />

            <PipelineCard
              title="Draw 2D Layout"
              subtitle="Start with a blank canvas"
              onClick={() => setStep("draw2d")}
            />

            <PipelineCard
              title="Generate from Prompt"
              subtitle="Describe your venue"
              onClick={() => setStep("prompt")}
            />

            <PipelineCard
              title="Draw 3D Layout"
              subtitle="Start directly in 3D"
              onClick={() => setStep("draw3d")}
            />
          </div>
        )}

        {step === "upload" && (
          <div>
            <div className="text-[15px] font-semibold text-[var(--sf-text)]">
              Import from file
            </div>
            <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">
              Upload a structured floor plan file and convert it into an
              editable 3D project.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
            />

            <div className="mt-4 rounded-[8px] border border-dashed border-[var(--sf-border-strong)] bg-[var(--sf-surface-soft)] p-5">
              <div className="text-[13px] font-medium text-[var(--sf-text)]">
                Select .drawio, .xml, or exported .html
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".drawio,.xml,.html,.htm"
                className="mt-3 block w-full text-[13px] text-[var(--sf-text-muted)] file:mr-4 file:rounded-[6px] file:border-0 file:bg-[var(--sf-text)] file:px-4 file:py-2 file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="mt-3 text-[13px] font-medium text-[var(--sf-success)]">
                  Selected: {file.name}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleGenerateFromFile}
                disabled={loading}
                className="rounded-[6px] bg-[var(--sf-accent-blue)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate project"}
              </button>
            </div>
          </div>
        )}

        {step === "prompt" && (
          <div>
            <div className="text-[15px] font-semibold text-[var(--sf-text)]">
              Generate from prompt
            </div>
            <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">
              Describe the venue you want and generate a layout automatically.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Create a church event layout with 120 chairs..."
              className="mt-4 min-h-30 w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleGenerateFromPrompt}
                disabled={loading}
                className="rounded-[6px] bg-[var(--sf-accent-blue)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate project"}
              </button>
            </div>
          </div>
        )}

        {step === "draw3d" && (
          <div>
            <div className="text-[15px] font-semibold text-[var(--sf-text)]">
              Draw 3D layout
            </div>
            <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">
              Start with a blank 3D project and place venue elements manually.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleCreate3D}
                disabled={loading}
                className="rounded-[6px] bg-[var(--sf-text)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#333333] disabled:opacity-60"
              >
                {loading ? "Creating..." : "Open 3D editor"}
              </button>
            </div>
          </div>
        )}

        {step === "draw2d" && (
          <div>
            <div className="text-[15px] font-semibold text-[var(--sf-text)]">
              Draw 2D layout
            </div>
            <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">
              Start from a blank 2D canvas, then preview it in 3D.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleCreate2D}
                disabled={loading}
                className="rounded-[6px] bg-[var(--sf-text)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#333333] disabled:opacity-60"
              >
                {loading ? "Creating..." : "Open 2D canvas"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
