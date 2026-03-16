"use client";

import FeatureCard from "./components/FeatureCard";
import QuickActionCard from "./components/QuickActionCard";
import StepCard from "./components/StepCard";
import Footer from "./Footer";
import { PromptLayoutSection } from "./PromptLayoutSection";

export function Hero() {
  return (
    <div className="pb-20">
      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col justify-center px-6 py-10">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[#2F3E46] md:text-6xl lg:text-7xl">
            Turn 2D Floor Plans into
            <br />
            <span className="text-[#52796F]">3D Experiences</span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#52796F] md:text-xl">
            Help event organisers present their venue layouts in immersive 3D.
            Build manually, import structured plans, or generate from prompts.
          </p>
        </div>

        <div id="start" className="mx-auto mt-8 w-full max-w-4xl">
          <PromptLayoutSection />
        </div>

        <div className="mx-auto mt-6 grid w-full max-w-5xl gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Upload File"
            description="Import XML, draw.io, or HTML floor plans and convert them into editable 3D layouts."
          />
          <QuickActionCard
            title="Draw 3D Layout"
            description="Create venue layouts manually with your drag-and-place 3D editor and asset library."
          />
          <QuickActionCard
            title="Draw 2D Layout"
            description="Create venue layouts manually with your drag-and-place 2D editor and asset library."
          />
        </div>
      </section>
      <section id="features" className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-semibold text-[#2F3E46] md:text-5xl">
              Why this platform?
            </h2>
            <p className="mt-4 text-lg text-[#52796F]">
              Everything event professionals need to bring venues to life.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="2D to 3D Conversion"
              description="Import structured floor plans from draw.io, XML, or HTML and convert them into editable 3D projects."
            />
            <FeatureCard
              title="Manual 3D Layout Creation"
              description="Build layouts from scratch using real 3D assets like chairs, podiums, cameras, desks, screens, and more."
            />
            <FeatureCard
              title="Prompt-Based Generation"
              description="Generate venue layouts from text prompts, then refine them further inside the same editor."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className=" pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-semibold text-[#2F3E46] md:text-5xl">
              Three pipelines. One unified editor.
            </h2>
            <p className="mt-4 text-lg text-zinc-500">
              Create, import, or generate — then refine everything in the same
              3D workspace.
            </p>
          </div>

          <div className="mt-20 grid gap-12 md:grid-cols-3">
            <StepCard
              number="01"
              title="Create or Upload"
              description="Start manually, upload a structured floor plan, or describe your venue in natural language."
            />
            <StepCard
              number="02"
              title="Convert to Project"
              description="The system transforms the input into a structured project model ready for editing."
            />
            <StepCard
              number="03"
              title="Edit in 3D"
              description="Preview the room, move assets around, duplicate items, label them, and save your final setup."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-semibold text-[#2F3E46] md:text-5xl">
            Ready to transform your venue presentations?
          </h2>
          <p className="mt-5 text-lg text-[#52796F]">
            Start building, importing, and generating venue layouts in 3D.
          </p>

          <div className="mt-8">
            <a
              href="/dashboard"
              className="inline-flex rounded-2xl bg-[#84A98C] px-8 py-4 text-lg font-medium text-white transition hover:bg-[#52796F]"
            >
              Get started
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
