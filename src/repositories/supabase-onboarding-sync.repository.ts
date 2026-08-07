/**
 * Onboarding → production tables synchronisation.
 *
 * Onboarding collects data into a single JSON blob (`onboarding_progress.onboarding_data`)
 * so a partially finished flow stays resumable. That blob is *progress*, never the
 * source of truth: this repository projects it into the real production tables
 * (candidate_profiles, skills, education, experience, projects,
 * candidate_preferences, profile_completion, recruiters, companies) so every
 * dashboard, analyzer and analytics view reads the same rows — no duplicates,
 * no onboarding-only copies.
 *
 * List sections (skills/education/experience/projects) are replaced wholesale for
 * the user: the onboarding step owns that list, so replace is the correct
 * idempotent semantic and avoids duplicated rows on repeated saves.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { OnboardingData } from "@/types/candidate";
import type { RecruiterOnboardingData } from "@/types/recruiter";

/** Normalises loose onboarding date input ("2019", "2019-05") to a Postgres date. */
function toDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function clean(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface OnboardingSyncRepository {
  syncCandidate(data: OnboardingData): Promise<void>;
  syncRecruiter(data: RecruiterOnboardingData): Promise<void>;
}

export class SupabaseOnboardingSyncRepository
  extends BaseRepository
  implements OnboardingSyncRepository
{
  private fail(message: string): never {
    throw new AppError(message, "SERVER_ERROR", 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table(name: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.client.from(name) as any;
  }

  /* ------------------------------- Candidate ------------------------------ */

  async syncCandidate(data: OnboardingData): Promise<void> {
    const userId = await this.getCurrentUserId();
    const now = new Date().toISOString();

    /* Profile (basic info + photo) */
    if (data.basic || data.photoDataUrl) {
      const payload: Record<string, unknown> = { user_id: userId, updated_at: now };
      if (data.basic) {
        payload.full_name = data.basic.fullName ?? "";
        payload.headline = clean(data.basic.headline);
        payload.phone = clean(data.basic.phone);
        payload.location = clean(data.basic.location);
        payload.bio = clean(data.basic.bio);
      }
      if (data.photoDataUrl) payload.profile_photo_url = data.photoDataUrl;

      const { error } = await this.table("candidate_profiles").upsert(payload, {
        onConflict: "user_id",
      });
      if (error) this.fail(error.message);
    }

    /* Skills */
    if (data.skills) {
      await this.replaceRows(
        "skills",
        userId,
        data.skills
          .map((name) => clean(name))
          .filter((name): name is string => Boolean(name))
          .map((name) => ({
            user_id: userId,
            skill_name: name,
            proficiency_level: "intermediate",
          })),
      );
    }

    /* Education */
    if (data.education) {
      await this.replaceRows(
        "education",
        userId,
        data.education
          .filter((item) => clean(item.institution) || clean(item.degree))
          .map((item) => ({
            user_id: userId,
            institution: item.institution ?? "",
            degree: item.degree ?? "",
            field_of_study: clean(item.field),
            grade: clean(item.grade),
            start_date: toDate(item.startYear),
            end_date: toDate(item.endYear),
          })),
      );
    }

    /* Experience */
    if (data.experience) {
      await this.replaceRows(
        "experience",
        userId,
        data.experience
          .filter((item) => clean(item.company) || clean(item.title))
          .map((item) => ({
            user_id: userId,
            company_name: item.company ?? "",
            job_title: item.title ?? "",
            location: clean(item.location),
            description: clean(item.summary),
            start_date: toDate(item.startDate),
            end_date: item.current ? null : toDate(item.endDate ?? null),
            currently_working: Boolean(item.current),
          })),
      );
    }

    /* Projects */
    if (data.projects) {
      await this.replaceRows(
        "projects",
        userId,
        data.projects
          .filter((item) => clean(item.name))
          .map((item) => ({
            user_id: userId,
            title: item.name ?? "",
            description: clean(item.description),
            technologies: item.tech ?? [],
            live_url: clean(item.url),
          })),
      );
    }

    /* Career preferences */
    if (data.preferences) {
      const preferences = data.preferences;
      const { error } = await this.table("candidate_preferences").upsert(
        {
          user_id: userId,
          desired_roles: preferences.desiredRoles ?? [],
          locations: preferences.locations ?? [],
          work_mode: preferences.workMode ?? "remote",
          min_salary: preferences.minSalary ?? 0,
          notice_period: clean(preferences.noticePeriod),
          open_to_relocate: Boolean(preferences.openToRelocate),
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
      if (error) this.fail(error.message);
    }
  }

  /**
   * Replace all rows of a per-user list table with the provided set.
   *
   * Onboarding autosave and the explicit "Save & continue" action can both fire
   * a sync for the same step. Concurrent delete+insert pairs are serialised by
   * `onboardingSyncService`'s per-role queue, and a duplicate-key result is
   * treated as success because the desired rows are already present.
   */
  private async replaceRows(
    table: string,
    userId: string,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    const { error: deleteError } = await this.table(table).delete().eq("user_id", userId);
    if (deleteError) this.fail(deleteError.message);

    if (rows.length === 0) return;

    const { error } = await this.table(table).insert(rows);
    if (error && error.code !== "23505") this.fail(error.message);
  }


  /* ------------------------------- Recruiter ------------------------------ */

  async syncRecruiter(data: RecruiterOnboardingData): Promise<void> {
    const userId = await this.getCurrentUserId();
    const now = new Date().toISOString();

    const recruiterPayload: Record<string, unknown> = {
      user_id: userId,
      updated_at: now,

      // Always provide a value: full_name and designation are NOT NULL
      // `recruiters`, but this sync can fire from autosave before the user
      // has reached the "profile" step, when `data.recruiter` is undefined.
      full_name: data.recruiter?.fullName?.trim() || "New Recruiter",
designation: data.recruiter?.jobTitle?.trim() || "Recruiter",
    };

    if (data.recruiter?.department)
  recruiterPayload.department = clean(data.recruiter.department);

if (data.recruiter?.workEmail)
  recruiterPayload.work_email = clean(data.recruiter.workEmail);

if (data.recruiter?.phone)
  recruiterPayload.phone = clean(data.recruiter.phone);
   if (data.company?.name) {
  recruiterPayload.company_name = clean(data.company.name);
}

if (data.company?.headquarters) {
  recruiterPayload.company_headquarters = clean(data.company.headquarters);
}
    if (data.links) {
      recruiterPayload.company_website = clean(data.links.website);
      recruiterPayload.linkedin_url = clean(data.links.linkedin);
    }
    if (data.industry) recruiterPayload.company_industry = clean(data.industry.primary);
    if (data.scale) recruiterPayload.company_size = clean(data.scale.employees);
    if (data.logoDataUrl) recruiterPayload.company_logo_url = data.logoDataUrl;
    if (data.hiring) {
      recruiterPayload.hiring_roles = data.hiring.roles ?? [];
      recruiterPayload.hiring_locations = data.hiring.locations ?? [];
      recruiterPayload.work_modes = data.hiring.workModes ?? [];
    }

    const { data: recruiterRow, error } = await this.table("recruiters")
      .upsert(recruiterPayload, { onConflict: "user_id" })
      .select("id")
      .single();
    if (error) this.fail(error.message);
    const recruiterId = (recruiterRow as { id: string } | null)?.id;
    if (!recruiterId) return;

    /* Company record — mirrored so hiring surfaces read one source of truth. */
    if (data.company || data.links || data.industry || data.scale || data.logoDataUrl) {
      const companyPayload: Record<string, unknown> = {
        recruiter_id: recruiterId,
        updated_at: now,
        // company_name is NOT NULL; this block can run from steps (logo,
        // website, industry, size) that fire before `data.company` exists.
        company_name: data.company?.name?.trim() || "New Company",
      };
      if (data.company) {
        companyPayload.description = clean(data.company.description ?? data.company.tagline);
        companyPayload.address = clean(data.company.headquarters);
      }
      if (data.links) companyPayload.website = clean(data.links.website);
      if (data.industry) companyPayload.industry = clean(data.industry.primary);
      if (data.scale) companyPayload.company_size = clean(data.scale.employees);
      if (data.logoDataUrl) companyPayload.logo_url = data.logoDataUrl;

      const { error: companyError } = await this.table("companies").upsert(companyPayload, {
        onConflict: "recruiter_id",
      });
      if (companyError) this.fail(companyError.message);
    }
  }
}