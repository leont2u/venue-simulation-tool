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
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8F5] px-6">
        <div className="max-w-xl rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_20px_60px_rgba(47,62,70,0.08)]">
          <div className="text-2xl font-semibold text-[#2F3E46]">
            Loading shared layout...
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8F5] px-6">
        <div className="max-w-xl rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_20px_60px_rgba(47,62,70,0.08)]">
          <div className="text-2xl font-semibold text-[#2F3E46]">
            Shared layout unavailable
          </div>
          <p className="mt-3 text-[#52796F]">{error}</p>
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
          {project.name}
        </div>
        <p className="mt-1 text-sm text-[#52796F]">
          View-only 3D preview for clients
        </p>
      </div>

      <div className="h-[calc(100vh-81px)]">
        <SceneCanvas projectOverride={project} readOnly />
      </div>
    </main>
  );
}
