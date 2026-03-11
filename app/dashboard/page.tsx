"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects, upsertProject } from "@/lib/storage";
import { Project } from "@/types/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const createProject = () => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || `Untitled Project ${projects.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      room: {
        width: 20,
        depth: 14,
        height: 4,
      },
      items: [],
    };

    upsertProject(project);
    window.location.href = `/editor/${project.id}`;
  };

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-4xl font-semibold">Projects</div>
            <div className="mt-2 text-zinc-400">
              Create and manage your 3D venue layouts.
            </div>
          </div>
          <Link href="/" className="text-zinc-400 transition hover:text-white">
            ← Back
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/50 p-6">
            <div className="text-2xl font-semibold">Create project</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mt-5 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-white placeholder:text-zinc-500"
            />
            <button
              onClick={createProject}
              className="mt-5 w-full rounded-2xl bg-green-500 px-4 py-4 font-medium text-white transition hover:bg-green-400"
            >
              Create and open editor
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/50 p-6">
            <div className="mb-5 text-2xl font-semibold">Recent projects</div>

            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-zinc-500">
                No projects yet. Create one to start building.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/editor/${project.id}`}
                    className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition hover:border-green-400/40 hover:bg-zinc-900"
                  >
                    <div className="text-xl font-medium text-white">
                      {project.name}
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">
                      Room: {project.room.width}m × {project.room.depth}m
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">
                      Assets: {project.items.length}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
