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
  Bell,
  Building2,
  FolderKanban,
  Grid2X2,
  Home,
  List,
  type LucideIcon,
  MessageCircle,
  Plus,
  Search,
  Send,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import ProjectModal, {
  ProjectPipeline,
} from "@/components/dashboard/ProjectModal";
import ProjectPreviewCard, {
  ProjectThumbnail,
} from "@/components/dashboard/ProjectPreviewCard";
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
import { createProjectFromVenueInput } from "@/lib/landingFlow";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/onboarding";
import { PROJECT_TEMPLATES, ProjectTemplate } from "@/lib/projectTemplates";
import { getProjects } from "@/lib/storage";
import { Project } from "@/types/types";

type DashboardView = "home" | "projects";
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function displayName(email?: string) {
  if (!email) return "Founder";
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ");
  return name
    ? name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Founder";
}

function projectMatchesFilter(project: Project, filter: string) {
  if (filter === "All") return true;
  return project.name.toLowerCase().includes(filter.toLowerCase());
}

function templateToPreviewProject(template: ProjectTemplate): Project {
  return template.buildProject(template.name);
}

function estimateTemplateCapacity(template: ProjectTemplate) {
  const preview = templateToPreviewProject(template);
  const chairLike = preview.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;
  return Math.max(
    chairLike * 8,
    Math.round((preview.room.width * preview.room.depth) / 3),
  );
}

function TopBar({
  title,
  search,
  onSearchChange,
  onNewProject,
}: {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNewProject: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[82px] items-center gap-6 border-b border-[#edf0ee] bg-white px-8">
      <div className="w-[104px] shrink-0 text-[20px] font-bold tracking-[-0.03em] text-[#24302d] lg:w-[120px]">
        {title}
      </div>
      <label className="flex h-[50px] w-full max-w-[780px] items-center gap-3 rounded-[13px] border border-[#e6ebe8] bg-white px-4 text-[#6f807b] shadow-[0_1px_8px_rgba(32,43,40,0.07)]">
        <Search size={21} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search projects, templates, assets..."
          className="min-w-0 flex-1 bg-transparent text-[18px] text-[#24302d] placeholder:text-[#75857f]"
        />
      </label>
      <div className="ml-auto flex items-center gap-5">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#63756f] transition hover:bg-[#f1f5f3]">
          <Bell size={21} />
        </button>
        <button
          onClick={onNewProject}
          className="flex h-[50px] w-35  items-center gap-4 rounded-[13px] bg-[#5d7f73] px-6 text-[9px] font-bold text-white shadow-[0_4px_10px_rgba(32,43,40,0.18)] transition hover:bg-[#4e7165]"
        >
          New project
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  activeView,
  onViewChange,
  userName,
  userEmail,
  onLogout,
}: {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden w-[300px] shrink-0 border-r border-[#edf0ee] bg-white lg:flex lg:flex-col">
      <div className="h-[82px] border-b border-[#edf0ee] px-8 py-5">
        <div className="text-[20px] font-bold leading-none tracking-[-0.03em] text-[#202927]">
          Leon Manhimanzi
        </div>
        <div className="mt-2 text-[13px] font-bold uppercase tracking-[0.33em] text-[#75857f]">
          Venue Simulation
        </div>
      </div>

      <nav className="space-y-2 px-5 py-8">
        {[
          { view: "home" as const, label: "Home", icon: Home },
          { view: "projects" as const, label: "Projects", icon: FolderKanban },
        ].map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={cx(
                "flex h-[58px] w-full items-center gap-4 rounded-[16px] px-5 text-left text-[18px] font-bold transition",
                selected
                  ? "bg-[#eef3f1] text-[#5d7f73]"
                  : "text-[#687a74] hover:bg-[#f5f8f6]",
              )}
            >
              <Icon size={22} strokeWidth={2.2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#edf0ee] p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7efec] text-[16px] font-bold text-[#6a827a]">
            {initials || "FO"}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-bold text-[#24302d]">
              {userName || "Founder"}
            </div>
            <div className="truncate text-[14px] text-[#61736e]">
              {userEmail || "founder@studio.com"}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-5 h-11 w-full rounded-[13px] border border-[#dde6e2] bg-white text-[15px] font-bold text-[#5d7f73] transition hover:border-[#c5d8d3] hover:bg-[#f3f8f6]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex min-h-[126px] items-center gap-5 rounded-[18px] border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#c9d8d3] hover:shadow-[0_12px_30px_rgba(32,43,40,0.08)]",
        active
          ? "border-[#c5d8d3] shadow-[inset_0_0_0_1px_#c5d8d3]"
          : "border-[#e9eeee]",
      )}
    >
      <div
        className={cx(
          "flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[13px] shadow-[0_4px_12px_rgba(32,43,40,0.12)]",
          active ? "bg-[#f1f6f4] text-[#22302c]" : "bg-[#5d7f73] text-white",
        )}
      >
        <Icon size={25} />
      </div>
      <div>
        <div className="text-[16px] font-bold text-[#24302d]">{title}</div>
        <div className="mt-2 text-[14px] leading-6 text-[#667873]">
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
  onViewAll,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#24302d]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-[16px] text-[#657872]">{subtitle}</p>
        ) : null}
      </div>
      {onViewAll ? (
        <button
          onClick={onViewAll}
          className="text-[16px] font-bold text-[#5d7f73] transition hover:text-[#3f6257]"
        >
          View all →
        </button>
      ) : null}
    </div>
  );
}

function FilterPills({
  filters,
  active,
  onChange,
}: {
  filters: string[];
  active: string;
  onChange: (filter: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cx(
            "h-9 rounded-full border px-4 text-[14px] font-bold transition",
            active === filter
              ? "border-[#202927] bg-[#202927] text-white"
              : "border-[#e2e9e6] bg-white text-[#657872] hover:border-[#cbd8d3]",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
}: {
  template: ProjectTemplate;
  onUse: () => void;
}) {
  const previewProject = useMemo(
    () => templateToPreviewProject(template),
    [template],
  );
  const capacity = estimateTemplateCapacity(template);
  const highlighted = template.category === "Church";

  return (
    <button
      onClick={onUse}
      className={cx(
        "group overflow-hidden rounded-[18px] border bg-white text-left transition hover:-translate-y-0.5 hover:border-[#c7d7d2] hover:shadow-[0_12px_30px_rgba(32,43,40,0.08)]",
        highlighted
          ? "border-[#bcd3cd] shadow-[inset_0_0_0_1px_#bcd3cd]"
          : "border-[#e9eeee]",
      )}
    >
      <div className="relative h-[216px]">
        <ProjectThumbnail project={previewProject} />
        {template.avReady ? (
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#24302d] shadow">
              Livestream
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#657872] shadow">
              PTZ
            </span>
          </div>
        ) : null}
        <span className="absolute bottom-3 right-3 hidden items-center gap-2 rounded-[10px] bg-[#5d7f73] px-4 py-2 text-[14px] font-bold text-white shadow group-hover:flex">
          <Plus size={18} />
          Use
        </span>
      </div>
      <div className="border-t border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6e837d]">
          <span>{template.category}</span>
          <span className="font-semibold normal-case tracking-normal text-[#6e7e79]">
            {capacity.toLocaleString()} pax
          </span>
        </div>
        <div className="mt-3 truncate text-[16px] font-bold tracking-[-0.02em] text-[#24302d]">
          {template.name}
        </div>
      </div>
    </button>
  );
}

function HelpChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-7 right-7 z-40">
      {open ? (
        <div className="mb-4 w-[340px] overflow-hidden rounded-[18px] border border-[#dfe8e4] bg-white shadow-[0_18px_60px_rgba(32,43,40,0.18)]">
          <div className="flex items-center justify-between border-b border-[#edf1ef] bg-[#f8fbf9] px-5 py-4">
            <div>
              <div className="text-[15px] font-bold text-[#24302d]">
                Venue help
              </div>
              <div className="text-[12px] text-[#657872]">
                Dashboard assistant
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#657872] hover:bg-[#eaf1ee]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="max-w-[260px] rounded-[14px] bg-[#eef5f2] px-4 py-3 text-[14px] leading-6 text-[#4f625c]">
              Hi, I can help with project creation, imports, templates, and
              export questions.
            </div>
            <div className="ml-auto max-w-[240px] rounded-[14px] bg-[#5d7f73] px-4 py-3 text-[14px] leading-6 text-white">
              Chat is coming soon.
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[#edf1ef] p-4">
            <input
              disabled
              placeholder="Ask for help..."
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-[#e1e8e5] bg-[#f8fbf9] px-3 text-[14px] placeholder:text-[#8b9a95]"
            />
            <button
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#d8e4e0] text-[#6a7d76]"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      ) : null}
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5d7f73] text-white shadow-[0_10px_30px_rgba(32,43,40,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4e7165]"
      >
        <MessageCircle size={28} />
      </button>
    </div>
  );
}

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
  const resumeAttemptedRef = useRef(false);

  const userName = displayName(user?.email);

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
    if (!user?.email || loading || isResumingPrompt) return;
    if (projects.length > 0) return;
    if (hasCompletedOnboarding(user.email)) return;
    setShowOnboarding(true);
  }, [isResumingPrompt, loading, projects.length, user?.email]);

  useEffect(() => {
    const shouldResumePrompt = searchParams.get("resumePrompt") === "1";
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
        clearPendingVenueInput();
        clearPendingPrompt();
        const project = await createProjectFromVenueInput({ prompt, file });
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
  }, [router, searchParams]);

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
                      icon={WandSparkles}
                      title="Generate from prompt"
                      subtitle="Describe your event and let AI lay it out."
                      onClick={() => openProjectCreation("prompt")}
                    />
                    <ActionCard
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

                <section>
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
                        onUse={() => openProjectCreation("template")}
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
                    className="flex h-[56px] w-fit items-center gap-4 rounded-[13px] bg-[#5d7f73] px-7 text-[20px] font-bold text-white shadow-[0_4px_10px_rgba(32,43,40,0.18)] transition hover:bg-[#4e7165]"
                  >
                    New project
                  </button>
                </div>

                <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <label className="flex h-[60px] w-full max-w-[400px] items-center gap-4 rounded-[16px] border border-[#e9eeee] bg-white px-5 text-[#6f807b] shadow-[0_1px_8px_rgba(32,43,40,0.05)]">
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
                    <div className="flex h-[54px] rounded-[16px] border border-[#e9eeee] bg-white p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cx(
                          "flex h-11 w-11 items-center justify-center rounded-[12px]",
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
                          "flex h-11 w-11 items-center justify-center rounded-[12px]",
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
