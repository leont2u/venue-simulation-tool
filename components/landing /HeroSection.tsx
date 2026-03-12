"use client";

export function Hero() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-104px)] max-w-6xl flex-col px-6 pb-12 pt-8">
      <div className="mx-auto mt-10 max-w-4xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
          Build smarter venue
          <br />
          layouts, <span className="text-green-400">present them faster.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-zinc-400 md:text-2xl">
          Design immersive 3D venue layouts with drag-and-drop assets, then
          share polished previews with clients and internal teams.
        </p>
      </div>
    </section>
  );
}
