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
  onOpenProject,
}: {
  open: boolean;
  onClose: () => void;
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

  const handleCreate3D = () => {
    const project = createBlankProject(name || "New 3D Layout");
    upsertProject(project);
    handleClose();
    onOpenProject(project.id);
  };

  const handleCreate2D = () => {
    const project = createBlankProject(name || "New 2D Layout");
    upsertProject(project);
    handleClose();
    onOpenProject(project.id);
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

      upsertProject(finalProject);
      handleClose();
      onOpenProject(finalProject.id);
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

      const importedProject = await createProjectFromDrawioFile(file);
      const finalProject = {
        ...importedProject,
        name: name.trim() || importedProject.name || "Imported Project",
      };

      upsertProject(finalProject);
      handleClose();
      onOpenProject(finalProject.id);
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
      className="flex w-full items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:border-[#84A98C] hover:bg-[#F7F8F5]"
    >
      <div className="flex h-12 w-12 flex-0 items-center justify-center rounded-xl bg-[#F1F4EF] text-xl text-[#52796F]">
        ⬢
      </div>

      <div>
        <div className="text-base font-semibold text-[#2F3E46]">{title}</div>
        <div className="text-sm text-[#52796F]">{subtitle}</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-[#FCFCFA] p-6 shadow-[0_30px_100px_rgba(47,62,70,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#2F3E46]">
              {step === "menu" ? "Create a new project" : "Project Details"}
            </h2>
            <p className="mt-1 text-sm text-[#52796F]">
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
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-[#354F52] transition hover:bg-[#F1F4EF]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-[#52796F] transition hover:bg-black/5 hover:text-[#2F3E46]"
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
            <div className="text-lg font-semibold text-[#2F3E46]">
              Import from file
            </div>
            <p className="mt-1 text-sm text-[#52796F]">
              Upload a structured floor plan file and convert it into an
              editable 3D project.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#2F3E46] placeholder:text-[#52796F]"
            />

            <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-[#F7F8F5] p-5">
              <div className="text-sm font-medium text-[#2F3E46]">
                Select .drawio, .xml, or exported .html
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".drawio,.xml,.html,.htm"
                className="mt-3 block w-full text-sm text-[#52796F] file:mr-4 file:rounded-lg file:border-0 file:bg-[#84A98C] file:px-4 file:py-1.5 file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="mt-3 text-sm font-medium text-[#52796F]">
                  Selected: {file.name}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleGenerateFromFile}
                disabled={loading}
                className="rounded-xl bg-[#84A98C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#52796F] disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate project"}
              </button>
            </div>
          </div>
        )}

        {step === "prompt" && (
          <div>
            <div className="text-lg font-semibold text-[#2F3E46]">
              Generate from prompt
            </div>
            <p className="mt-1 text-sm text-[#52796F]">
              Describe the venue you want and generate a layout automatically.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#2F3E46] placeholder:text-[#52796F]"
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Create a church event layout with 120 chairs..."
              className="mt-4 min-h-30 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#2F3E46] placeholder:text-[#52796F]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleGenerateFromPrompt}
                disabled={loading}
                className="rounded-xl bg-[#84A98C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#52796F] disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate project"}
              </button>
            </div>
          </div>
        )}

        {step === "draw3d" && (
          <div>
            <div className="text-lg font-semibold text-[#2F3E46]">
              Draw 3D layout
            </div>
            <p className="mt-1 text-sm text-[#52796F]">
              Start with a blank 3D project and place venue elements manually.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#2F3E46] placeholder:text-[#52796F]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleCreate3D}
                className="rounded-xl bg-[#84A98C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#52796F]"
              >
                Open 3D editor
              </button>
            </div>
          </div>
        )}

        {step === "draw2d" && (
          <div>
            <div className="text-lg font-semibold text-[#2F3E46]">
              Draw 2D layout
            </div>
            <p className="mt-1 text-sm text-[#52796F]">
              Start from a blank 2D canvas, then preview it in 3D.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#2F3E46] placeholder:text-[#52796F]"
            />

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleCreate2D}
                className="rounded-xl bg-[#84A98C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#52796F]"
              >
                Open 2D canvas
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
