import { localCandidateRepository, type CandidateRepository } from "@/repositories/candidate.repository";
import { localHiringRepository, type HiringRepository } from "@/repositories/hiring.repository";
import type {
  Applicant,
  Interview as HiringInterview,
  Job as HiringJob,
} from "@/types/hiring";
import type { Interview as CandidateInterview, Job as CandidateJob } from "@/types/candidate";
import type { SearchResult } from "@/types/search";

/**
 * Static destinations (settings + AI tools) that are always searchable.
 * Kept in the repository layer so the service stays transformation-only.
 */
const staticResults: SearchResult[] = [
  {
    id: "s-copilot",
    entity: "ai-tool",
    title: "AI Career Copilot",
    subtitle: "Chat, roadmaps, resume and interview guidance",
    href: "/copilot",
    keywords: ["ai", "copilot", "chat", "assistant", "roadmap"],
  },
  {
    id: "s-resume-analyzer",
    entity: "ai-tool",
    title: "Resume analyzer",
    subtitle: "Score your resume against ATS checks",
    href: "/candidate/resume-analyzer",
    keywords: ["ai", "resume", "ats", "score", "analysis"],
  },
  {
    id: "s-skill-gap",
    entity: "ai-tool",
    title: "Skill gap analysis",
    subtitle: "See what to learn next for your target role",
    href: "/candidate/skill-gap",
    keywords: ["ai", "skills", "gap", "learning"],
  },
  {
    id: "s-recruiter-ai",
    entity: "ai-tool",
    title: "AI hiring workspace",
    subtitle: "Rank candidates and draft screening material",
    href: "/recruiter/ai",
    keywords: ["ai", "ranking", "screening", "recruiter"],
  },
  {
    id: "s-notifications",
    entity: "setting",
    title: "Notification center",
    subtitle: "Activity feed and alert preferences",
    href: "/notifications",
    keywords: ["notifications", "alerts", "activity"],
  },
  {
    id: "s-billing",
    entity: "setting",
    title: "Subscription & billing",
    subtitle: "Plan, usage, invoices and payment method",
    href: "/billing",
    keywords: ["billing", "plan", "subscription", "invoice", "upgrade", "payment"],
  },
  {
    id: "s-candidate-settings",
    entity: "setting",
    title: "Candidate settings",
    subtitle: "Account, security and notification preferences",
    href: "/candidate/settings",
    keywords: ["settings", "account", "security", "preferences"],
  },
  {
    id: "s-recruiter-settings",
    entity: "setting",
    title: "Recruiter settings",
    subtitle: "Company profile, team and hiring preferences",
    href: "/recruiter/settings",
    keywords: ["settings", "company", "team", "recruiter"],
  },
];

export interface SearchRepository {
  getIndex(): Promise<SearchResult[]>;
}

function unique(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.id)) return false;
    seen.add(result.id);
    return true;
  });
}

export function createSearchRepository(
  candidate: CandidateRepository = localCandidateRepository,
  hiring: HiringRepository = localHiringRepository,
): SearchRepository {
  return {
    async getIndex() {
      const [jobs, interviews, hiringJobs, applicants, hiringInterviews] = await Promise.all([
        candidate.getJobs().catch(() => [] as CandidateJob[]),
        candidate.getInterviews().catch(() => [] as CandidateInterview[]),
        hiring.listJobs().catch(() => [] as HiringJob[]),
        hiring.listApplicants().catch(() => [] as Applicant[]),
        hiring.listInterviews().catch(() => [] as HiringInterview[]),
      ]);

      const jobResults: SearchResult[] = jobs.map((job) => ({
        id: `job-${job.id}`,
        entity: "job",
        title: job.title,
        subtitle: `${job.company} · ${job.location}`,
        href: "/candidate/jobs",
        keywords: [job.company, job.location, ...job.skills],
      }));

      const companyResults: SearchResult[] = unique(
        jobs.map((job) => ({
          id: `company-${job.company.toLowerCase().replace(/\s+/g, "-")}`,
          entity: "company" as const,
          title: job.company,
          subtitle: `${job.location} · hiring on CareerOS`,
          href: "/candidate/jobs",
          keywords: [job.location, job.title],
        })),
      );

      const recruiterJobResults: SearchResult[] = hiringJobs.map((job) => ({
        id: `rjob-${job.id}`,
        entity: "job",
        title: job.title,
        subtitle: `${job.location} · ${job.applicantCount} applicants`,
        href: "/recruiter/jobs",
        keywords: [job.location, job.department, job.status],
      }));

      const candidateResults: SearchResult[] = applicants.map((applicant) => ({
        id: `cand-${applicant.id}`,
        entity: "candidate",
        title: applicant.name,
        subtitle: `${applicant.headline} · ${applicant.stage}`,
        href: "/recruiter/applicants",
        keywords: [applicant.headline, applicant.stage, ...applicant.skills],
      }));

      const interviewResults: SearchResult[] = [
        ...interviews.map((interview) => ({
          id: `int-${interview.id}`,
          entity: "interview" as const,
          title: `${interview.round} — ${interview.jobTitle}`,
          subtitle: `${interview.company} · ${new Date(interview.scheduledAt).toLocaleDateString()}`,
          href: "/candidate/interviews",
          keywords: [interview.company, interview.mode, interview.status],
        })),
        ...hiringInterviews.map((interview) => ({
          id: `rint-${interview.id}`,
          entity: "interview" as const,
          title: `${interview.applicantName} — ${interview.jobTitle}`,
          subtitle: `${interview.stage} · ${new Date(interview.scheduledAt).toLocaleDateString()}`,
          href: "/recruiter/interviews",
          keywords: [interview.stage, interview.mode, interview.state],
        })),
      ];

      return unique([
        ...jobResults,
        ...recruiterJobResults,
        ...candidateResults,
        ...companyResults,
        ...interviewResults,
        ...staticResults,
      ]);
    },
  };
}

export const localSearchRepository = createSearchRepository();
