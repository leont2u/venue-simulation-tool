"use client";

import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Props = {
  value:     string;
  onSearch:  (query: string) => void;
  onClear:   () => void;
};

export function SearchBar({ value, onSearch, onClear }: Props) {
  const [input, setInput] = useState(value);
  const inputRef          = useRef<HTMLInputElement>(null);

  // Keep local input in sync when parent clears
  useEffect(() => { setInput(value); }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(input.trim());
  };

  const handleClear = () => {
    setInput("");
    onClear();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <Search
        size={16}
        strokeWidth={2}
        className="absolute left-3.5 text-[#9ca8a3] pointer-events-none"
      />
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search layouts, venues, planners…"
        className="
          w-full pl-9 pr-20 py-2.5 text-[14px] text-[#17211e] placeholder:text-[#9ca8a3]
          bg-white border border-[#dfe8e4] rounded-[10px] outline-none
          focus-visible:ring-2 focus-visible:ring-[#5d7f73] focus-visible:border-[#5d7f73]
          transition-colors
        "
      />
      <div className="absolute right-2 flex items-center gap-1">
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-[#9ca8a3] hover:text-[#314a43] transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="submit"
          className="px-3 py-1 bg-[#5d7f73] hover:bg-[#4e7165] text-white text-xs font-semibold
                     rounded-[7px] transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
