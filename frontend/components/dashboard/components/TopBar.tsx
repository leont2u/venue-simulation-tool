import { Bell, Search } from "lucide-react";

export default function TopBar({
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
    <header className="sticky top-0 z-20 flex h-20.5 items-center gap-6 border-b border-[#edf0ee] bg-white px-8">
      <div className="w-26 shrink-0 text-[20px] font-bold tracking-[-0.03em] text-[#24302d] lg:w-30">
        {title}
      </div>
      <label className="flex h-12.5 w-full max-w-195 items-center gap-3 rounded-[13px] border border-[#e6ebe8] bg-white px-4 text-[#6f807b] shadow-[0_1px_8px_rgba(32,43,40,0.07)]">
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
          data-tour="new-project"
          onClick={onNewProject}
          className="flex h-12.5 w-35  items-center gap-4 rounded-[13px] bg-[#5d7f73] px-6 text-[9px] font-bold text-white shadow-[0_4px_10px_rgba(32,43,40,0.18)] transition hover:bg-[#4e7165]"
        >
          New project
        </button>
      </div>
    </header>
  );
}
