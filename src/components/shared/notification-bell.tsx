import { Link } from "@tanstack/react-router";
import { Bell, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useNotificationActions, useNotifications } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notification.service";

/**
 * Global notification center trigger used in every dashboard header.
 */
export function NotificationBell() {
  const { data, isLoading } = useNotifications();
  const { markRead, markAllRead, clearAll } = useNotificationActions();
  const items = data ?? [];
  const unread = items.filter((item) => !item.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="relative inline-flex">
          <IconButton
            variant="ghost"
            size="icon"
            label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            tooltip={false}
          >
            <Bell />
          </IconButton>
          {unread > 0 && (
            <span
              className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground"
              aria-hidden="true"
            >
              {unread}
            </span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={unread === 0 || markAllRead.isPending}
            >
              <Check className="size-4" /> Read all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAll.mutate()}
              disabled={items.length === 0 || clearAll.isPending}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Clear notifications</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent py-10"
            title="You're all caught up"
            description="New activity will show up here."
          />
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className={cn("transition-colors hover:bg-muted/60", !item.read && "bg-primary/5")}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left"
                  onClick={() => !item.read && markRead.mutate(item.id)}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {notificationService.relativeTime(item.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/notifications">Open notification center</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
