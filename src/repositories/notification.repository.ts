import {
  notificationFeedFixture,
} from "@/repositories/fixtures/platform.fixtures";
import type {
  AppNotification,
  NotificationCategory,
} from "@/types/notification";

/**
 * Data source boundary for the global notification center.
 * Swapping this for a backend implementation must not touch services or UI.
 */
export interface NotificationRepository {
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<AppNotification[]>;
  markAllRead(): Promise<AppNotification[]>;
  clearAll(): Promise<AppNotification[]>;
  push(
    notification: Omit<AppNotification, "id" | "createdAt" | "read"> & { createdAt?: string },
  ): Promise<AppNotification[]>;
}

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

let store: AppNotification[] = notificationFeedFixture.map((item) => ({ ...item }));

function sorted(items: AppNotification[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const localNotificationRepository: NotificationRepository = {
  async list() {
    await delay();
    return sorted(store);
  },
  async markRead(id) {
    await delay(120);
    store = store.map((item) => (item.id === id ? { ...item, read: true } : item));
    return sorted(store);
  },
  async markAllRead() {
    await delay(140);
    store = store.map((item) => ({ ...item, read: true }));
    return sorted(store);
  },
  async clearAll() {
    await delay(140);
    store = [];
    return [];
  },
  async push(notification) {
    await delay(80);
    const next: AppNotification = {
      ...notification,
      id: `nt-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: notification.createdAt ?? new Date().toISOString(),
      read: false,
    };
    store = [next, ...store];
    return sorted(store);
  },
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "jobs",
  "interviews",
  "applications",
  "ai",
  "recruiter",
  "system",
];
