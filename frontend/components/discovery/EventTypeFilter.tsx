"use client";

import { EVENT_TYPE_LABELS, EventType } from "@/types/types";

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

type Props = {
  selected: EventType | null;
  onChange: (type: EventType | null) => void;
};

export function EventTypeFilter({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
          ${
            !selected
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
      >
        All
      </button>
      {ALL_EVENT_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(selected === type ? null : type)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
            ${
              selected === type
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
        >
          {EVENT_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
