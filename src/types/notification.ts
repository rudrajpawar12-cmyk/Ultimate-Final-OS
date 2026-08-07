export type NotificationCategory =
  | "jobs"
  | "interviews"
  | "applications"
  | "ai"
  | "recruiter"
  | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
}

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  jobs: "Jobs",
  interviews: "Interviews",
  applications: "Applications",
  ai: "AI",
  recruiter: "Recruiter",
  system: "System",
};
