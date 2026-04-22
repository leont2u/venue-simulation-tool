"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import {
  decodeProjectFromShare,
  getSharedProjectByToken,
} from "@/lib/shareProject";

export default function SharedProjectPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("s") || "";
  const embeddedData = searchParams.get("data") || "";

  const result = useMemo(() => {
    if (token) {
      const project = getSharedProjectByToken(token);

      if (project) {
        return { project, error: "" };
      }
    }

    if (!embeddedData) {
      return { project: null, error: "This shared layout link is missing data." };
    }

    try {
      return { project: decodeProjectFromShare(embeddedData), error: "" };
    } catch (error) {
      return {
        project: null,
        error:
          error instanceof Error
            ? error.message
            : "This shared layout could not be opened.",
      };
    }
  }, [embeddedData, token]);

  if (!result.project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8F5] px-6">
        <div className="max-w-xl rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_20px_60px_rgba(47,62,70,0.08)]">
          <div className="text-2xl font-semibold text-[#2F3E46]">
            Shared layout unavailable
          </div>
          <p className="mt-3 text-[#52796F]">{result.error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-[#84A98C] px-5 py-3 text-sm font-medium text-white hover:bg-[#52796F]"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F7F8F5]">
      <div className="border-b border-black/5 bg-white px-6 py-4">
        <div className="text-2xl font-semibold text-[#2F3E46]">
          {result.project.name}
        </div>
        <p className="mt-1 text-sm text-[#52796F]">
          View-only 3D preview for clients
        </p>
      </div>

      <div className="h-[calc(100vh-81px)]">
        <SceneCanvas projectOverride={result.project} readOnly />
      </div>
    </main>
  );
}
