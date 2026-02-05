import Navbar from "@/components/NavBar";
import FeatureCard from "@/components/ui/FeatureCard";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-10 pb-10 flex flex-col flex-1">
        <section className="flex flex-1 items-center justify-center">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Design your event
              <br />
              <span>Before they happen</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
              Plan, simulate, and preview event setups in a virtual venue before
              moving a single chair.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row justify-center">
              <Link
                href="/auth"
                className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-7 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Get Started
              </Link>

              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-7 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                See how it works
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES pinned to bottom */}
        <section id="features" className="mt-auto pt-12">
          <div className="grid gap-10 md:grid-cols-3">
            <FeatureCard
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              }
              title="Convert 2D Sketch to 3D Layout"
              desc="Upload your floor plan or sketch, calibrate scale, and generate an editable 3D scene."
            />

            <FeatureCard
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" />
                </svg>
              }
              title="Auto Layout from Prompts"
              desc="Describe the venue, attendance, and setup style—get a realistic layout in seconds."
            />

            <FeatureCard
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 21s-7-4.35-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6.65-7 11-7 11z" />
                </svg>
              }
              title="Edit, Move, Export"
              desc="Drag objects, adjust spacing, and export your 3D layout (GLB/OBJ) or client-ready previews."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
