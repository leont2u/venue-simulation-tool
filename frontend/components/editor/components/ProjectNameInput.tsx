"use client";
import { useState } from "react";

export default function ProjectNameInput({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [projectName, setProjectName] = useState(name);

  const commitProjectName = () => {
    const cleanName = projectName.trim();
    if (!cleanName) {
      setProjectName(name);
      return;
    }
    if (cleanName !== name) {
      onRename(cleanName);
    }
  };

  return (
    <input
      value={projectName}
      onChange={(event) => setProjectName(event.target.value)}
      onBlur={commitProjectName}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setProjectName(name);
          event.currentTarget.blur();
        }
      }}
      aria-label="Project name"
      className="min-w-0 max-w-70 rounded-[7px] border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold text-[#242a28] outline-none transition hover:border-[#e1e7e4] focus:border-[#b9cbc5] focus:bg-[#f8faf9]"
    />
  );
}
