/**
 * Supabase-backed notification center.
 *
 * Reads and mutates `public.notifications`, which is written both by the
 * application (in-app events) and by database triggers (application status
 * changes). RLS scopes every row to the signed-in user.
 */

import { AppError } from "@/lib/errors";
import { BaseRepository } from "@/repositories/base.repository";
import type { NotificationRepository } from "@/repositories/notification.repository";
import type { AppNotification, NotificationCategory } from "@/types/notification";

interface NotificationRow {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  link: string | null;
  read: boolean | null;
  created_at: string;
}

const CATEGORIES: NotificationCategory[] = [
  "jobs",
  "interviews",
  "applications",
  "ai",
  "recruiter",
  "system",
];

/** Database `type` values are singular; the UI works with plural categories. */
function toCategory(value: string | null): NotificationCategory {
  const normalized = (value ?? "system").toLowerCase();
  if (CATEGORIES.includes(normalized as NotificationCategory)) {
    return normalized as NotificationCategory;
  }
  if (normalized === "application") return "applications";
  if (normalized === "interview") return "interviews";
  if (normalized === "job") return "jobs";
  return "system";
}

function toType(category: NotificationCategory): string {
  if (category === "applications") return "application";
  if (category === "interviews") return "interview";
  if (category === "jobs") return "job";
  return category;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    category: toCategory(row.type),
    title: row.title,
    description: row.message ?? "",
    createdAt: row.created_at,
    read: row.read ?? false,
    href: row.link ?? undefined,
  };
}

export class SupabaseNotificationRepository
  extends BaseRepository
  implements NotificationRepository
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get notifications(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).from("notifications");
  }

  private fail(message: string): never {
    throw new AppError(message, "SERVER_ERROR", 500);
  }

  async list(): Promise<AppNotification[]> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.notifications
      .select("id, title, message, type, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) this.fail(error.message);
    return ((data ?? []) as NotificationRow[]).map(mapRow);
  }

  async markRead(id: string): Promise<AppNotification[]> {
    const userId = await this.getCurrentUserId();
    const { error } = await this.notifications
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) this.fail(error.message);
    return this.list();
  }

  async markAllRead(): Promise<AppNotification[]> {
    const userId = await this.getCurrentUserId();
    const { error } = await this.notifications
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) this.fail(error.message);
    return this.list();
  }

  async clearAll(): Promise<AppNotification[]> {
    const userId = await this.getCurrentUserId();
    const { error } = await this.notifications.delete().eq("user_id", userId);
    if (error) this.fail(error.message);
    return [];
  }

  async push(
    notification: Omit<AppNotification, "id" | "createdAt" | "read"> & { createdAt?: string },
  ): Promise<AppNotification[]> {
    const userId = await this.getCurrentUserId();
    const payload: Record<string, unknown> = {
      user_id: userId,
      title: notification.title,
      message: notification.description,
      type: toType(notification.category),
      link: notification.href ?? null,
    };
    if (notification.createdAt) payload["created_at"] = notification.createdAt;

    const { error } = await this.notifications.insert(payload);
    if (error) this.fail(error.message);
    return this.list();
  }
}
