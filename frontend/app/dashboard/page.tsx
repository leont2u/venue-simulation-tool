"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Grid2X2,
  List,
  Search,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import ProjectModal, {
  ProjectPipeline,
} from "@/components/dashboard/ProjectModal";
import ProjectPreviewCard from "@/components/dashboard/ProjectPreviewCard";
import {
  clearPendingPrompt,
  readPendingPrompt,
  savePendingPrompt,
} from "@/lib/pendingPrompt";
import {
  clearPendingVenueInput,
  pendingStoredFileToFile,
  readPendingVenueInput,
  savePendingVenueInput,
} from "@/lib/pendingVenueInput";
import {
  clearPendingTemplate,
  readPendingTemplate,
} from "@/lib/pendingTemplate";
import { createProjectFromVenueInput } from "@/lib/landingFlow";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/onboarding";
import { queueEditorTour } from "@/lib/onboardingTour";
import { PROJECT_TEMPLATES, ProjectTemplate } from "@/lib/projectTemplates";
import { getProjects, upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";
import displayName from "@/components/dashboard/utils/displayName";
import projectMatchesFilter from "@/components/dashboard/utils/projectMatchesFilter";
import TopBar from "@/components/dashboard/components/TopBar";
import Sidebar from "@/components/dashboard/components/SideBar";
import SectionHeader from "@/components/dashboard/components/SectionHeader";
import ActionCard from "@/components/dashboard/components/ActionCard";
import FilterPills from "@/components/dashboard/components/FilterPills";
import TemplateCard from "@/components/dashboard/components/TemplateCard";
import cx from "@/components/dashboard/utils/cx";
import HelpChat from "@/components/dashboard/components/HelpChat";

export type DashboardView = "home" | "projects";
type ViewMode = "grid" | "list";

const FILTERS = ["All", "Wedding", "Conference", "Church", "Concert"];
const TEMPLATE_FILTERS = [
  "All",
  "Wedding",
  "Conference",
  "Church",
  "Concert",
  "Corporate",
  "Livestream",
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [projectModalStep, setProjectModalStep] =
    useState<ProjectPipeline>("menu");
  const [continueTourInEditor, setContinueTourInEditor] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isResumingPrompt, setIsResumingPrompt] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("home");
  const [projectFilter, setProjectFilter] = useState("All");
  const [templateFilter, setTemplateFilter] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [creatingTemplateId, setCreatingTemplateId] = useState("");
  const resumeAttemptedRef = useRef(false);

  const userName = displayName(user?.email);
  const shouldResumePrompt = searchParams.get("resumePrompt") === "1";
  const shouldResumeTemplate = searchParams.get("resumeTemplate") === "1";

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setProjects(await getProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (shouldResumePrompt || shouldResumeTemplate) return;
    if (!user?.email || loading || isResumingPrompt) return;
    if (projects.length > 0) return;
    if (hasCompletedOnboarding(user.email)) return;
    setShowOnboarding(true);
  }, [
    isResumingPrompt,
    loading,
    projects.length,
    shouldResumePrompt,
    shouldResumeTemplate,
    user?.email,
  ]);

  useEffect(() => {
    if (!shouldResumePrompt || resumeAttemptedRef.current) return;

    const pendingInput = readPendingVenueInput();
    const prompt = pendingInput?.prompt.trim() || readPendingPrompt().trim();
    const file = pendingInput?.file
      ? pendingStoredFileToFile(pendingInput.file)
      : null;

    if (!prompt && !file) {
      resumeAttemptedRef.current = true;
      router.replace("/dashboard");
      return;
    }

    resumeAttemptedRef.current = true;

    const resume = async () => {
      try {
        setIsResumingPrompt(true);
        setError("");
        setShowOnboarding(false);
        clearPendingVenueInput();
        clearPendingPrompt();
        const project = await createProjectFromVenueInput({ prompt, file });
        if (user?.email && !hasCompletedOnboarding(user.email)) {
          markOnboardingComplete(user.email);
          queueEditorTour();
        }
        router.replace(`/editor/${project.id}`);
      } catch (err) {
        if (pendingInput) {
          await savePendingVenueInput(prompt, file);
        } else {
          savePendingPrompt(prompt);
        }
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create a layout from your saved landing input.",
        );
        router.replace("/dashboard");
      } finally {
        setIsResumingPrompt(false);
      }
    };

    void resume();
  }, [router, shouldResumePrompt, user?.email]);

  useEffect(() => {
    if (!shouldResumeTemplate || resumeAttemptedRef.current) return;

    const templateId = readPendingTemplate();
    const template = PROJECT_TEMPLATES.find((entry) => entry.id === templateId);

    if (!template) {
      resumeAttemptedRef.current = true;
      clearPendingTemplate();
      router.replace("/dashboard");
      return;
    }

    resumeAttemptedRef.current = true;

    const resumeTemplate = async () => {
      try {
        setIsResumingPrompt(true);
        setError("");
        setShowOnboarding(false);
        clearPendingTemplate();
        const savedProject = await upsertProject(
          template.buildProject(template.name),
        );
        if (user?.email && !hasCompletedOnboarding(user.email)) {
          markOnboardingComplete(user.email);
          queueEditorTour();
        }
        router.replace(`/editor/${savedProject.id}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create a project from your selected template.",
        );
        router.replace("/dashboard");
      } finally {
        setIsResumingPrompt(false);
      }
    };

    void resumeTemplate();
  }, [router, shouldResumeTemplate, user?.email]);

  const openProjectCreation = useCallback(
    (initialStep: ProjectPipeline = "menu", continueIntoEditor = false) => {
      setProjectModalStep(initialStep);
      setContinueTourInEditor(continueIntoEditor);
      setOpen(true);
    },
    [],
  );

  const completeOnboarding = useCallback(() => {
    if (user?.email) markOnboardingComplete(user.email);
    setShowOnboarding(false);
  }, [user?.email]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        `${project.room.width}x${project.room.depth}`.includes(query);
      return matchesSearch && projectMatchesFilter(project, projectFilter);
    });
  }, [projectFilter, projects, search]);

  const recentProjects = filteredProjects.slice(0, 4);
  const filteredTemplates = PROJECT_TEMPLATES.filter((template) =>
    templateFilter === "All" ? true : template.category === templateFilter,
  );

  const createProjectFromTemplate = useCallback(
    async (template: ProjectTemplate) => {
      try {
        setCreatingTemplateId(template.id);
        setError("");
        const savedProject = await upsertProject(
          template.buildProject(template.name),
        );
        await loadProjects();
        router.push(`/editor/${savedProject.id}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create a project from that template.",
        );
      } finally {
        setCreatingTemplateId("");
      }
    },
    [loadProjects, router],
  );

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-white text-[#24302d]">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          userName={userName}
          userEmail={user?.email}
          onLogout={logout}
        />

        <div className="min-w-0 flex-1 bg-white">
          <TopBar
            title={activeView === "home" ? "Home" : "Projects"}
            search={search}
            onSearchChange={setSearch}
            onNewProject={() => openProjectCreation()}
          />

          <section className="sf-scroll h-[calc(100vh-82px)] overflow-y-auto px-8 py-8 xl:px-11">
            {isResumingPrompt ? (
              <div className="rounded-[18px] border border-[#e9eeee] bg-white p-10 text-center text-[16px] text-[#657872]">
                Generating your layout...
              </div>
            ) : error ? (
              <div className="mb-8 rounded-[14px] border border-red-200 bg-red-50 p-5 text-[14px] text-red-700">
                {error}
              </div>
            ) : null}

            {activeView === "home" ? (
              <>
                <div className="mb-5">
                  <h1 className="mt-4 text-[36px] font-bold tracking-[-0.05em] text-[#24302d]">
                    Welcome back, {userName}.
                  </h1>
                </div>

                <section className="mb-12">
                  <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#24302d]">
                    Create new project
                  </h2>
                  <p className="mt-2 text-[16px] text-[#657872]">
                    Start a venue simulation in the way that fits you best.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3 2xl:grid-cols-4">
                    <ActionCard
                      tourId="ai-generate"
                      icon={WandSparkles}
                      title="Generate from prompt"
                      subtitle="Describe your event and let AI lay it out."
                      onClick={() => openProjectCreation("prompt")}
                    />
                    <ActionCard
                      tourId="import-launch"
                      icon={UploadCloud}
                      title="Upload floor plan"
                      subtitle="XML, draw.io, HTML, PNG, or PDF."
                      onClick={() => openProjectCreation("upload")}
                    />
                    <ActionCard
                      icon={Grid2X2}
                      title="Start blank venue"
                      subtitle="Begin with an empty canvas and grid."
                      active
                      onClick={() => openProjectCreation("draw3d")}
                    />
                  </div>
                </section>

                <section className="mb-12">
                  <SectionHeader
                    title="Recent projects"
                    subtitle="Pick up where you left off."
                    onViewAll={() => setActiveView("projects")}
                  />
                  {loading ? (
                    <div className="rounded-[18px] border border-[#e9eeee] bg-white p-10 text-center text-[#657872]">
                      Loading projects...
                    </div>
                  ) : recentProjects.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-4 2xl:grid-cols-4">
                      {recentProjects.map((project) => (
                        <ProjectPreviewCard
                          key={project.id}
                          project={project}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-[#e9eeee] bg-white p-10 text-center">
                      <div className="text-[22px] font-bold tracking-[-0.03em]">
                        No projects yet
                      </div>
                      <p className="mt-2 text-[#657872]">
                        Create a venue from a prompt, import a plan, or start
                        blank.
                      </p>
                    </div>
                  )}
                </section>

                <section data-tour="templates-section">
                  <SectionHeader
                    title="Pick a venue to start"
                    subtitle="Production-ready templates you can edit in seconds."
                    onViewAll={() => openProjectCreation("template")}
                  />
                  <FilterPills
                    filters={TEMPLATE_FILTERS}
                    active={templateFilter}
                    onChange={setTemplateFilter}
                  />
                  <div className="mt-5 grid gap-5 md:grid-cols-4 2xl:grid-cols-4">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onUse={() => void createProjectFromTemplate(template)}
                        isCreating={creatingTemplateId === template.id}
                        disabled={Boolean(creatingTemplateId)}
                      />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <div className="text-[14px] font-bold uppercase tracking-[0.28em] text-[#5d7f73]">
                      All projects
                    </div>

                    <p className="mt-3 text-[18px] text-[#657872]">
                      {projects.length} projects in your workspace.
                    </p>
                  </div>
                  <button
                    onClick={() => openProjectCreation()}
                    className="flex h-14 w-fit items-center gap-4 rounded-[13px] bg-[#5d7f73] px-7 text-[20px] font-bold text-white shadow-[0_4px_10px_rgba(32,43,40,0.18)] transition hover:bg-[#4e7165]"
                  >
                    New project
                  </button>
                </div>

                <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <label className="flex h-15 w-full max-w-100 items-center gap-4 rounded-2xl border border-[#e9eeee] bg-white px-5 text-[#6f807b] shadow-[0_1px_8px_rgba(32,43,40,0.05)]">
                    <Search size={24} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search projects..."
                      className="min-w-0 flex-1 bg-transparent text-[20px] text-[#24302d] placeholder:text-[#75857f]"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <FilterPills
                      filters={FILTERS}
                      active={projectFilter}
                      onChange={setProjectFilter}
                    />
                    <div className="flex h-13.5 rounded-2xl border border-[#e9eeee] bg-white p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cx(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          viewMode === "grid"
                            ? "bg-[#f0f5f3] text-[#24302d] shadow"
                            : "text-[#657872]",
                        )}
                      >
                        <Grid2X2 size={22} />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cx(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          viewMode === "list"
                            ? "bg-[#f0f5f3] text-[#24302d] shadow"
                            : "text-[#657872]",
                        )}
                      >
                        <List size={23} />
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-[18px] border border-[#e9eeee] bg-white p-10 text-center text-[#657872]">
                    Loading projects...
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div
                    className={cx(
                      "grid gap-5",
                      viewMode === "grid"
                        ? "md:grid-cols-4 2xl:grid-cols-4"
                        : "grid-cols-1",
                    )}
                  >
                    {filteredProjects.map((project) => (
                      <ProjectPreviewCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-[#e9eeee] bg-white p-12 text-center">
                    <Building2 className="mx-auto text-[#8ea09a]" size={42} />
                    <div className="mt-4 text-[24px] font-bold tracking-[-0.04em]">
                      No matching projects
                    </div>
                    <p className="mt-2 text-[#657872]">
                      Try another search or create a new venue simulation.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <HelpChat />

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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-[14px] text-[#657872]">
          Loading dashboard...
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
