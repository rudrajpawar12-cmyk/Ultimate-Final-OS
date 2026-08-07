/**
 * Shared AI domain types used by the Copilot workspace and the reusable
 * insight components. Nothing here is UI specific.
 */

export type CopilotMode =
  | "chat"
  | "resume"
  | "interview"
  | "roadmap"
  | "skills"
  | "jobs"
  | "insights";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mode?: CopilotMode;
  failed?: boolean;
}

export interface CopilotConversation {
  messages: CopilotMessage[];
  updatedAt: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  mode: CopilotMode;
}

export interface CopilotRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  mode: CopilotMode;
  audience: InsightAudience;
}

/* --------------------------------- Insights -------------------------------- */

export type InsightAudience = "candidate" | "recruiter";

export type InsightTone = "positive" | "warning" | "neutral";

export type CandidateInsightTopic =
  | "resume"
  | "career-growth"
  | "skill-gap"
  | "interview-readiness";

export type RecruiterInsightTopic =
  | "hiring-recommendations"
  | "candidate-match"
  | "recruitment-health"
  | "job-performance";

export type InsightTopic = CandidateInsightTopic | RecruiterInsightTopic;

export interface AiInsight {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  /** 0–100 model confidence for the recommendation. */
  confidence: number;
  tone: InsightTone;
  tags: string[];
}

export interface InsightRequest {
  audience: InsightAudience;
  topic: InsightTopic;
  context?: string;
}

export interface InsightResult {
  topic: InsightTopic;
  generatedAt: string;
  insights: AiInsight[];
}

export const INSIGHT_TOPIC_LABEL: Record<InsightTopic, string> = {
  resume: "Resume insights",
  "career-growth": "Career growth suggestions",
  "skill-gap": "Skill gap recommendations",
  "interview-readiness": "Interview readiness",
  "hiring-recommendations": "Hiring recommendations",
  "candidate-match": "Candidate match insights",
  "recruitment-health": "Recruitment health",
  "job-performance": "Job performance insights",
};
