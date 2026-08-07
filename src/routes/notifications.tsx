import { createFileRoute } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

import { candidateNav } from "@/components/candidate/candidate-nav";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { recruiterNav } from "@/components/recruiter/recruiter-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationActions, useNotifications } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notification.service";
import {
  NOTIFICATION_CATEGORY_LABEL,
  type NotificationCategory,
} from "@/types/notification";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notification center — CareerOS" },
      {
        name: "description",
        content: "Every job, interview, application and AI update in one activity feed.",
      },
      { property: "og:title", content: "Notification center — CareerOS" },
      { property: "og:description", content: "One feed for all CareerOS activity." },
    ],
  }),
  component: NotificationsPage,
});

const FILTERS: (NotificationCategory | "all")[] = [
  "all",
  "jobs",
  "applications",
  "interviews",
  "ai",
  "recruiter",
  "system",
];

function NotificationsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useNotifications();
  const { markRead, markAllRead, clearAll } = useNotificationActions();
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const items = data ?? [];
  const summary = notificationService.summarise(items);
  const filtered = notificationService.filter(items, { category, unreadOnly });
  const groups = notificationService.groupByDay(filtered);

  return (
    <ProtectedRoute>
      <DashboardLayout
        groups={user?.role === "recruiter" ? recruiterNav : candidateNav}
        breadcrumbs={[{ label: "Workspace" }, { label: "Notifications" }]}
      >
        <SectionHeader
          align="left"
          title="Notification center"
          description={`${summary.unread} unread of ${summary.total} updates`}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={summary.unread === 0}
              >
                <Check className="size-4" /> Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAll.mutate()}
                disabled={items.length === 0}
              >
                <Trash2 className="size-4" /> Clear
              </Button>
            </div>
          }
        />

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={category} onValueChange={(value) => setCategory(value as typeof category)}>
              <TabsList className="flex-wrap">
                {FILTERS.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {value === "all" ? "All" : NOTIFICATION_CATEGORY_LABEL[value]}
                    {value !== "all" && summary.byCategory[value] > 0 && (
                      <span className="ms-1.5 text-xs text-muted-foreground">
                        {summary.byCategory[value]}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly((value) => !value)}
            >
              Unread only
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Couldn't load notifications"
              description="Retry in a moment."
              onRetry={() => void refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nothing here"
              description="Try a different filter — new activity appears in real time."
            />
          ) : (
            groups.map((group) => (
              <section key={group.day} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {new Date(group.day).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                {group.entries.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "shadow-elevated border-border/70 transition-colors",
                      !item.read && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <Badge variant="outline" className="rounded-full text-[11px]">
                            {NOTIFICATION_CATEGORY_LABEL[item.category]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {notificationService.relativeTime(item.createdAt)}
                        </p>
                      </div>
                      {!item.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead.mutate(item.id)}
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </section>
            ))
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
