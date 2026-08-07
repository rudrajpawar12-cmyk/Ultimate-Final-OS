import {
  BarChart3,
  Briefcase,
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import type { NavGroup } from "@/components/layout/dashboard-layout";

/**
 * Single source of truth for the recruiter workspace navigation.
 */
export const recruiterNav: NavGroup[] = [
  {
    label: "Hiring",
    items: [
      { title: "Overview", url: "/recruiter", icon: LayoutDashboard },
      { title: "Jobs", url: "/recruiter/jobs", icon: Briefcase },
      { title: "Applicants", url: "/recruiter/applicants", icon: Users },
      { title: "Pipeline", url: "/recruiter/pipeline", icon: KanbanSquare },
    ],
  },
  {
    label: "Interviews",
    items: [{ title: "Interviews", url: "/recruiter/interviews", icon: CalendarClock }],
  },
  {
    label: "Intelligence",
    items: [
      { title: "AI workspace", url: "/recruiter/ai", icon: Sparkles },
      { title: "Analytics", url: "/recruiter/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Settings", url: "/recruiter/settings", icon: Settings }],
  },
];