import Link from "next/link";
import AuthCard from "./AuthCard";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Top mini header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 text-white shadow-sm">
              <span className="text-xs font-bold tracking-widest">VR</span>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-white" />
            </div>

            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-tight text-gray-900">
                VenueSim
              </p>
              <p className="text-xs text-gray-500">VR venue planner</p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Back to home
          </Link>
        </div>

        {/* Layout */}
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          {/* Left: value / info */}
          <section className="order-2 lg:order-1">
            <div className="inline-flex items-center rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600">
              Secure access
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900">
              Welcome back.
              <br />
              Build your next venue in 3D.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
              Log in to generate 3D venue layouts from prompts, or convert 2D
              sketches into editable 3D scenes.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <InfoPill
                title="Prompt → 3D"
                desc="Describe venue, attendees, style"
              />
              <InfoPill
                title="2D → 3D"
                desc="Upload sketch and convert instantly"
              />
              <InfoPill title="Edit Mode" desc="Move objects, snap to grid" />
              <InfoPill title="Export" desc="GLB/OBJ + images + share link" />
            </div>
          </section>

          {/* Right: auth card */}
          <section className="order-1 lg:order-2">
            <AuthCard />
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoPill({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </div>
  );
}
