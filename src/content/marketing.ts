import {
  BarChart3,
  BrainCircuit,
  Briefcase,
  FileSearch,
  Gauge,
  LayoutDashboard,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export const FEATURES = [
  {
    icon: FileSearch,
    title: "Resume Intelligence",
    description:
      "Every resume is parsed, scored and rewritten against the role you actually want — not a generic template.",
  },
  {
    icon: Target,
    title: "AI Match Score",
    description:
      "Explainable scoring across skills, seniority and trajectory so both sides know why a match works.",
  },
  {
    icon: BrainCircuit,
    title: "Career Copilot",
    description:
      "A copilot that knows your history and answers with next steps, not generic advice.",
  },
  {
    icon: Workflow,
    title: "Hiring Pipeline",
    description:
      "Drag-free pipeline stages, interview scheduling and structured feedback in one place.",
  },
  {
    icon: BarChart3,
    title: "Career Analytics",
    description:
      "Track applications, funnel drop-off and time-to-hire with dashboards built for decisions.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade Security",
    description:
      "Row-level access, audit-ready records and encrypted document storage from day one.",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Build your career profile",
    description:
      "Import a resume or fill guided steps — CareerOS structures every skill, project and role.",
    icon: LayoutDashboard,
  },
  {
    step: "02",
    title: "Let the AI analyze",
    description: "Resume score, skill gaps and market positioning are generated in seconds.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Match with intent",
    description:
      "Candidates see roles that fit; recruiters see shortlists with reasoning attached.",
    icon: Radar,
  },
  {
    step: "04",
    title: "Run the whole process",
    description: "Applications, interviews, feedback and analytics live in one operating system.",
    icon: Gauge,
  },
] as const;

export const CANDIDATE_BENEFITS = [
  "AI resume scoring with line-level rewrite suggestions",
  "Personalised role recommendations with match reasoning",
  "One dashboard for applications, interviews and offers",
  "Skill gap analysis mapped to real market demand",
  "Interview preparation tailored to each company",
] as const;

export const RECRUITER_BENEFITS = [
  "Shortlists ranked by explainable AI match score",
  "Structured pipeline from screening to offer",
  "Team collaboration with shared scorecards",
  "Hiring analytics: funnel, velocity and source quality",
  "Bulk screening that removes hours of manual review",
] as const;

export const AI_CAPABILITIES = [
  {
    icon: Zap,
    title: "Instant resume parsing",
    copy: "Structured data from any PDF or DOCX in under 5 seconds.",
  },
  {
    icon: Target,
    title: "Explainable matching",
    copy: "Every score comes with the signals behind it.",
  },
  {
    icon: MessagesSquare,
    title: "Conversational copilot",
    copy: "Ask about your next move, get an actionable plan.",
  },
  {
    icon: Briefcase,
    title: "Job description generation",
    copy: "Bias-checked postings written from a short brief.",
  },
] as const;

export const SOCIAL_PROOF = [
  {
    quote:
      "We cut screening time by two thirds. The match reasoning means our hiring managers actually trust the shortlist.",
    name: "Ananya Deshpande",
    role: "Head of Talent, Northwind",
  },
  {
    quote:
      "It's the first tool that treats a job search like a system. Resume, matching and interviews finally live together.",
    name: "Marcus Lee",
    role: "Staff Engineer",
  },
  {
    quote:
      "Our pipeline analytics used to live in spreadsheets. Now it's live, shared and accurate.",
    name: "Sofia Alvarez",
    role: "Recruiting Ops Lead",
  },
] as const;

export const STATS = [
  { value: "3.4x", label: "More interview invites" },
  { value: "68%", label: "Faster candidate screening" },
  { value: "12k+", label: "Careers managed" },
  { value: "< 5s", label: "Resume analysis time" },
] as const;

export const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    description: "For candidates getting their search organised.",
    features: [
      "Career profile & resume storage",
      "3 AI resume analyses / month",
      "Job matching feed",
      "Application tracker",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "per month",
    description: "For candidates who want the full AI advantage.",
    features: [
      "Unlimited AI resume rewrites",
      "Explainable match scores",
      "Career Copilot & interview prep",
      "Priority recruiter visibility",
      "Advanced career analytics",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Teams",
    price: "$99",
    cadence: "per month",
    description: "For recruiting teams running real pipelines.",
    features: [
      "Unlimited job postings",
      "AI shortlisting & bulk screening",
      "Pipeline, interviews & scorecards",
      "Hiring analytics dashboards",
      "Team roles & permissions",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
] as const;

export const FAQS = [
  {
    question: "Is CareerOS a job board?",
    answer:
      "No. CareerOS is a career operating system. A job board lists openings; CareerOS manages your entire career or hiring process — profile, resume intelligence, matching, interviews, and analytics — with AI running through every step.",
  },
  {
    question: "How does the AI match score work?",
    answer:
      "We compare structured profile data against the structured requirements of a role across skills, seniority, domain and trajectory. Every score is explainable: you see the signals that raised or lowered it.",
  },
  {
    question: "Can recruiters and candidates use the same account?",
    answer:
      "Each account picks a role — Candidate or Recruiter — after signup. The workspace, navigation and modules adapt to that role, and you can switch from your profile menu.",
  },
  {
    question: "What happens to my resume data?",
    answer:
      "Documents are stored in encrypted storage with row-level access control. Only you, and recruiters you apply to, can access your profile data.",
  },
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. The Starter plan is free forever and includes profile, tracking and monthly AI analyses.",
  },
  {
    question: "Can our team try it before buying?",
    answer:
      "Yes. Teams accounts include a 14-day trial with full pipeline, AI shortlisting and analytics access.",
  },
] as const;

export const TRUSTED_BY = [
  "Northwind",
  "Lumen Labs",
  "Everline",
  "Kestrel",
  "Beacon Health",
  "Arcadia",
] as const;

export const CANDIDATE_ICON = Users;
export const RECRUITER_ICON = Briefcase;
