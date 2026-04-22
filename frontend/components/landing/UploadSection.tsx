"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProject } from "@/lib/storage";
import { createProjectFromDrawioFile } from "@/lib/drawioImport";

export function DrawioImportSection() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!file) {
      setError("Please choose a .drawio, .xml, or exported .html file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const project = await createProjectFromDrawioFile(file);
      upsertProject(project);

      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import draw.io file.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManual = () => {
    router.push("/dashboard");
  };

  return (
    <section className="rounded-4xl border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_120px_rgba(73,210,77,0.05)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-semibold text-white">
          Start your project
        </h2>
        <p className="mt-4 text-lg leading-8 text-zinc-400">
          Upload a structured floor plan file and generate a 3D project, or
          start a new venue layout manually from your dashboard.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/2 p-6">
          <div className="text-lg font-medium text-white">Import from file</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Upload a .drawio, .xml, or exported .html file and convert it into
            an editable 3D layout.
          </p>

          <label className="mt-5 flex cursor-pointer flex-col rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-5 py-5 text-zinc-300 transition hover:border-green-400/40">
            <span className="text-sm font-medium text-white">
              Select .drawio, .xml, or exported .html
            </span>
            <span className="mt-1 text-xs text-zinc-500">
              Structured formats are more reliable for 2D to 3D conversion
            </span>

            <input
              type="file"
              accept=".drawio,.xml,.html,.htm"
              className="mt-4 text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-green-500 file:px-4 file:py-2 file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file ? (
              <span className="mt-3 text-sm text-green-400">{file.name}</span>
            ) : null}
          </label>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-5 rounded-xl bg-green-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate 3D"}
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/2 p-6">
          <div className="text-lg font-medium text-white">Create manually</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Start a project from scratch and build your venue layout directly in
            the 3D editor.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-5">
            <div className="text-sm font-medium text-white">
              Manual 3D workflow
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-500">
              Ideal when you want full control over layout placement, object
              movement, and scene composition.
            </p>
          </div>

          <button
            onClick={handleCreateManual}
            className="mt-5 rounded-xl border border-white/10 bg-white/4px-5 py-3 text-sm font-medium text-white transition hover:border-green-400/40 hover:bg-white/8"
          >
            Create New Project
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </section>
  );
}
