"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createProjectFromDrawioFile } from "@/lib/drawioImport";

export function DrawioImportSection() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
      return;
    }

    if (!file) {
      setError("Please choose a .drawio, .xml, or exported .html file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const savedProject = await createProjectFromDrawioFile(file);
      router.push(`/editor/${savedProject.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import draw.io file.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="sf-panel p-6">
        <div className="text-[15px] font-semibold text-[var(--sf-text)]">
          Import 2D Layout
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[var(--sf-text-muted)]">
          Upload `.drawio`, `.xml`, or exported `.html` floor plans and convert
          them into editable 3D scenes with your backend import pipeline.
        </p>

        <label className="mt-5 block cursor-pointer rounded-[8px] border-2 border-dashed border-[var(--sf-border-strong)] bg-[var(--sf-surface-soft)] px-5 py-6 transition hover:border-[var(--sf-accent-blue)] hover:bg-[#eff6ff]">
          <div className="text-[14px] font-medium text-[var(--sf-text)]">
            Select a layout file
          </div>
          <div className="mt-1 text-[12px] text-[var(--sf-text-muted)]">
            Structured draw.io exports produce the best object placement.
          </div>

          <input
            type="file"
            accept=".drawio,.xml,.html,.htm"
            className="mt-4 block w-full text-[13px] text-[var(--sf-text-muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--sf-text)] file:px-3 file:py-2 file:text-white"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {["DRAWIO", "XML", "HTML"].map((format) => (
              <span
                key={format}
                className="rounded-[4px] border border-[var(--sf-border)] bg-white px-2 py-1 font-mono text-[11px] text-[var(--sf-text-muted)]"
              >
                {format}
              </span>
            ))}
          </div>

          {file ? (
            <div className="mt-4 text-[13px] font-medium text-[var(--sf-success)]">
              {file.name}
            </div>
          ) : null}
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-5 rounded-[6px] bg-[var(--sf-accent-blue)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {loading ? "Importing..." : "Convert to 3D"}
        </button>
      </div>

      <div className="sf-panel p-6">
        <div className="text-[15px] font-semibold text-[var(--sf-text)]">
          Manual Creation
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[var(--sf-text-muted)]">
          Jump directly into your editor shell and build layouts from scratch in
          2D or 3D using the same project flow you already have.
        </p>

        <div className="mt-5 rounded-[8px] border border-[var(--sf-border)] bg-[var(--sf-surface-soft)] p-5">
          <div className="text-[13px] font-medium text-[var(--sf-text)]">
            SpaceForge editor workflow
          </div>
          <p className="mt-2 text-[12px] leading-6 text-[var(--sf-text-muted)]">
            Asset library, transform tools, prompt generation, draw.io import,
            save, share, export, and client-safe read-only viewing.
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-5 rounded-[6px] border border-[var(--sf-border-strong)] px-4 py-2 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
        >
          Open Workspace
        </button>
      </div>

      {error ? (
        <div className="md:col-span-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      ) : null}
    </section>
  );
}
