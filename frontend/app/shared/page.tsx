"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { getSharedProjectByToken } from "@/lib/shareProject";
import { Project } from "@/types/types";

export default function SharedProjectPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("s") || "";
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("This shared layout link is missing data.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const nextProject = await getSharedProjectByToken(token);
        setProject(nextProject);
        setError("");
      } catch (nextError) {
        setProject(null);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "This shared layout could not be opened.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--sf-bg)] px-6">
        <div className="max-w-xl rounded-[12px] border border-[var(--sf-border)] bg-white p-8 shadow-[var(--sf-shadow-md)]">
          <div className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
            Loading shared layout...
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--sf-bg)] px-6">
        <div className="max-w-xl rounded-[12px] border border-[var(--sf-border)] bg-white p-8 shadow-[var(--sf-shadow-md)]">
          <div className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
            Shared layout unavailable
          </div>
          <p className="mt-3 text-[14px] leading-7 text-[var(--sf-text-muted)]">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-[6px] bg-[var(--sf-text)] px-5 py-3 text-[13px] font-medium text-white hover:bg-[#333333]"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--sf-bg)]">
      <div className="flex h-[52px] items-center justify-between border-b border-[var(--sf-border)] bg-white px-6">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
          {project.name}
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--sf-text-muted)]">
            View-only 3D preview for clients
          </p>
        </div>
        <Link
          href="/"
          className="rounded-[6px] border border-[var(--sf-border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
        >
          Open SpaceForge
        </Link>
      </div>

      <div className="h-[calc(100vh-52px)]">
        <SceneCanvas projectOverride={project} readOnly />
      </div>
    </main>
  );
}
