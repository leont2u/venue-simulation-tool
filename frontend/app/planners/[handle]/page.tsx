"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Globe, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useForkLayout } from "@/hooks/useForkLayout";
import type { UserProfile } from "@/types/auth";
import type { DiscoveryLayout } from "@/types/types";
import PlannerSkeleton from "@/components/planners/PlannerSkeleton";
import StatPill from "@/components/planners/StatPill";
import PlannerLayoutCard from "@/components/planners/PlannerLayoutCard";
import Image from "next/image";
import axios from "axios";

const SPECIALIZATION_LABELS: Record<string, string> = {
  weddings: "Weddings",
  conferences: "Conferences",
  concerts: "Concerts",
  funerals: "Funerals",
  corporate: "Corporate",
  galas: "Galas & Awards",
  religious: "Religious",
  productions: "AV / Livestream",
  exhibitions: "Exhibitions",
  social: "Social Events",
};

type PlannerResponse = {
  profile: UserProfile;
  layouts: DiscoveryLayout[];
};

export default function PlannerProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData] = useState<PlannerResponse | null>(null);
  const { fork, forkingId } = useForkLayout();

  const [error, setError] = useState<number | null>(null);

  useEffect(() => {
    if (!handle) return;

    let mounted = true;

    const fetchPlanner = async () => {
      try {
        const response = await apiClient.get<PlannerResponse>(
          `/api/planners/${handle}/`,
        );

        if (!mounted) return;

        setData(response.data);
        setError(null);
      } catch (e: unknown) {
        if (!mounted) return;

        if (axios.isAxiosError(e)) {
          setError(e.response?.status || 500);
        } else {
          setError(500);
        }
      }
    };

    fetchPlanner();

    return () => {
      mounted = false;
    };
  }, [handle]);

  const isLoading = !data && error === null;
  const notFound = error === 404;

  if (isLoading) return <PlannerSkeleton />;

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#fbfcfb] flex flex-col items-center justify-center gap-4">
        <p className="text-[#657872] text-sm">Planner not found.</p>
        <Link
          href="/discover"
          className="text-sm text-[#5d7f73] underline underline-offset-2"
        >
          Browse community layouts
        </Link>
      </div>
    );
  }

  const { profile, layouts } = data;
  const initials = (profile.displayName || profile.handle)
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="mx-auto max-w-270 px-6 md:px-10 pt-6">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-sm text-[#657872] hover:text-[#314a43] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Discover
        </Link>
      </div>

      <div className="mx-auto max-w-270 px-6 md:px-10 py-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative w-20 h-20 rounded-full bg-[#d4e3de] flex items-center justify-center shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-[32px] font-bold text-[#5d7f73]">
                {initials}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-[#17211e] tracking-[-0.02em]">
                {profile.displayName || `@${profile.handle}`}
              </h1>
              {profile.isVerified && (
                <CheckCircle2 size={18} className="text-[#5d7f73] shrink-0" />
              )}
            </div>
            <p className="text-[14px] text-[#9ca8a3] mt-0.5">
              @{profile.handle}
            </p>

            {profile.bio && (
              <p className="mt-3 text-[14px] text-[#657872] leading-relaxed max-w-140">
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
                  <Globe size={13} />{" "}
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {profile.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.specializations.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#f0f4f2] text-[#5d7f73]"
                  >
                    {SPECIALIZATION_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-5 sm:gap-3 shrink-0">
            <StatPill label="Layouts" value={profile.layoutCount} />
            <StatPill label="Forks" value={profile.totalForks} />
            <StatPill label="Likes" value={profile.totalLikes} />
          </div>
        </div>
      </div>

      <div className="border-t border-[#e9eeee]" />

      <div className="mx-auto max-w-270 px-6 md:px-10 py-8">
        <h2 className="text-[15px] font-semibold text-[#17211e] mb-5">
          Published layouts
          {layouts.length > 0 && (
            <span className="ml-2 text-[13px] font-normal text-[#9ca8a3]">
              ({layouts.length})
            </span>
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
