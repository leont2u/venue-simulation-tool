import { FolderKanban, Home } from "lucide-react";
import cx from "../utils/cx";
import { DashboardView } from "@/app/dashboard/page";

export default function Sidebar({
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
    <aside className="hidden w-75 shrink-0 border-r border-[#edf0ee] bg-white lg:flex lg:flex-col">
      <div className="h-20.5 border-b border-[#edf0ee] px-8 py-5">
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
                "flex h-14.5 w-full items-center gap-4 rounded-2xl px-5 text-left text-[18px] font-bold transition",
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
