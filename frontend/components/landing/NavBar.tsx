import Link from "next/link";

export function Navbar() {
  return (
    <header className="relative z-50 bg-[#fbfcfb]">
      <div className="mx-auto flex h-[82px] w-full max-w-[1280px] items-center gap-5 px-6 md:px-10">
        <Link href="/" className="leading-tight">
          <div className="text-[21px] font-semibold tracking-[-0.03em] text-[#0f1714]">
            Leon Manhimanzi
          </div>
          <div className="mt-1 text-[13px] font-medium uppercase tracking-[0.16em] text-[#516660]">
            Venue Simulation Tool
          </div>
        </Link>

        <div className="flex-1" />

        <nav className="hidden items-center gap-9 md:flex">
          <a className="text-[15px] font-medium text-[#314a43]" href="#features">
            Features
          </a>
          <a className="text-[15px] font-medium text-[#314a43]" href="#how-it-works">
            How It Works
          </a>
          <a className="text-[15px] font-medium text-[#314a43]" href="#gallery">
            Gallery
          </a>
        </nav>

        <Link
          href="/login"
          className="hidden rounded-[8px] px-5 py-2.5 text-[15px] font-medium text-[#0f1714] transition hover:bg-[#edf4f1] md:block"
        >
          Book Demo
        </Link>
        <Link
          href="/register"
          className="rounded-[8px] border border-[#2f5d52] bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61]"
        >
          Start Free
        </Link>
      </div>
    </header>
  );
}
