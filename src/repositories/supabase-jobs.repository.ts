import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import type { Job, JobDraft, JobStatus } from "@/types/hiring";

// Fallback interfaces if 'jobs' is not yet present in generated Database['public']['Tables']
interface FallbackJobRow {
  id: string;
  recruiter_id: string;
  title: string;
  department: string | null;
  employment_type: string | null;
  workplace_type: string | null;
  location: string | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string | null;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  skills: string[] | null;
  status: string;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface FallbackJobInsert {
  id?: string;
  recruiter_id: string;
  title: string;
  department?: string | null;
  employment_type?: string | null;
  workplace_type?: string | null;
  location?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  currency?: string | null;
  description?: string;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  skills?: string[] | null;
  status?: string;
  application_deadline?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FallbackJobUpdate extends Partial<FallbackJobInsert> {}

type Tables = Database["public"]["Tables"];

type JobRow = "jobs" extends keyof Tables
  ? Tables[Extract<keyof Tables, "jobs">]["Row"]
  : FallbackJobRow;

type JobInsert = "jobs" extends keyof Tables
  ? Tables[Extract<keyof Tables, "jobs">]["Insert"]
  : FallbackJobInsert;

type JobUpdate = "jobs" extends keyof Tables
  ? Tables[Extract<keyof Tables, "jobs">]["Update"]
  : FallbackJobUpdate;

export interface JobsRepository {
  create(job: JobDraft, recruiterId: string): Promise<Job>;
  getById(id: string): Promise<Job | null>;
  getByRecruiter(recruiterId: string): Promise<Job[]>;
  update(id: string, patch: Partial<JobDraft>): Promise<Job>;
  delete(id: string): Promise<void>;
}

function mapRow(row: JobRow): Job {
  return {
    id: row.id,

    title: row.title,

    department: row.department ?? "",

    location: row.location ?? "",

    workMode: (row.workplace_type as Job["workMode"]) ?? "remote",

    employmentType: row.employment_type ?? "",

    status: row.status as JobStatus,

    experienceMin: 0,

    experienceMax: 0,

    salaryMin: row.min_salary ?? 0,

    salaryMax: row.max_salary ?? 0,

    salaryCurrency: row.currency ?? "INR",

    skills: row.skills ?? [],

    description: row.description,

    responsibilities: row.responsibilities
      ? row.responsibilities.split("\n")
      : [],

    requirements: row.requirements
      ? row.requirements.split("\n")
      : [],

    benefits: row.benefits
      ? row.benefits.split("\n")
      : [],

    hiringTeam: [],

    screeningQuestions: [],

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    closingDate: row.application_deadline ?? undefined,

    applicantCount: 0,

    interviewCount: 0,

    offerCount: 0,

    hiredCount: 0,

    views: 0,

    timeline: [],
  };
}

export class SupabaseJobsRepository
  extends BaseRepository
  implements JobsRepository
{
  private readonly TABLE = "jobs";
  async getCurrentRecruiterId(): Promise<string> {
  const userId = await this.getCurrentUserId();

  const { data, error } = await (this.client
  .from("recruiters") as any)
  .select("id")
  .eq("user_id", userId)
  .single();

if (error || !data) {
  throw new AppError("Recruiter profile not found", "NOT_FOUND", 404);
}

return data.id as string;
}

  async create(job: JobDraft, recruiterId: string): Promise<Job> {
    await this.getCurrentUserId();

    const payload: JobInsert = {
      recruiter_id: recruiterId,

      title: job.title,

      department: job.department,

      employment_type: job.employmentType,

      workplace_type: job.workMode,

      location: job.location,

      min_salary: job.salaryMin,

      max_salary: job.salaryMax,

      currency: job.salaryCurrency,

      description: job.description,

      responsibilities: job.responsibilities.join("\n"),

      requirements: job.requirements.join("\n"),

      benefits: job.benefits.join("\n"),

      skills: job.skills,

      status: job.status,

      application_deadline: job.closingDate ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return mapRow(data as JobRow);
  }

  async getById(id: string): Promise<Job | null> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRow(data as JobRow) : null;
  }

  async getByRecruiter(recruiterId: string): Promise<Job[]> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("recruiter_id", recruiterId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data as JobRow[]).map(mapRow);
  }

  async update(id: string, patch: Partial<JobDraft>): Promise<Job> {
    await this.getCurrentUserId();

    const payload: JobUpdate = {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.department !== undefined && { department: patch.department }),
      ...(patch.employmentType !== undefined && {
        employment_type: patch.employmentType,
      }),
      ...(patch.workMode !== undefined && {
        workplace_type: patch.workMode,
      }),
      ...(patch.location !== undefined && {
        location: patch.location,
      }),
      ...(patch.salaryMin !== undefined && {
        min_salary: patch.salaryMin,
      }),
      ...(patch.salaryMax !== undefined && {
        max_salary: patch.salaryMax,
      }),
      ...(patch.salaryCurrency !== undefined && {
        currency: patch.salaryCurrency,
      }),
      ...(patch.description !== undefined && {
        description: patch.description,
      }),
      ...(patch.responsibilities !== undefined && {
        responsibilities: patch.responsibilities.join("\n"),
      }),
      ...(patch.requirements !== undefined && {
        requirements: patch.requirements.join("\n"),
      }),
      ...(patch.benefits !== undefined && {
        benefits: patch.benefits.join("\n"),
      }),
      ...(patch.skills !== undefined && {
        skills: patch.skills,
      }),
      ...(patch.status !== undefined && {
        status: patch.status,
      }),
      ...(patch.closingDate !== undefined && {
        application_deadline: patch.closingDate,
      }),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return mapRow(data as JobRow);
  }

  async delete(id: string): Promise<void> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("id", id);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}