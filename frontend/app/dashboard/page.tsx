"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { clearPendingPrompt, readPendingPrompt, savePendingPrompt } from "@/lib/pendingPrompt";
import { generateProjectFromPrompt } from "@/lib/promptLayout";
import { getProjects, upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";
import ProjectModal from "@/components/dashboard/ProjectModal";
import ProjectPreviewCard from "@/components/dashboard/ProjectPreviewCard";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isResumingPrompt, setIsResumingPrompt] = useState(false);
  const resumeAttemptedRef = useRef(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setProjects(await getProjects());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const shouldResumePrompt = searchParams.get("resumePrompt") === "1";
    if (!shouldResumePrompt || resumeAttemptedRef.current) {
      return;
    }

    const prompt = readPendingPrompt().trim();
    if (!prompt) {
      resumeAttemptedRef.current = true;
      router.replace("/dashboard");
      return;
    }

    resumeAttemptedRef.current = true;

    const resume = async () => {
      try {
        setIsResumingPrompt(true);
        setError("");
        clearPendingPrompt();
        const project = await generateProjectFromPrompt(prompt);
        const savedProject = await upsertProject(project);
        router.replace(`/editor/${savedProject.id}`);
      } catch (err) {
        savePendingPrompt(prompt);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate layout from your saved prompt.",
        );
        router.replace("/dashboard");
      } finally {
        setIsResumingPrompt(false);
      }
    };

    void resume();
  }, [router, searchParams]);

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

            <div className="mt-8 flex items-center gap-3">
              <div className="hidden rounded-2xl bg-white px-4 py-3 text-sm text-[#52796F] shadow-[0_12px_30px_rgba(47,62,70,0.04)] md:block">
                {user?.email}
              </div>
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-3 rounded-2xl bg-[#84A98C] px-6 py-4 text-base font-medium text-white transition hover:bg-[#52796F]"
              >
                <span className="text-xl leading-none">＋</span>
                <span>New project</span>
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-4 text-base font-medium text-[#52796F] transition hover:bg-[#F7F8F5] hover:text-[#2F3E46]"
              >
                Logout
              </button>
            </div>
          </div>

          {isResumingPrompt ? (
            <div className="rounded-[28px] border border-black/5 bg-white p-16 text-center shadow-[0_12px_40px_rgba(47,62,70,0.04)]">
              <div className="text-2xl font-semibold text-[#2F3E46]">
                Generating your layout...
              </div>
              <p className="mt-3 text-base text-[#52796F]">
                We picked up your prompt after login and are building the scene now.
              </p>
            </div>
          ) : loading ? (
            <div className="rounded-[28px] border border-black/5 bg-white p-16 text-center shadow-[0_12px_40px_rgba(47,62,70,0.04)]">
              <div className="text-2xl font-semibold text-[#2F3E46]">
                Loading projects...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
              {error}
            </div>
          ) : projects.length === 0 ? (
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
          onProjectCreated={loadProjects}
          onOpenProject={(projectId) => router.push(`/editor/${projectId}`)}
        />
      </main>
    </ProtectedRoute>
  );
}
