import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { Logo } from "@/components/shared/logo";
import { CommandPalette, useCommandPalette } from "@/components/shared/command-palette";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UpgradeCard } from "@/components/ui/upgrade-cards";
import { useAuth } from "@/hooks/use-auth";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface Crumb {
  label: string;
  to?: string;
}

interface DashboardLayoutProps {
  groups: NavGroup[];
  breadcrumbs?: Crumb[];
  children: ReactNode;
  showUpgrade?: boolean;
}

export function DashboardLayout({
  groups,
  breadcrumbs = [],
  children,
  showUpgrade = true,
}: DashboardLayoutProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, signOut } = useAuth();
  const palette = useCommandPalette();

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-muted/25">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            {groups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          {showUpgrade && (
            <SidebarFooter className="group-data-[collapsible=icon]:hidden">
              <UpgradeCard description="Unlock unlimited AI credits and advanced insights." />
            </SidebarFooter>
          )}
        </Sidebar>

        <SidebarInset className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const last = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${crumb.to ?? "crumb"}-${crumb.label}-${index}`}>
                      <BreadcrumbItem>
                        {last || !crumb.to ? (
                          <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.to}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {last || !crumb.to ? null : <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-2 rounded-full text-muted-foreground sm:inline-flex"
                onClick={() => palette.setOpen(true)}
                aria-label="Open global search"
              >
                <Search className="size-4" />
                <span>Search</span>
                <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd>
              </Button>
              <ThemeToggle />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Open profile menu"
                  >
                    <UserAvatar name={user?.fullName ?? "CareerOS"} src={user?.avatarUrl} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate">{user?.fullName ?? "Guest"}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user?.email ?? "Not signed in"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/role-selection">Switch role</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/billing">Billing & plans</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
