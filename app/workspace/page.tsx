"use client";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import { Navbar } from "@/components/workspace/TopBar";
import { VenueInputForm } from "@/components/workspace/VenueInputForm";
import { LayoutBlueprint } from "@/lib/layout.types";
import { promptToBlueprint } from "@/lib/promptToLayout";
import { useState } from "react";

export default function WorkspacePage() {
  const [blueprint, setBlueprint] = useState<LayoutBlueprint | null>(null);

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-90 shrink-0 overflow-y-auto border-r bg-background">
          <VenueInputForm
            onGenerate={(data) => {
              const bp = promptToBlueprint(data.description);
              setBlueprint(bp);
            }}
          />
        </aside>
        <main className="flex-1 overflow-hidden">
          <PreviewPanel blueprint={blueprint} className="h-full" />
        </main>
      </div>
    </div>
  );
}
