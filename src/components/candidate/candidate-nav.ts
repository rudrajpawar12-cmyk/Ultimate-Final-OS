import {
  BarChart3,
  Briefcase,
  CalendarClock,
  FileSearch,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import type { NavGroup } from "@/components/layout/dashboard-layout";

/**
 * Single source of truth for the candidate workspace navigation.
 */
export const candidateNav: NavGroup[] = [
  {
    label: "Career",
    items: [
      { title: "Overview", url: "/candidate", icon: LayoutDashboard },
      { title: "Profile", url: "/candidate/profile", icon: UserRound },
      { title: "Resume", url: "/candidate/resume", icon: FileText },
      { title: "Jobs", url: "/candidate/jobs", icon: Briefcase },
      { title: "Applications", url: "/candidate/applications", icon: Target },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Resume analyzer", url: "/candidate/resume-analyzer", icon: FileSearch },
      { title: "Skill gap", url: "/candidate/skill-gap", icon: Sparkles },
      { title: "Analytics", url: "/candidate/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Interviews",
    items: [
      { title: "Schedule", url: "/candidate/interviews", icon: CalendarClock },
      { title: "Preparation", url: "/candidate/interview-prep", icon: GraduationCap },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Settings", url: "/candidate/settings", icon: Settings }],
  },
];
