"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Globe, GitFork, Heart, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useForkLayout } from "@/hooks/useForkLayout";
import type { UserProfile } from "@/types/auth";
import type { DiscoveryLayout } from "@/types/types";
import { EVENT_TYPE_LABELS } from "@/types/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  wedding:    "bg-[#f9ece9] text-[#c4736a]",
  conference: "bg-[#e8f0f7] text-[#4a7fa5]",
  funeral:    "bg-[#f0f0f0] text-[#6b7280]",
  concert:    "bg-[#f0ecf9] text-[#7c5cbf]",
  gala:       "bg-[#f5eedf] text-[#b07d3a]",
  other:      "bg-[#f0f4f2] text-[#657872]",
};

const SPECIALIZATION_LABELS: Record<string, string> = {
  weddings:    "Weddings",
  conferences: "Conferences",
  concerts:    "Concerts",
  funerals:    "Funerals",
  corporate:   "Corporate",
  galas:       "Galas & Awards",
  religious:   "Religious",
  productions: "AV / Livestream",
  exhibitions: "Exhibitions",
  social:      "Social Events",
};

type PlannerResponse = {
  profile: UserProfile;
  layouts: DiscoveryLayout[];
};

export default function PlannerProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData]         = useState<PlannerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const { fork, forkingId }       = useForkLayout();

  useEffect(() => {
    if (!handle) return;
    setIsLoading(true);
    apiClient
      .get<PlannerResponse>(`/api/planners/${handle}/`)
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setIsLoading(false));
  }, [handle]);

  if (isLoading) return <PlannerSkeleton />;

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#fbfcfb] flex flex-col items-center justify-center gap-4">
        <p className="text-[#657872] text-sm">Planner not found.</p>
        <Link href="/discover" className="text-sm text-[#5d7f73] underline underline-offset-2">
          Browse community layouts
        </Link>
      </div>
    );
  }

  const { profile, layouts } = data;
  const initials = (profile.displayName || profile.handle).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      {/* Back nav */}
      <div className="mx-auto max-w-[1080px] px-6 md:px-10 pt-6">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-sm text-[#657872] hover:text-[#314a43] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Discover
        </Link>
      </div>

      {/* Profile header */}
      <div className="mx-auto max-w-[1080px] px-6 md:px-10 py-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">

          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-[#d4e3de] flex items-center justify-center shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[32px] font-bold text-[#5d7f73]">{initials}</span>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-[#17211e] tracking-[-0.02em]">
                {profile.displayName || `@${profile.handle}`}
              </h1>
              {profile.isVerified && (
                <CheckCircle2 size={18} className="text-[#5d7f73] shrink-0" />
              )}
            </div>
            <p className="text-[14px] text-[#9ca8a3] mt-0.5">@{profile.handle}</p>

            {profile.bio && (
              <p className="mt-3 text-[14px] text-[#657872] leading-relaxed max-w-[560px]">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {profile.location && (
                <span className="flex items-center gap-1.5 text-[13px] text-[#9ca8a3]">
                  <MapPin size={13} /> {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-[#5d7f73] hover:underline"
                >
                  <Globe size={13} /> {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {profile.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.specializations.map((s) => (
                  <span key={s} className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#f0f4f2] text-[#5d7f73]">
                    {SPECIALIZATION_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex sm:flex-col items-center sm:items-end gap-5 sm:gap-3 shrink-0">
            <StatPill label="Layouts" value={profile.layoutCount} />
            <StatPill label="Forks" value={profile.totalForks} />
            <StatPill label="Likes" value={profile.totalLikes} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e9eeee]" />

      {/* Layouts grid */}
      <div className="mx-auto max-w-[1080px] px-6 md:px-10 py-8">
        <h2 className="text-[15px] font-semibold text-[#17211e] mb-5">
          Published layouts
          {layouts.length > 0 && (
            <span className="ml-2 text-[13px] font-normal text-[#9ca8a3]">({layouts.length})</span>
          )}
        </h2>

        {layouts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#dfe8e4] rounded-[14px]">
            <p className="text-sm text-[#9ca8a3]">No published layouts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => (
              <PlannerLayoutCard
                key={layout.id}
                layout={layout}
                onFork={fork}
                isForkingThis={forkingId === layout.projectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[22px] font-semibold text-[#17211e] tabular-nums leading-none">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-[#9ca8a3] mt-0.5">{label}</div>
    </div>
  );
}

function PlannerLayoutCard({
  layout, onFork, isForkingThis,
}: {
  layout: DiscoveryLayout;
  onFork: (id: string) => void;
  isForkingThis: boolean;
}) {
  const color = EVENT_TYPE_COLORS[layout.eventType] ?? EVENT_TYPE_COLORS.other;
  const label = EVENT_TYPE_LABELS[layout.eventType] ?? layout.eventType;

  return (
    <div className="group rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white
                    shadow-[0_1px_8px_rgba(32,43,40,0.05)] hover:-translate-y-0.5
                    hover:shadow-[0_8px_24px_rgba(32,43,40,0.11)] transition-all duration-200">
      <div className="relative aspect-video overflow-hidden bg-[#f0f4f2]">
        {layout.coverImageUrl ? (
          <img src={layout.coverImageUrl} alt={layout.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#9ca8a3] text-xs">No preview</span>
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
          {label}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2">
        <p className="text-[13.5px] font-semibold text-[#17211e] line-clamp-1">{layout.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {layout.forkCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <GitFork size={10} strokeWidth={2} /> {layout.forkCount}
              </span>
            )}
            {layout.likeCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <Heart size={10} strokeWidth={2} /> {layout.likeCount}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onFork(layout.projectId)}
          disabled={isForkingThis}
          className="mt-1 w-full py-2 text-xs font-semibold text-[#5d7f73] border border-[#c8d8d2]
                     rounded-lg hover:bg-[#f0f4f2] disabled:opacity-50 transition-colors"
        >
          {isForkingThis ? "Duplicating…" : "Use this layout"}
        </button>
      </div>
    </div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="mx-auto max-w-[1080px] px-6 md:px-10 py-8">
        <div className="flex items-start gap-6 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-[#f0f4f2]" />
          <div className="flex-1 space-y-3">
            <div className="h-7 bg-[#f0f4f2] rounded w-48" />
            <div className="h-4 bg-[#f0f4f2] rounded w-24" />
            <div className="h-4 bg-[#f0f4f2] rounded w-80" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white">
              <div className="aspect-video bg-[#f0f4f2] animate-pulse" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 bg-[#f0f4f2] rounded animate-pulse w-4/5" />
                <div className="h-8 bg-[#f0f4f2] rounded-lg animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
