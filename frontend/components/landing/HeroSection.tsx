"use client";

import {
  ArrowRight,
  FileCode2,
  FileText,
  GitBranch,
  Paperclip,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createProjectFromVenueInput } from "@/lib/landingFlow";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/onboarding";
import { queueEditorTour } from "@/lib/onboardingTour";
import { savePendingVenueInput } from "@/lib/pendingVenueInput";
import { useRouter } from "next/navigation";

function formatFileKind(file: File | null) {
  if (!file) return "Attach";
  if (/\.drawio$/i.test(file.name)) return "draw.io";
  if (/\.html?$/i.test(file.name)) return "HTML";
  if (/\.xml$/i.test(file.name)) return "XML";
  return "File";
}

export function Hero() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { isAuthenticated, isHydrating, user } = useAuth();
  const [prompt, setPrompt] = useState(
    "Wedding for 200 guests with stage and livestream setup",
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasInput = Boolean(prompt.trim() || file);

  const createAndOpenProject = async () => {
    setLoading(true);
    setError("");
    const project = await createProjectFromVenueInput({ prompt, file });
    if (user?.email && !hasCompletedOnboarding(user.email)) {
      markOnboardingComplete(user.email);
      queueEditorTour();
    }
    router.push(`/editor/${project.id}`);
  };

  const runVenueFlow = async () => {
    if (!hasInput) {
      setError("Describe the venue, attach a layout file, or do both.");
      return;
    }

    if (!isAuthenticated) {
      await savePendingVenueInput(prompt.trim(), file);
      router.push(
        `/register?next=${encodeURIComponent("/dashboard?resumePrompt=1")}`,
      );
      return;
    }

    try {
      await createAndOpenProject();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create your venue.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-[calc(100vh-82px)] overflow-hidden bg-[#fbfcfb] px-5 text-[#17211e]">
      <div className="relative mx-auto flex w-full max-w-[990px] flex-col items-center pt-16 text-center lg:pt-20">
        <h1 className="mt-7 max-w-[820px] text-[56px] font-semibold leading-[1.04] tracking-[-0.03em] text-[#17211e] md:text-[70px]">
          Simulate any venue from
          <span className="block text-[#5d6561]">a single prompt.</span>
        </h1>

        <p className="mt-6 max-w-[740px] text-[20px] leading-8 text-[#4e6962]">
          Describe your event or upload a floorplan. Venue Sim turns it into an
          editable 3D venue with seating, cameras, and livestream coverage in
          minutes.
        </p>
        <p className="mt-4 text-[15px] text-[#7a8984]">
          Perfect for weddings, conferences, livestream events, churches,
          funerals, and corporate productions.
        </p>

        <div className="mt-10 w-full max-w-[790px] rounded-[14px] border border-[#e0e8e5] bg-white/92 p-4 text-left shadow-[0_18px_48px_rgba(72,93,87,0.12)]">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="text-[13px] text-[#697a75]">
              Describe your event or upload a layout
            </span>
            <div className="flex-1" />
            <span className="hidden items-center gap-1 text-[12px] text-[#7c8a86] sm:flex">
              <kbd className="rounded border border-[#dfe7e4] px-1.5 py-0.5">
                ⌘
              </kbd>
              <kbd className="rounded border border-[#dfe7e4] px-1.5 py-0.5">
                ↵
              </kbd>
              to continue
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void runVenueFlow();
              }
            }}
            placeholder="Wedding for 200 guests with stage and livestream setup"
            className="min-h-[118px] w-full resize-none rounded-[10px] border-0 bg-white px-2 py-2 text-[16px] leading-7 text-[#161d1b] placeholder:text-[#96a39f]"
          />

          {file ? (
            <div className="mx-1 mb-3 flex items-center justify-between rounded-[8px] border border-[#dfe8e4] bg-[#f7faf9] px-3 py-2 text-[13px] text-[#536c64]">
              <span className="min-w-0 truncate">
                {formatFileKind(file)} attached: {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove attached file"
                className="ml-3 rounded-full p-1 hover:bg-[#e9f2ef]"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-[#edf1ef] px-1 pt-3">
            <input
              ref={fileRef}
              type="file"
              accept=".drawio,.xml,.html,.htm"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-[7px] px-3 py-2 text-[13px] font-medium text-[#425f56] transition hover:bg-[#eef5f2]"
            >
              <Paperclip size={17} />
              Attach
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-2 text-[12px] font-medium text-[#5c6d68] transition hover:bg-[#f2f6f4]"
            >
              <FileCode2 size={14} /> XML
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-2 text-[12px] font-medium text-[#5c6d68] transition hover:bg-[#f2f6f4]"
            >
              <GitBranch size={14} /> draw.io
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-2 text-[12px] font-medium text-[#5c6d68] transition hover:bg-[#f2f6f4]"
            >
              <FileText size={14} /> HTML
            </button>

            <div className="flex-1" />
            <button
              type="button"
              onClick={() => void runVenueFlow()}
              disabled={loading || isHydrating}
              className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-[8px] bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61] disabled:opacity-60"
            >
              {loading ? "Working..." : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>

          {error ? (
            <div className="mt-3 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
