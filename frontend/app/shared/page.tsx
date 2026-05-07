import { Suspense } from "react";
import SharedProjectContent from "@/components/shared/SharedProjectContent";

export default function SharedProjectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-(--sf-bg) px-6">
          <div className="max-w-xl rounded-xl border border-(--sf-border) bg-white p-8 shadow-(--sf-shadow-md">
            <div className="text-[28px] font-semibold tracking-[-0.04em] text-(--sf-text)">
              Loading shared layout...
            </div>
          </div>
        </main>
      }
    >
      <SharedProjectContent />
    </Suspense>
  );
}
