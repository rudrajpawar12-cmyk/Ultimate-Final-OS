/**
 * Supabase-backed Resume Analysis repository.
 *
 * Implements CRUD operations for the resume_analyses table.
 * Each analysis record belongs exclusively to the authenticated user (RLS enforced).
 *
 * This repository performs database operations ONLY — no business logic.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the resume_analyses table */
type ResumeAnalysisRow = Database["public"]["Tables"]["resume_analyses"]["Row"];
type ResumeAnalysisInsert = Database["public"]["Tables"]["resume_analyses"]["Insert"];
type ResumeAnalysisUpdate = Database["public"]["Tables"]["resume_analyses"]["Update"];

/** Domain-level resume analysis DTO */
export interface ResumeAnalysisDTO {
  id: string;
  userId: string;
  resumeId: string;
  overallScore: number;
  sectionScores: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  atsCompatibility: number | null;
  keywordAnalysis: Record<string, unknown> | null;
  rawAnalysis: Record<string, unknown> | null;
  status: string;
  targetRole: string | null;
  modelVersion: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a resume analysis record */
export interface CreateResumeAnalysisInput {
  resumeId: string;
  overallScore?: number;
  sectionScores?: Record<string, unknown>;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  atsCompatibility?: number | null;
  keywordAnalysis?: Record<string, unknown> | null;
  rawAnalysis?: Record<string, unknown> | null;
  status?: string;
  targetRole?: string | null;
  modelVersion?: string | null;
  completedAt?: string | null;
}

/** Input for updating a resume analysis record */
export interface UpdateResumeAnalysisInput {
  overallScore?: number;
  sectionScores?: Record<string, unknown>;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  atsCompatibility?: number | null;
  keywordAnalysis?: Record<string, unknown> | null;
  rawAnalysis?: Record<string, unknown> | null;
  status?: string;
  targetRole?: string | null;
  modelVersion?: string | null;
  completedAt?: string | null;
}

/**
 * Interface for Resume Analysis persistence operations.
 */
export interface ResumeAnalysisRepository {
  create(input: CreateResumeAnalysisInput): Promise<ResumeAnalysisDTO>;
  getByResumeId(resumeId: string): Promise<ResumeAnalysisDTO[]>;
  getLatest(resumeId: string): Promise<ResumeAnalysisDTO | null>;
  update(id: string, input: UpdateResumeAnalysisInput): Promise<ResumeAnalysisDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: ResumeAnalysisRow): ResumeAnalysisDTO {
  return {
    id: row.id,
    userId: row.user_id,
    resumeId: row.resume_id,
    overallScore: row.overall_score,
    sectionScores: row.section_scores,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    suggestions: row.suggestions,
    atsCompatibility: row.ats_compatibility,
    keywordAnalysis: row.keyword_analysis,
    rawAnalysis: row.raw_analysis,
    status: row.status,
    targetRole: row.target_role,
    modelVersion: row.model_version,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of ResumeAnalysisRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseResumeAnalysisRepository
  extends BaseRepository
  implements ResumeAnalysisRepository
{
  private readonly TABLE = "resume_analyses";

  /**
   * Create a new resume analysis record for the authenticated user.
   */
  async create(input: CreateResumeAnalysisInput): Promise<ResumeAnalysisDTO> {
    const userId = await this.getCurrentUserId();

    const insertData: ResumeAnalysisInsert = {
      user_id: userId,
      resume_id: input.resumeId,
      overall_score: input.overallScore ?? 0,
      section_scores: input.sectionScores ?? {},
      strengths: input.strengths ?? [],
      weaknesses: input.weaknesses ?? [],
      suggestions: input.suggestions ?? [],
      ats_compatibility: input.atsCompatibility ?? null,
      keyword_analysis: input.keywordAnalysis ?? null,
      raw_analysis: input.rawAnalysis ?? null,
      status: input.status ?? "pending",
      target_role: input.targetRole ?? null,
      model_version: input.modelVersion ?? null,
      completed_at: input.completedAt ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    if (!data) {
      throw new AppError("Failed to create resume analysis record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as ResumeAnalysisRow);
  }

  /**
   * Get all analysis records for a specific resume belonging to the authenticated user.
   * Returns empty array if none exist. Ordered by most recent first.
   */
  async getByResumeId(resumeId: string): Promise<ResumeAnalysisDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: ResumeAnalysisRow) => mapRowToDTO(row));
  }

  /**
   * Get the most recent analysis for a specific resume belonging to the authenticated user.
   * Returns null if no analysis exists.
   */
  async getLatest(resumeId: string): Promise<ResumeAnalysisDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as ResumeAnalysisRow) : null;
  }

  /**
   * Update a resume analysis record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateResumeAnalysisInput): Promise<ResumeAnalysisDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: ResumeAnalysisUpdate = {
      ...(input.overallScore !== undefined && { overall_score: input.overallScore }),
      ...(input.sectionScores !== undefined && { section_scores: input.sectionScores }),
      ...(input.strengths !== undefined && { strengths: input.strengths }),
      ...(input.weaknesses !== undefined && { weaknesses: input.weaknesses }),
      ...(input.suggestions !== undefined && { suggestions: input.suggestions }),
      ...(input.atsCompatibility !== undefined && { ats_compatibility: input.atsCompatibility }),
      ...(input.keywordAnalysis !== undefined && { keyword_analysis: input.keywordAnalysis }),
      ...(input.rawAnalysis !== undefined && { raw_analysis: input.rawAnalysis }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.targetRole !== undefined && { target_role: input.targetRole }),
      ...(input.modelVersion !== undefined && { model_version: input.modelVersion }),
      ...(input.completedAt !== undefined && { completed_at: input.completedAt }),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw new AppError(
        error.message,
        error.code === "PGRST116" ? "NOT_FOUND" : "SERVER_ERROR",
        error.code === "PGRST116" ? 404 : 500,
      );
    }

    if (!data) {
      throw new AppError("Resume analysis record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as ResumeAnalysisRow);
  }

  /**
   * Delete a resume analysis record for the authenticated user.
   */
  async delete(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}