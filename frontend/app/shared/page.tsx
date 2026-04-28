"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Expand, Eye } from "lucide-react";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { CommentsPanel } from "@/components/shared/CommentsPanel";
import { getSharedProjectByToken } from "@/lib/shareProject";
import { Project, SceneSettings } from "@/types/types";

function SharedProjectContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("s") || "";
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const updateViewerSettings = (patch: Partial<SceneSettings>) => {
    setProject((current) =>
      current
        ? {
            ...current,
            sceneSettings: {
              showGrid: true,
              enableHdri: true,
              ambientLightIntensity: 1.1,
              directionalLightIntensity: 2.1,
              snapToGrid: true,
              livestreamMode: false,
              wallThickness: current.room.wallThickness ?? 0.15,
              wallColor: "#F6F2EC",
              floorColor: "#F4F1EA",
              floorMaterial: "Wood",
              ...current.sceneSettings,
              ...patch,
            },
          }
        : current,
    );
  };

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

  const cameraMode = project.sceneSettings?.cameraMode ?? "orbit";
  const presentationMode = project.sceneSettings?.presentationMode === true;

  return (
    <main className="flex min-h-screen flex-col bg-[var(--sf-bg)]">
      <div
        className={`h-[52px] items-center justify-between border-b border-[var(--sf-border)] bg-white px-6 ${
          presentationMode ? "hidden" : "flex"
        }`}
      >
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

      <div
        className={`flex min-h-0 ${
          presentationMode ? "h-screen" : "h-[calc(100vh-52px)]"
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <div className="absolute right-5 top-4 z-20 flex items-center gap-2">
            <button
              onClick={() =>
                updateViewerSettings({
                  cameraMode: cameraMode === "walkthrough" ? "orbit" : "walkthrough",
                })
              }
              className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[12px] font-bold shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${
                cameraMode === "walkthrough"
                  ? "border-[#5d7f73] bg-[#5d7f73] text-white"
                  : "border-[#e5e9e6] bg-white text-[#64736f]"
              }`}
            >
              <Eye className="h-4 w-4" />
              Walk
            </button>
            <button
              onClick={() =>
                updateViewerSettings({
                  presentationMode: !presentationMode,
                  cameraMode: !presentationMode ? "walkthrough" : "orbit",
                  showGrid: presentationMode,
                })
              }
              className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[12px] font-bold shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${
                presentationMode
                  ? "border-[#242a28] bg-[#242a28] text-white"
                  : "border-[#e5e9e6] bg-white text-[#64736f]"
              }`}
            >
              <Expand className="h-4 w-4" />
              {presentationMode ? "Exit" : "Present"}
            </button>
          </div>

          <SceneCanvas projectOverride={project} readOnly />

          <div className="pointer-events-none absolute bottom-5 left-6 max-w-[min(520px,calc(100%-2rem))] rounded-[10px] bg-white/92 px-3 py-2 text-[11px] font-medium leading-5 text-[#687773] shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
            {cameraMode === "walkthrough"
              ? "Walk mode: click the scene to enter · WASD/arrows move · Q/E turn · R looks back · Esc exits."
              : "Orbit mode: drag to rotate · scroll to zoom · right-drag or shift-drag to pan · use Walk for first-person navigation."}
          </div>
        </div>
        {presentationMode ? null : <CommentsPanel token={token} />}
      </div>
    </main>
  );
}

export default function SharedProjectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--sf-bg)] px-6">
          <div className="max-w-xl rounded-[12px] border border-[var(--sf-border)] bg-white p-8 shadow-[var(--sf-shadow-md)]">
            <div className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
              Loading shared layout...
            </div>
          </div>
        </main>
      }
    >
      <SharedProjectContent />
    </Suspense>
  );
}
