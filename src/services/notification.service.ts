import { hybridNotificationRepository } from "@/repositories/hybrid-notification.repository";
import type { NotificationRepository } from "@/repositories/notification.repository";

import type {
  AppNotification,
  NotificationCategory,
  NotificationSummary,
} from "@/types/notification";

/**
 * Service layer for the global notification center.
 * Owns filtering, grouping and summary rules.
 */
export function createNotificationService(
  repository: NotificationRepository = hybridNotificationRepository,
) {
  return {
    list: () => repository.list(),
    markRead: (id: string) => repository.markRead(id),
    markAllRead: () => repository.markAllRead(),
    clearAll: () => repository.clearAll(),

    filter(
      items: AppNotification[],
      options: { category?: NotificationCategory | "all"; unreadOnly?: boolean },
    ) {
      return items.filter((item) => {
        if (options.unreadOnly && item.read) return false;
        if (options.category && options.category !== "all" && item.category !== options.category)
          return false;
        return true;
      });
    },

    summarise(items: AppNotification[]): NotificationSummary {
      const byCategory = {
        jobs: 0,
        interviews: 0,
        applications: 0,
        ai: 0,
        recruiter: 0,
        system: 0,
      } satisfies Record<NotificationCategory, number>;

      for (const item of items) byCategory[item.category] += 1;

      return {
        total: items.length,
        unread: items.filter((item) => !item.read).length,
        byCategory,
      };
    },

    groupByDay(items: AppNotification[]) {
      const groups = new Map<string, AppNotification[]>();
      for (const item of items) {
        const key = new Date(item.createdAt).toDateString();
        groups.set(key, [...(groups.get(key) ?? []), item]);
      }
      return [...groups.entries()].map(([day, entries]) => ({ day, entries }));
    },

    relativeTime(iso: string) {
      const diff = Date.now() - new Date(iso).getTime();
      const minutes = Math.round(diff / 60000);
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.round(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    },
  };
}

export const notificationService = createNotificationService();
