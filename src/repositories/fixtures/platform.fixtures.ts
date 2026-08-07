import type { AppNotification } from "@/types/notification";
import type {
  ComparisonRow,
  Invoice,
  PaymentMethod,
  Plan,
  Subscription,
  UsageMetric,
} from "@/types/billing";
import type { SuggestedPrompt } from "@/types/ai";

/* ------------------------------ Notifications ------------------------------ */

export const notificationFeedFixture: AppNotification[] = [
  {
    id: "nt1",
    category: "interviews",
    title: "Interview scheduled",
    description: "Northstar Analytics — technical round on 3 Aug, 11:00.",
    createdAt: "2026-07-30T09:00:00.000Z",
    read: false,
    href: "/candidate/interviews",
  },
  {
    id: "nt2",
    category: "jobs",
    title: "New 93% match",
    description: "Senior Frontend Engineer at Northstar Analytics fits your profile.",
    createdAt: "2026-07-30T07:10:00.000Z",
    read: false,
    href: "/candidate/jobs",
  },
  {
    id: "nt3",
    category: "ai",
    title: "Resume analysis ready",
    description: "Your latest resume scored 82 — 3 new suggestions available.",
    createdAt: "2026-07-29T16:42:00.000Z",
    read: false,
    href: "/candidate/resume-analyzer",
  },
  {
    id: "nt4",
    category: "applications",
    title: "Application moved to review",
    description: "Helio Labs is reviewing your Product Engineer application.",
    createdAt: "2026-07-29T11:05:00.000Z",
    read: true,
    href: "/candidate/applications",
  },
  {
    id: "nt5",
    category: "recruiter",
    title: "Recruiter viewed your profile",
    description: "A recruiter at Orbit Health opened your profile twice this week.",
    createdAt: "2026-07-28T13:20:00.000Z",
    read: true,
    href: "/candidate/profile",
  },
  {
    id: "nt6",
    category: "ai",
    title: "Weekly career insights",
    description: "Your interview readiness improved by 8 points.",
    createdAt: "2026-07-27T08:00:00.000Z",
    read: true,
    href: "/copilot",
  },
  {
    id: "nt7",
    category: "system",
    title: "Two-factor authentication available",
    description: "Add an extra layer of security to your CareerOS account.",
    createdAt: "2026-07-26T10:30:00.000Z",
    read: true,
    href: "/candidate/settings",
  },
  {
    id: "nt8",
    category: "jobs",
    title: "Saved job closing soon",
    description: "Frontend Lead at Lumen Cloud stops accepting applications in 2 days.",
    createdAt: "2026-07-25T09:15:00.000Z",
    read: true,
    href: "/candidate/jobs",
  },
];

/* --------------------------------- Billing --------------------------------- */

export const plansFixture: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start your search with the essentials.",
    price: { monthly: 0, yearly: 0, currency: "USD" },
    highlights: [
      "20 AI credits per month",
      "3 resume analyses",
      "15 job applications",
      "Basic match insights",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Everything you need to land the role.",
    price: { monthly: 19, yearly: 182, currency: "USD" },
    highlights: [
      "500 AI credits per month",
      "Unlimited resume analyses",
      "Unlimited applications",
      "AI Copilot with deep insights",
      "Priority recruiter visibility",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For hiring teams running at scale.",
    price: { monthly: 79, yearly: 758, currency: "USD" },
    highlights: [
      "Unlimited AI credits",
      "Unlimited recruiter seats",
      "Team pipelines & analytics",
      "SSO and audit logs",
      "Dedicated success manager",
    ],
  },
];

export const subscriptionFixture: Subscription = {
  planId: "free",
  status: "active",
  billingCycle: "monthly",
  renewsOn: "2026-08-28T00:00:00.000Z",
  seats: 1,
};

export const usageFixture: UsageMetric[] = [
  {
    key: "ai-credits",
    label: "AI credits",
    used: 14,
    limit: 20,
    unit: "credits",
    resetsOn: "2026-08-01T00:00:00.000Z",
  },
  {
    key: "resume-analyses",
    label: "Resume analyses",
    used: 2,
    limit: 3,
    unit: "analyses",
    resetsOn: "2026-08-01T00:00:00.000Z",
  },
  {
    key: "job-applications",
    label: "Job applications",
    used: 6,
    limit: 15,
    unit: "applications",
    resetsOn: "2026-08-01T00:00:00.000Z",
  },
  {
    key: "recruiter-seats",
    label: "Recruiter seats",
    used: 1,
    limit: 1,
    unit: "seats",
    resetsOn: "2026-08-01T00:00:00.000Z",
  },
];

export const invoicesFixture: Invoice[] = [
  {
    id: "inv-1042",
    number: "CO-1042",
    issuedAt: "2026-07-01T00:00:00.000Z",
    amount: 0,
    currency: "USD",
    status: "paid",
    description: "Free plan — July 2026",
  },
  {
    id: "inv-1021",
    number: "CO-1021",
    issuedAt: "2026-06-01T00:00:00.000Z",
    amount: 0,
    currency: "USD",
    status: "paid",
    description: "Free plan — June 2026",
  },
  {
    id: "inv-0998",
    number: "CO-0998",
    issuedAt: "2026-05-01T00:00:00.000Z",
    amount: 19,
    currency: "USD",
    status: "refunded",
    description: "Pro trial — May 2026",
  },
];

export const paymentMethodFixture: PaymentMethod | null = null;

export const comparisonFixture: ComparisonRow[] = [
  { label: "AI credits", free: "20 / month", pro: "500 / month", enterprise: "Unlimited" },
  { label: "Resume analyses", free: "3 / month", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "Job applications", free: "15 / month", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "AI Career Copilot", free: "Limited", pro: "Full access", enterprise: "Full access" },
  { label: "Recruiter seats", free: "1", pro: "3", enterprise: "Unlimited" },
  { label: "Pipeline analytics", free: "—", pro: "Standard", enterprise: "Advanced" },
  { label: "Priority visibility", free: "—", pro: "Included", enterprise: "Included" },
  { label: "SSO & audit logs", free: "—", pro: "—", enterprise: "Included" },
  { label: "Support", free: "Community", pro: "Priority email", enterprise: "Dedicated CSM" },
];

/* ------------------------------ Copilot prompts ----------------------------- */

export const candidatePromptsFixture: SuggestedPrompt[] = [
  {
    id: "cp1",
    label: "Improve my resume",
    prompt: "Review my resume summary and suggest three concrete rewrites for an ATS screen.",
    mode: "resume",
  },
  {
    id: "cp2",
    label: "Prepare me for an interview",
    prompt: "Give me a preparation plan for a senior frontend engineer technical interview.",
    mode: "interview",
  },
  {
    id: "cp3",
    label: "Build a 12-month roadmap",
    prompt: "Create a 12-month career roadmap to move from mid-level to senior engineer.",
    mode: "roadmap",
  },
  {
    id: "cp4",
    label: "Which skills should I learn?",
    prompt: "Based on frontend roles I'm targeting, which skills give the biggest return?",
    mode: "skills",
  },
  {
    id: "cp5",
    label: "Summarise my job matches",
    prompt: "Summarise the type of roles I should prioritise and why.",
    mode: "jobs",
  },
];

export const recruiterPromptsFixture: SuggestedPrompt[] = [
  {
    id: "rp1",
    label: "Improve this job post",
    prompt: "Rewrite my senior frontend job description to increase qualified applicants.",
    mode: "jobs",
  },
  {
    id: "rp2",
    label: "Draft screening questions",
    prompt: "Draft five screening questions for a senior frontend engineer role.",
    mode: "interview",
  },
  {
    id: "rp3",
    label: "Diagnose my pipeline",
    prompt: "My pipeline stalls at the interview stage. What should I investigate?",
    mode: "insights",
  },
  {
    id: "rp4",
    label: "Compare shortlisted candidates",
    prompt: "How should I compare shortlisted candidates fairly for a frontend role?",
    mode: "chat",
  },
];
