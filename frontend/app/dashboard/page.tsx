"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import {
  clearPendingPrompt,
  readPendingPrompt,
  savePendingPrompt,
} from "@/lib/pendingPrompt";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/onboarding";
import { PROJECT_TEMPLATES } from "@/lib/projectTemplates";
import { generateProjectFromPrompt } from "@/lib/promptLayout";
import { getProjects, upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";
import ProjectModal, { ProjectPipeline } from "@/components/dashboard/ProjectModal";
import ProjectPreviewCard from "@/components/dashboard/ProjectPreviewCard";

const SIDEBAR_SECTIONS = [
  {
    title: "Workspace",
    items: ["Projects", "AI Studio", "Imports", "Shared Links"],
  },
  {
    title: "Library",
    items: ["Assets", "Templates", "Favorites"],
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [projectModalStep, setProjectModalStep] = useState<ProjectPipeline>("menu");
  const [continueTourInEditor, setContinueTourInEditor] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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
    if (!user?.email || loading || isResumingPrompt) return;
    if (projects.length > 0) return;
    if (hasCompletedOnboarding(user.email)) return;

    setShowOnboarding(true);
  }, [isResumingPrompt, loading, projects.length, user?.email]);

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

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(query) ||
        `${project.room.width}x${project.room.depth}`.includes(query)
      );
    });
  }, [projects, search]);

  const projectCount = projects.length;
  const assetCount = projects.reduce((sum, project) => sum + project.items.length, 0);
  const importCount = projects.filter((project) =>
    /drawio|import|xml|html/i.test(project.name),
  ).length;

  const openProjectCreation = useCallback((
    initialStep: ProjectPipeline = "menu",
    continueIntoEditor = false,
  ) => {
    setProjectModalStep(initialStep);
    setContinueTourInEditor(continueIntoEditor);
    setOpen(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    if (user?.email) {
      markOnboardingComplete(user.email);
    }
    setShowOnboarding(false);
  }, [user?.email]);

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col bg-[var(--sf-bg)]">
        <div className="flex h-[52px] items-center gap-4 border-b border-[var(--sf-border)] bg-white px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--sf-text)] text-[10px] font-semibold text-white">
              SF
            </div>
            <div className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
              SpaceForge
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {["Dashboard", "Projects", "Editor"].map((tab, index) => (
              <div
                key={tab}
                className={`rounded-md px-3 py-1.5 text-[13px] ${
                  index === 0
                    ? "bg-[var(--sf-surface-muted)] font-medium text-[var(--sf-text)]"
                    : "text-[var(--sf-text-muted)]"
                }`}
              >
                {tab}
              </div>
            ))}
          </div>

          <div className="flex-1" />

          <div className="text-[12px] text-[var(--sf-text-muted)]">{user?.email}</div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="rounded-[6px] border border-[var(--sf-border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
          >
            Onboarding
          </button>
          <button
            onClick={logout}
            className="rounded-[6px] border border-[var(--sf-border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
          >
            Logout
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="sf-scroll hidden w-[220px] shrink-0 overflow-y-auto border-r border-[var(--sf-border)] bg-white px-3 py-4 lg:block">
            {SIDEBAR_SECTIONS.map((section) => (
              <div key={section.title} className="mb-5">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sf-text-faint)]">
                  {section.title}
                </div>
                <div className="mt-1 space-y-1">
                  {section.items.map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-[6px] px-3 py-2 text-[13px] ${
                        section.title === "Workspace" && index === 0
                          ? "bg-[var(--sf-surface-muted)] font-medium text-[var(--sf-text)]"
                          : "text-[var(--sf-text-muted)]"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <section className="sf-scroll min-w-0 flex-1 overflow-y-auto p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
                  Projects
                </h1>
                <p className="mt-1 text-[14px] text-[var(--sf-text-muted)]">
                  Manage venue scenes, imports, prompt generation, and sharing from one workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-[6px] border border-[var(--sf-border)] bg-[var(--sf-surface-soft)] px-3 py-2">
                  <span className="text-[13px] text-[var(--sf-text-faint)]">⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search projects"
                    className="bg-transparent text-[13px] text-[var(--sf-text)] placeholder:text-[var(--sf-text-faint)]"
                  />
                </div>
                <button
                  onClick={() => openProjectCreation()}
                  data-tour="new-project"
                  className="rounded-[6px] bg-[var(--sf-text)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#333333]"
                >
                  New Project
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3">
              <div className="sf-panel p-4">
                <div className="text-[12px] text-[var(--sf-text-faint)]">PROJECTS</div>
                <div className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[var(--sf-text)]">
                  {projectCount}
                </div>
              </div>
              <div className="sf-panel p-4">
                <div className="text-[12px] text-[var(--sf-text-faint)]">SCENE OBJECTS</div>
                <div className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[var(--sf-text)]">
                  {assetCount}
                </div>
              </div>
              <div className="sf-panel p-4">
                <div className="text-[12px] text-[var(--sf-text-faint)]">IMPORT-BASED</div>
                <div className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[var(--sf-text)]">
                  {importCount}
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="sf-panel p-5">
                <div className="text-[15px] font-semibold text-[var(--sf-text)]">
                  SpaceForge Flow
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--sf-text-muted)]">
                  Use the same backend flows you already built: create manual
                  layouts, import draw.io/XML/HTML, generate from prompts,
                  edit in 2D/3D, then share or export.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Prompt to 3D", "draw.io Import", "2D/3D Editor", "Share Links", "PNG / PDF Export"].map((item) => (
                    <span key={item} className="sf-chip px-3 py-1.5 text-[12px]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sf-panel p-5">
                <div className="text-[15px] font-semibold text-[var(--sf-text)]">
                  Quick Launch
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => openProjectCreation()}
                    className="rounded-[6px] bg-[var(--sf-accent-blue)] px-4 py-2 text-left text-[13px] font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Create, import, or generate a project
                  </button>
                  <button
                    onClick={() => openProjectCreation("prompt")}
                    data-tour="ai-generate"
                    className="rounded-[6px] bg-[#7c3aed] px-4 py-2 text-left text-[13px] font-medium text-white transition hover:bg-[#6d28d9]"
                  >
                    Generate from AI prompt
                  </button>
                  <button
                    onClick={() => openProjectCreation("upload")}
                    data-tour="import-launch"
                    className="rounded-[6px] border border-[var(--sf-border-strong)] px-4 py-2 text-left text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
                  >
                    Import draw.io / XML / HTML
                  </button>
                  <Link
                    href="/"
                    className="rounded-[6px] border border-[var(--sf-border-strong)] px-4 py-2 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
                  >
                    Open landing pipelines
                  </Link>
                </div>
              </div>
            </div>

            <div className="mb-6" data-tour="templates-section">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-[var(--sf-text)]">
                    Templates
                  </div>
                  <div className="mt-1 text-[13px] text-[var(--sf-text-muted)]">
                    Start from a prebuilt layout instead of beginning from scratch.
                  </div>
                </div>
                <button
                  onClick={() => openProjectCreation("template")}
                  className="rounded-[6px] border border-[var(--sf-border-strong)] px-4 py-2 text-[13px] font-medium text-[var(--sf-text)] transition hover:bg-[var(--sf-surface-soft)]"
                >
                  Open Template Picker
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {PROJECT_TEMPLATES.map((template) => (
                  <div key={template.id} className="sf-panel overflow-hidden">
                    <div
                      className="h-28 border-b border-[var(--sf-border)]"
                      style={{ background: template.previewTone }}
                    />
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-semibold text-[var(--sf-text)]">
                          {template.name}
                        </div>
                        {template.avReady ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                            AV ready
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-[12px] leading-6 text-[var(--sf-text-muted)]">
                        {template.description}
                      </div>
                      <div className="mt-3">
                        <span className="sf-chip px-2 py-1 text-[11px]">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isResumingPrompt ? (
              <div className="sf-panel mb-6 p-8 text-center">
                <div className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
                  Generating your layout...
                </div>
                <p className="mt-3 text-[14px] text-[var(--sf-text-muted)]">
                  Your saved landing prompt was restored after login and is being converted now.
                </p>
              </div>
            ) : loading ? (
              <div className="sf-panel mb-6 p-8 text-center text-[14px] text-[var(--sf-text-muted)]">
                Loading projects...
              </div>
            ) : error ? (
              <div className="mb-6 rounded-[8px] border border-red-200 bg-red-50 p-5 text-[14px] text-red-600">
                {error}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="sf-panel p-10 text-center">
                <div className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
                  No projects yet
                </div>
                <p className="mx-auto mt-3 max-w-[640px] text-[14px] leading-7 text-[var(--sf-text-muted)]">
                  Create your first venue layout from a prompt, import an
                  existing floor plan, or start manually in 2D or 3D.
                </p>
                <button
                  onClick={() => openProjectCreation()}
                  className="mt-6 rounded-[6px] bg-[var(--sf-text)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#333333]"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredProjects.map((project) => (
                  <ProjectPreviewCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>

        <ProjectModal
          open={open}
          onClose={() => {
            setOpen(false);
            setContinueTourInEditor(false);
          }}
          onProjectCreated={loadProjects}
          onOpenProject={(projectId) => router.push(`/editor/${projectId}`)}
          initialStep={projectModalStep}
          continueTourInEditor={continueTourInEditor}
        />
        {user?.email ? (
          <OnboardingWizard
            key={`${user.email}-${showOnboarding ? "open" : "closed"}`}
            open={showOnboarding}
            onClose={completeOnboarding}
            onFinish={completeOnboarding}
            onLaunchPipeline={(pipeline) => {
              completeOnboarding();
              openProjectCreation(pipeline, true);
            }}
          />
        ) : null}
      </main>
    </ProtectedRoute>
  );
}
