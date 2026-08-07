/**
 * Projects Service.
 *
 * Business logic layer for projects CRUD operations.
 * Delegates persistence to the ProjectsRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  ProjectDTO,
  ProjectsRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/repositories/supabase-projects.repository";
import { SupabaseProjectsRepository } from "@/repositories/supabase-projects.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a ProjectsService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createProjectsService(repository?: ProjectsRepository) {
  let resolved: ProjectsRepository | null = repository ?? null;

  const repo = (): ProjectsRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new project record for the current user.
     * Validates required fields before persisting.
     */
    async createProject(input: CreateProjectInput): Promise<ProjectDTO> {
      if (!input.title || input.title.trim().length < 2) {
        throw new AppError(
          "Project title must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().create({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        technologies: input.technologies ?? [],
        githubUrl: input.githubUrl?.trim() || null,
        liveUrl: input.liveUrl?.trim() || null,
        startDate: input.startDate?.trim() || null,
        endDate: input.currentlyActive ? null : input.endDate?.trim() || null,
        currentlyActive: input.currentlyActive ?? false,
      });
    },

    /**
     * Get all project records for the current user.
     */
    async getProjects(): Promise<ProjectDTO[]> {
      return repo().getAll();
    },

    /**
     * Get a single project record by ID.
     */
    async getProjectById(id: string): Promise<ProjectDTO | null> {
      return repo().getById(id);
    },

    /**
     * Update a project record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      if (input.title !== undefined && input.title.trim().length < 2) {
        throw new AppError(
          "Project title must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().update(id, {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.technologies !== undefined && { technologies: input.technologies }),
        ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl?.trim() || null }),
        ...(input.liveUrl !== undefined && { liveUrl: input.liveUrl?.trim() || null }),
        ...(input.startDate !== undefined && { startDate: input.startDate?.trim() || null }),
        ...(input.currentlyActive !== undefined && { currentlyActive: input.currentlyActive }),
        ...(input.currentlyActive === true
          ? { endDate: null }
          : input.endDate !== undefined && { endDate: input.endDate?.trim() || null }),
      });
    },

    /**
     * Delete a project record.
     */
    async deleteProject(id: string): Promise<void> {
      return repo().delete(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ProjectsRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Projects persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseProjectsRepository(client);
}

/** Singleton service instance */
export const projectsService = createProjectsService();

export type ProjectsService = ReturnType<typeof createProjectsService>;