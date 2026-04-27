"use client";

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  FileInput,
  Grid2X2,
  Layers3,
  MousePointer2,
  Route,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProjectThumbnail } from "@/components/dashboard/ProjectPreviewCard";
import { PROJECT_TEMPLATES, ProjectTemplate } from "@/lib/projectTemplates";
import { savePendingTemplate } from "@/lib/pendingTemplate";
import { upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";

function estimateCapacity(project: Project) {
  const chairLike = project.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;
  return Math.max(
    chairLike * 8,
    Math.round((project.room.width * project.room.depth) / 3),
  );
}

function TemplateStarterCard({
  template,
  onUse,
  isCreating,
  disabled,
}: {
  template: ProjectTemplate;
  onUse: () => void;
  isCreating: boolean;
  disabled: boolean;
}) {
  const previewProject = useMemo(
    () => template.buildProject(template.name),
    [template],
  );
  const capacity = estimateCapacity(previewProject);

  return (
    <button
      type="button"
      onClick={onUse}
      disabled={disabled}
      className="group overflow-hidden rounded-[8px] border border-[#dfe8e4] bg-white text-left shadow-[0_10px_32px_rgba(49,74,67,0.06)] transition hover:-translate-y-0.5 hover:border-[#b9cbc5] hover:shadow-[0_18px_42px_rgba(49,74,67,0.12)] disabled:cursor-wait disabled:opacity-70"
    >
      <div className="relative h-[178px]">
        <ProjectThumbnail project={previewProject} />
        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[12px] font-bold text-[#35554c] shadow">
          {template.category}
        </div>
      </div>
      <div className="border-t border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6e837d]">
          <span>{template.avReady ? "AV ready" : "Starter"}</span>
          <span className="normal-case tracking-normal">
            {capacity.toLocaleString()} pax
          </span>
        </div>
        <h3 className="mt-3 text-[17px] font-bold tracking-[-0.02em] text-[#17211e]">
          {template.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#5d716b]">
          {template.description}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[#4f796f]">
          {isCreating ? "Opening template" : "Use this template"}
          <ArrowRight size={15} />
        </div>
      </div>
    </button>
  );
}

const features = [
  {
    icon: WandSparkles,
    title: "Prompt-to-venue generation",
    copy: "Describe the event, audience size, staging, cameras, and AV needs. The app turns that into a structured editable layout.",
  },
  {
    icon: FileInput,
    title: "Floorplan import",
    copy: "Bring in draw.io, XML, or HTML plans and convert them into a room you can keep refining in the editor.",
  },
  {
    icon: Layers3,
    title: "2D control, 3D preview",
    copy: "Use the 2D floorplan for precision, then jump into 3D to inspect sightlines, spacing, walls, and production coverage.",
  },
];

const workflow = [
  {
    icon: MousePointer2,
    label: "Choose a start",
    copy: "Prompt, uploaded plan, blank room, or one of the premade venue templates.",
  },
  {
    icon: Grid2X2,
    label: "Shape the layout",
    copy: "Move seating, stage elements, tables, screens, cameras, and speakers into place.",
  },
  {
    icon: Route,
    label: "Check the production layer",
    copy: "Review camera positions, AV zones, and connection paths before the event gets expensive.",
  },
  {
    icon: Save,
    label: "Save your version",
    copy: "Rename the project, keep editing, and return to it from the dashboard whenever planning changes.",
  },
];

export function LandingSections() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [creatingTemplateId, setCreatingTemplateId] = useState("");
  const featuredTemplates = PROJECT_TEMPLATES.slice(0, 4);

  const startFromTemplate = async (template: ProjectTemplate) => {
    if (!isAuthenticated) {
      savePendingTemplate(template.id);
      router.push(
        `/register?next=${encodeURIComponent("/dashboard?resumeTemplate=1")}`,
      );
      return;
    }

    try {
      setCreatingTemplateId(template.id);
      const savedProject = await upsertProject(
        template.buildProject(template.name),
      );
      router.push(`/editor/${savedProject.id}`);
    } finally {
      setCreatingTemplateId("");
    }
  };

  return (
    <>
      <section id="features" className=" bg-white px-5 py-20 text-[#17211e]">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dce8e3] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#4f796f]">
                <Sparkles size={14} />
                Features
              </div>
              <h2 className="mt-5 max-w-[520px] text-[42px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#17211e]">
                A venue planner that thinks in layouts and production.
              </h2>
            </div>
            <p className="max-w-[620px] text-[17px] leading-8 text-[#526c65]">
              Venue Sim is built for the messy middle between idea and setup:
              guest capacity, room shape, staging, livestream coverage, AV gear,
              and a plan the team can actually edit.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[8px]  bg-[#fbfcfb] p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#eaf3ef] text-[#4f796f]">
                  <feature.icon size={21} />
                </div>
                <h3 className="mt-5 text-[18px] font-bold tracking-[-0.02em]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-[14px] leading-6 text-[#5e706b]">
                  {feature.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-[#f4f8f6] px-5 py-20 text-[#17211e]"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-[0.22em] text-[#5d7f73]">
                How it works
              </div>
              <h2 className="mt-4 max-w-[560px] text-[42px] font-semibold leading-[1.06] tracking-[-0.04em]">
                From rough event idea to editable venue plan.
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-[8px] border border-[#dce8e3] bg-white px-4 py-3 text-[13px] font-bold text-[#4f625c]">
              <CheckCircle2 size={17} className="text-[#4f796f]" />
              Built around the editor workflow
            </div>
          </div>

          <div className="mt-12 grid gap-3 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <div
                key={step.label}
                className="relative rounded-[8px]  bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#17211e] text-white">
                    <step.icon size={19} />
                  </div>
                  <div className="font-mono text-[13px] text-[#8a9995]">
                    0{index + 1}
                  </div>
                </div>
                <h3 className="mt-6 text-[19px] font-bold tracking-[-0.02em]">
                  {step.label}
                </h3>
                <p className="mt-3 text-[14px] leading-6 text-[#5e706b]">
                  {step.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="bg-white px-5 py-20 text-[#17211e]">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eef5f2] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#4f796f]">
                <Boxes size={14} />
                Templates
              </div>
              <h2 className="mt-5 max-w-[620px] text-[42px] font-semibold leading-[1.06] tracking-[-0.04em]">
                Start from a premade venue, then make it your own.
              </h2>
            </div>
            <p className="max-w-[460px] text-[16px] leading-7 text-[#5d716b]">
              Skip the blank canvas. Pick a wedding, church, conference, or
              production-ready layout and open an editable copy in the editor.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredTemplates.map((template) => (
              <TemplateStarterCard
                key={template.id}
                template={template}
                onUse={() => void startFromTemplate(template)}
                isCreating={creatingTemplateId === template.id}
                disabled={Boolean(creatingTemplateId)}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
