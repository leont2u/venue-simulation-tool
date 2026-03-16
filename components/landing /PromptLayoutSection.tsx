"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProject } from "@/lib/storage";
import { generateProjectFromPrompt } from "@/lib/promptLayout";

export function PromptLayoutSection() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a layout prompt.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const project = await generateProjectFromPrompt(prompt);
      upsertProject(project);

      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate layout.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(47,62,70,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your venue layout..."
          className="min-h-16 flex-1 resize-none rounded-2xl px-5 py-4 text-[#2F3E46] placeholder:text-[#52796F]"
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex h-12 w-12 items-center justify-center self-center rounded-full bg-[#84A98C] text-xl font-medium text-white transition hover:bg-[#52796F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "..." : "→"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
