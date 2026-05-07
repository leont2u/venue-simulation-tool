"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EventType } from "@/types/types";
import { EVENT_TYPE_LABELS } from "@/types/types";

type ExplorerItem = {
  key:         EventType;
  description: string;
  accent:      string;
  iconBg:      string;
};

const ITEMS: ExplorerItem[] = [
  {
    key:         "wedding",
    description: "Plan the perfect reception — every table, stage, floral arrangement, and camera position before the venue walkthrough.",
    accent:      "text-[#c4736a]",
    iconBg:      "bg-[#f9ece9]",
  },
  {
    key:         "conference",
    description: "Seat delegates, position screens, route power cables, and optimise sight lines across a venue of any size.",
    accent:      "text-[#4a7fa5]",
    iconBg:      "bg-[#e8f0f7]",
  },
  {
    key:         "funeral",
    description: "Design dignified layouts that guide guests, honour the departed, and give families clarity before the day.",
    accent:      "text-[#6b7280]",
    iconBg:      "bg-[#f0f0f0]",
  },
  {
    key:         "concert",
    description: "Place staging, speaker stacks, camera positions, and crowd barriers — and share the plan with the full production team.",
    accent:      "text-[#7c5cbf]",
    iconBg:      "bg-[#f0ecf9]",
  },
  {
    key:         "agm",
    description: "Arrange boardroom or auditorium seating, project AV positions, and generate a shareable plan for stakeholders.",
    accent:      "text-[#4a6fa5]",
    iconBg:      "bg-[#e8f0f7]",
  },
  {
    key:         "gala",
    description: "Craft immersive gala experiences — round-table seating, stage design, lighting mood, and centrepiece placement.",
    accent:      "text-[#b07d3a]",
    iconBg:      "bg-[#f5eedf]",
  },
];

export function EventTypeExplorer() {
  const [active, setActive] = useState<EventType>(ITEMS[0].key);
  const activeItem = ITEMS.find((i) => i.key === active) ?? ITEMS[0];

  return (
    <section className="py-16 md:py-20 bg-white border-t border-[#e9eeee]">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-[#5d7f73] mb-2">
            Every event type
          </p>
          <h2 className="text-[26px] md:text-[32px] font-bold text-[#17211e] tracking-[-0.03em]">
            Built for every event you plan
          </h2>
        </div>

        {/* Pill strip */}
        <div className="flex flex-wrap gap-2 mb-8">
          {ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
                active === item.key
                  ? `${item.iconBg} ${item.accent} ring-1 ring-current/30`
                  : "bg-[#f5f7f5] text-[#657872] hover:bg-[#edf0ee]"
              }`}
            >
              {EVENT_TYPE_LABELS[item.key]}
            </button>
          ))}
        </div>

        {/* Description card */}
        <div
          key={active}
          className="flex flex-col sm:flex-row items-start gap-5 p-6 rounded-[16px]
                     border border-[#e9eeee] bg-[#fbfcfb]
                     animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${activeItem.iconBg}`}>
            <span className={`text-lg font-bold ${activeItem.accent}`}>
              {EVENT_TYPE_LABELS[activeItem.key].charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <p className={`text-[15px] font-semibold mb-1 ${activeItem.accent}`}>
              {EVENT_TYPE_LABELS[activeItem.key]}
            </p>
            <p className="text-[14px] text-[#657872] leading-relaxed">
              {activeItem.description}
            </p>
            <Link
              href={`/discover?event_type=${activeItem.key}`}
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold
                         text-[#5d7f73] hover:text-[#4e7165] transition-colors"
            >
              Browse {EVENT_TYPE_LABELS[activeItem.key].toLowerCase()} layouts
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
