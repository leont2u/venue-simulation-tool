"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getProjects } from "@/lib/storage";
import { Project } from "@/types/types";
import ProjectModal from "@/components/dashboard/ProjectModal";
import ProjectPreviewCard from "@/components/dashboard/ProjectPreviewCard";

export default function DashboardPage() {
  const router = useRouter();
  const [projects] = useState<Project[]>(() => getProjects());
  const [open, setOpen] = useState(false);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-transparent px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-[#2F3E46]">
                Projects
              </h1>
              <p className="mt-3 text-xl text-[#52796F]">
                Manage your venue layouts
              </p>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#84A98C] px-6 py-4 text-base font-medium text-white transition hover:bg-[#52796F]"
            >
              <span className="text-xl leading-none">＋</span>
              <span>New project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-16 text-center shadow-[0_12px_40px_rgba(47,62,70,0.04)]">
              <div className="text-2xl font-semibold text-[#2F3E46]">
                No projects yet
              </div>
              <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-[#52796F]">
                Create your first venue project to start building layouts,
                importing floor plans, or generating scenes from prompts.
              </p>

              <button
                onClick={() => setOpen(true)}
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#84A98C] px-6 py-4 text-base font-medium text-white transition hover:bg-[#52796F]"
              >
                <span className="text-xl leading-none">＋</span>
                <span>Create first project</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectPreviewCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        <ProjectModal
          open={open}
          onClose={() => setOpen(false)}
          onOpenProject={(projectId) => router.push(`/editor/${projectId}`)}
        />
      </main>
    </ProtectedRoute>
  );
}
