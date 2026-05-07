"use client";

import { useEffect, useRef } from "react";
import { Bell, GitFork, Heart, CheckCircle2, Flag, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/types/auth";

const NTYPE_CONFIG = {
  fork:     { icon: GitFork,       label: "forked your layout",      color: "text-[#5d7f73]",  bg: "bg-[#f0f4f2]" },
  like:     { icon: Heart,         label: "liked your layout",        color: "text-[#c4736a]",  bg: "bg-[#f9ece9]" },
  approved: { icon: CheckCircle2,  label: "Your layout was approved", color: "text-[#4a7fa5]",  bg: "bg-[#e8f0f7]" },
  flagged:  { icon: Flag,          label: "Your layout was flagged",  color: "text-[#b07d3a]",  bg: "bg-[#f5eedf]" },
  comment:  { icon: MessageSquare, label: "commented on your layout", color: "text-[#7c5cbf]",  bg: "bg-[#f0ecf9]" },
} as const;

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const cfg  = NTYPE_CONFIG[n.ntype] ?? NTYPE_CONFIG.fork;
  const Icon = cfg.icon;

  const body = n.ntype === "approved" || n.ntype === "flagged"
    ? `${cfg.label}${n.layoutTitle ? `: "${n.layoutTitle}"` : ""}`
    : `${n.actorName ?? "Someone"} ${cfg.label}${n.layoutTitle ? `: "${n.layoutTitle}"` : ""}`;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-[#f5f7f5] transition-colors cursor-pointer ${
        n.is_read ? "opacity-60" : ""
      }`}
      onClick={() => !n.is_read && onRead(n.id)}
    >
      {!n.is_read && (
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#5d7f73] shrink-0" />
      )}
      {n.is_read && <span className="mt-2 w-1.5 h-1.5 shrink-0" />}

      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon size={13} className={cfg.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-[#314a43] leading-snug line-clamp-2">{body}</p>
        <p className="text-[11px] text-[#9ca8a3] mt-0.5">{formatRelative(n.created_at)}</p>
      </div>
    </div>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationDropdown({ isOpen, onClose }: Props) {
  const { notifications, unreadCount, isLoading, markAllRead, markRead } = useNotifications(isOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-[340px] bg-white rounded-[14px] border border-[#e9eeee]
                 shadow-[0_8px_32px_rgba(32,43,40,0.14)] z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f4f2]">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#5d7f73]" />
          <span className="text-[13px] font-semibold text-[#17211e]">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5d7f73] text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-[#5d7f73] hover:text-[#4e7165] font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-[#9ca8a3] hover:text-[#657872] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-[12px] text-[#9ca8a3]">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={24} className="text-[#d4e3de] mx-auto mb-2" />
            <p className="text-[12px] text-[#9ca8a3]">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onRead={markRead} />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-[#f0f4f2] px-4 py-2.5 text-center">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="text-[12px] text-[#5d7f73] hover:text-[#4e7165] font-medium transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
