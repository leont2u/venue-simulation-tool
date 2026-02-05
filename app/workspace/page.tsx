import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import { Navbar } from "@/components/workspace/TopBar";
import { VenueInputForm } from "@/components/workspace/VenueInputForm";

export default function WorkspacePage() {
  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-90 shrink-0 overflow-y-auto border-r bg-background">
          <VenueInputForm />
        </aside>
        <main className="flex-1 overflow-hidden">
          <PreviewPanel className="h-full" />
        </main>
      </div>
    </div>
  );
}
