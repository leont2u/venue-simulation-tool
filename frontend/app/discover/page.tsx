import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";

export const metadata = { title: "Discover Layouts" };

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Discover Layouts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Browse and remix venue layouts shared by the planning community.
          </p>
        </div>
        <DiscoveryFeed />
      </div>
    </main>
  );
}
