"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { savePendingPrompt } from "@/lib/pendingPrompt";
import { upsertProject } from "@/lib/storage";
import { generateProjectFromPrompt } from "@/lib/promptLayout";

const EXAMPLES = [
  "Wedding banquet layout for 200 guests",
  "Church funeral layout with central aisle",
  "Conference theatre seating with LED screens",
  "Boardroom layout for 18 executives",
];

export function PromptLayoutSection() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a layout prompt.");
      return;
    }

    if (!isAuthenticated) {
      savePendingPrompt(prompt.trim());
      router.push(
        `/login?next=${encodeURIComponent("/dashboard?resumePrompt=1")}`,
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const project = await generateProjectFromPrompt(prompt.trim());
      const savedProject = await upsertProject(project);

      router.push(`/editor/${savedProject.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate layout.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sf-panel overflow-hidden">
      <div className="border-b border-[var(--sf-border)] bg-[#fafafa] px-4 py-3">
        <div className="text-[13px] font-medium text-[var(--sf-text)]">
          Prompt-to-3D
        </div>
        <div className="mt-1 text-[12px] text-[var(--sf-text-muted)]">
          Natural language scene generation backed by your Django + Ollama flow.
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-[8px] border border-[var(--sf-border-strong)] transition focus-within:border-[var(--sf-text)]">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Conference layout for 80 people with stage, screen, podium, and a central aisle"
            className="min-h-[88px] w-full resize-none border-0 bg-white px-4 py-3 text-[14px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--sf-border)] bg-[#fafafa] px-4 py-3">
            <div className="text-[12px] text-[var(--sf-text-muted)]">
              Supported: weddings, funerals, churches, conferences, banquets, theatre, classroom, lounge
            </div>
            <div className="flex-1" />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-[6px] bg-[var(--sf-accent-blue)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Scene"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="sf-chip px-3 py-1.5 text-[12px] transition hover:bg-[#ebebeb] hover:text-[var(--sf-text)]"
            >
              {example}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
