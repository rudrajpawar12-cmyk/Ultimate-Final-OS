/**
 * Supabase-backed Projects repository.
 *
 * Implements CRUD operations for the projects table.
 * Each project record belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the projects table */
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

/** Domain-level project DTO */
export interface ProjectDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  currentlyActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a project record */
export interface CreateProjectInput {
  title: string;
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyActive?: boolean;
}

/** Input for updating a project record */
export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyActive?: boolean;
}

/**
 * Interface for Projects persistence operations.
 */
export interface ProjectsRepository {
  create(input: CreateProjectInput): Promise<ProjectDTO>;
  getAll(): Promise<ProjectDTO[]>;
  getById(id: string): Promise<ProjectDTO | null>;
  update(id: string, input: UpdateProjectInput): Promise<ProjectDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: ProjectRow): ProjectDTO {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    technologies: row.technologies ?? [],
    githubUrl: row.github_url,
    liveUrl: row.live_url,
    startDate: row.start_date,
    endDate: row.end_date,
    currentlyActive: row.currently_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of ProjectsRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseProjectsRepository
  extends BaseRepository
  implements ProjectsRepository
{
  private readonly TABLE = "projects";

  /**
   * Create a new project record for the authenticated user.
   */
  async create(input: CreateProjectInput): Promise<ProjectDTO> {
    const userId = await this.getCurrentUserId();

    const insertData: ProjectInsert = {
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      technologies: input.technologies ?? null,
      github_url: input.githubUrl ?? null,
      live_url: input.liveUrl ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      currently_active: input.currentlyActive ?? false,
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
      throw new AppError("Failed to create project record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as ProjectRow);
  }

  /**
   * Get all project records for the authenticated user.
   * Returns empty array if none exist.
   */
  async getAll(): Promise<ProjectDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: ProjectRow) => mapRowToDTO(row));
  }

  /**
   * Get a single project record by ID for the authenticated user.
   * Returns null if not found.
   */
  async getById(id: string): Promise<ProjectDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as ProjectRow) : null;
  }

  /**
   * Update a project record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: ProjectUpdate = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.technologies !== undefined && { technologies: input.technologies }),
      ...(input.githubUrl !== undefined && { github_url: input.githubUrl }),
      ...(input.liveUrl !== undefined && { live_url: input.liveUrl }),
      ...(input.startDate !== undefined && { start_date: input.startDate }),
      ...(input.endDate !== undefined && { end_date: input.endDate }),
      ...(input.currentlyActive !== undefined && { currently_active: input.currentlyActive }),
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
      throw new AppError("Project record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as ProjectRow);
  }

  /**
   * Delete a project record for the authenticated user.
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