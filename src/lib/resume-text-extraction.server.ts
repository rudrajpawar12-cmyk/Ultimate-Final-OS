/**
 * Server-only resume text extraction (orchestration).
 *
 * Binary decoding lives in `resume-parsing.server.ts`; this module resolves the
 * stored file, decodes it, and falls back to the candidate's structured profile.
 *
 * Downloads the stored resume file from Supabase Storage and converts it to
 * plain text so the AI gateway analyses the candidate's real resume instead of
 * a placeholder. Falls back to a structured summary built from the candidate's
 * own Supabase profile rows when the binary cannot be decoded (for example an
 * image-only PDF).
 *
 * Pure JavaScript only: the server runtime is a Worker, so native parsers such
 * as pdf-parse or mammoth are not available.
 */

import {
  detectResumeFormat,
  extractPlainText,
  extractTextFromBytes,
} from "@/lib/resume-parsing.server";

const RESUME_BUCKET = "resumes";

/** Minimum number of characters that counts as a usable extraction. */
const MIN_USABLE_LENGTH = 200;

/** Hard cap so a huge resume never blows the model context window. */
const MAX_TEXT_LENGTH = 24_000;

interface ExtractionResult {
  /** Plain text handed to the AI gateway. */
  text: string;
  /** Where the text came from, for logging and diagnostics. */
  source: "file" | "profile" | "none";
}

/**
 * Collapses whitespace and trims the text to a model-safe length.
 */
function normalise(raw: string): string {
  const cleaned = raw
    .replace(/\u0000/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > MAX_TEXT_LENGTH ? cleaned.slice(0, MAX_TEXT_LENGTH) : cleaned;
}

/**
 * Builds a resume-shaped text document from the candidate's stored profile.
 *
 * This is real user data pulled from Supabase, not fixture content. It keeps
 * the analysis meaningful when the uploaded file cannot be decoded.
 */
async function buildProfileText(
  admin: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, value: string) => Promise<{ data: unknown[] | null }>;
      };
    };
  },
  userId: string,
): Promise<string> {
  const rows = async (table: string, cols: string) => {
    const { data } = await admin.from(table).select(cols).eq("user_id", userId);
    return (data ?? []) as Record<string, unknown>[];
  };

  const [profiles, experience, education, skills, projects] = await Promise.all([
    rows("candidate_profiles", "full_name, headline, bio, location, phone, linkedin_url, github_url, portfolio_url"),
    rows("experience", "job_title, company_name, employment_type, location, start_date, end_date, currently_working, description"),
    rows("education", "institution, degree, field_of_study, start_date, end_date, grade"),
    rows("skills", "skill_name, proficiency_level, years_of_experience, category"),
    rows("projects", "title, description, technologies, github_url, live_url"),
  ]);

  const profile = profiles[0];
  if (!profile && experience.length === 0 && education.length === 0 && skills.length === 0) {
    return "";
  }

  const lines: string[] = [];
  if (profile) {
    lines.push(String(profile["full_name"] ?? "Candidate"));
    if (profile["headline"]) lines.push(String(profile["headline"]));
    const contact = [profile["location"], profile["phone"], profile["linkedin_url"], profile["github_url"], profile["portfolio_url"]]
      .filter(Boolean)
      .join(" | ");
    if (contact) lines.push(contact);
    if (profile["bio"]) lines.push("\nSUMMARY\n" + String(profile["bio"]));
  }

  if (experience.length > 0) {
    lines.push("\nEXPERIENCE");
    for (const row of experience) {
      const period = `${row["start_date"] ?? "?"} - ${row["currently_working"] ? "Present" : (row["end_date"] ?? "?")}`;
      lines.push(`${row["job_title"] ?? ""} — ${row["company_name"] ?? ""} (${period})`);
      if (row["location"] || row["employment_type"]) {
        lines.push([row["employment_type"], row["location"]].filter(Boolean).join(", "));
      }
      if (row["description"]) lines.push(String(row["description"]));
    }
  }

  if (education.length > 0) {
    lines.push("\nEDUCATION");
    for (const row of education) {
      lines.push(
        `${row["degree"] ?? ""} ${row["field_of_study"] ? `in ${row["field_of_study"]}` : ""} — ${row["institution"] ?? ""} (${row["start_date"] ?? "?"} - ${row["end_date"] ?? "?"})${row["grade"] ? `, ${row["grade"]}` : ""}`,
      );
    }
  }

  if (skills.length > 0) {
    lines.push("\nSKILLS");
    lines.push(
      skills
        .map((row) => {
          const years = row["years_of_experience"];
          return `${row["skill_name"]}${row["proficiency_level"] ? ` (${row["proficiency_level"]}` : ""}${years ? `, ${years}y` : ""}${row["proficiency_level"] ? ")" : ""}`;
        })
        .join(", "),
    );
  }

  if (projects.length > 0) {
    lines.push("\nPROJECTS");
    for (const row of projects) {
      const tech = Array.isArray(row["technologies"]) ? (row["technologies"] as string[]).join(", ") : "";
      lines.push(`${row["title"] ?? ""}${tech ? ` [${tech}]` : ""}`);
      if (row["description"]) lines.push(String(row["description"]));
      const links = [row["github_url"], row["live_url"]].filter(Boolean).join(" | ");
      if (links) lines.push(links);
    }
  }

  return lines.join("\n");
}

/**
 * Resolves the plain text for a stored resume, preferring the uploaded file and
 * falling back to the candidate's structured profile data.
 */
export async function extractResumeText(
  resumeId: string,
  userId: string,
): Promise<ExtractionResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as {
    from: (table: string) => any;
    storage: { from: (bucket: string) => { download: (path: string) => Promise<{ data: Blob | null }> } };
  };

  let fileText = "";
  const { data: resume } = await admin
    .from("resumes")
    .select("storage_path, mime_type, file_name")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .maybeSingle();

  const storagePath = resume?.storage_path as string | undefined;
  if (storagePath) {
    try {
      const { data: blob } = await admin.storage.from(RESUME_BUCKET).download(storagePath);
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const format = detectResumeFormat(
          resume?.mime_type ? String(resume.mime_type) : null,
          resume?.file_name ? String(resume.file_name) : storagePath,
        );
        fileText = await extractTextFromBytes(bytes, format);

        if (fileText.trim().length < MIN_USABLE_LENGTH) {
          const fallbackDecode = extractPlainText(bytes);
          if (fallbackDecode.trim().length > fileText.trim().length) fileText = fallbackDecode;
        }
      }
    } catch {
      fileText = "";
    }
  }

  const normalisedFile = normalise(fileText);
  if (normalisedFile.length >= MIN_USABLE_LENGTH) {
    return { text: normalisedFile, source: "file" };
  }

  const profileText = normalise(await buildProfileText(admin as never, userId));
  if (profileText.length > 0) {
    return {
      text: normalisedFile.length > 0 ? `${normalisedFile}\n\n${profileText}` : profileText,
      source: "profile",
    };
  }

  return { text: normalisedFile, source: normalisedFile.length > 0 ? "file" : "none" };
}
