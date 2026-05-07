"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Notification, NotificationPage } from "@/types/auth";

export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(false);
  const pollingRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const r = await apiClient.get<NotificationPage>("/api/notifications/?page_size=20");
      const items = r.data.results ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch {
      // silent — non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient.post("/api/notifications/read/", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiClient.post("/api/notifications/read/", { ids: [id] });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchNotifications();
    // Poll every 60 seconds for new notifications
    pollingRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [enabled, fetchNotifications]);

  return { notifications, unreadCount, isLoading, fetchNotifications, markAllRead, markRead };
}
