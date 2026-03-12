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

  return (
    <section className="mx-auto mt-16 w-full max-w-5xl rounded-[32px] border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_120px_rgba(73,210,77,0.05)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-semibold text-white md:text-4xl">
          Import Draw.io / XML / HTML
        </h2>
        <p className="mt-4 text-lg leading-8 text-zinc-400">
          Upload a structured floor plan file and generate a 3D project from it
          without changing your current manual editor workflow.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_auto]">
        <label className="flex cursor-pointer flex-col rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 px-5 py-5 text-zinc-300 transition hover:border-green-400/40">
          <span className="text-base font-medium text-white">
            Select .drawio, .xml, or exported .html
          </span>
          <span className="mt-1 text-sm text-zinc-500">
            Best for version 2 conversion into editable 3D layouts
          </span>
          <input
            type="file"
            accept=".drawio,.xml,.html,.htm"
            className="mt-4 text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-green-500 file:px-4 file:py-2 file:text-white"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <span className="mt-3 text-sm text-green-400">{file.name}</span>
          )}
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-2xl bg-green-500 px-8 py-5 text-lg font-medium text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate 3D project"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}
