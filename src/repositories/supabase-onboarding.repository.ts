/**
 * Supabase-backed Onboarding Progress repository.
 *
 * Implements upsert/get/reset operations for the onboarding_progress table.
 * Each user has exactly one onboarding progress record (1:1 relationship, RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import type { OnboardingFlowState } from "@/types/onboarding";

/** Shape returned from the onboarding_progress table */
type OnboardingProgressRow = Database["public"]["Tables"]["onboarding_progress"]["Row"];
type OnboardingProgressInsert = Database["public"]["Tables"]["onboarding_progress"]["Insert"];
type OnboardingProgressUpdate = Database["public"]["Tables"]["onboarding_progress"]["Update"];

/** Domain-level onboarding progress DTO */
export interface OnboardingProgressDTO {
  id: string;
  userId: string;
  currentStep: string;
  completedSteps: string[];
  onboardingData: Record<string, unknown>;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for Onboarding Progress persistence operations.
 * Generic over step ID and data shape to support both candidate and recruiter flows.
 */
export interface OnboardingRepository<TId extends string, TData> {
  get(): Promise<OnboardingFlowState<TId, TData> | null>;
  save(state: OnboardingFlowState<TId, TData>, completed?: boolean): Promise<OnboardingFlowState<TId, TData>>;
  reset(initialState: OnboardingFlowState<TId, TData>): Promise<OnboardingFlowState<TId, TData>>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: OnboardingProgressRow): OnboardingProgressDTO {
  return {
    id: row.id,
    userId: row.user_id,
    currentStep: row.current_step,
    completedSteps: row.completed_steps,
    onboardingData: row.onboarding_data as Record<string, unknown>,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a DTO back to a flow state for consumption by the onboarding engine.
 */
function mapDTOToFlowState<TId extends string, TData>(
  dto: OnboardingProgressDTO,
): OnboardingFlowState<TId, TData> {
  return {
    currentStep: dto.currentStep as TId,
    completedSteps: dto.completedSteps as TId[],
    data: dto.onboardingData as TData,
  };
}

/**
 * Supabase implementation of OnboardingRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseOnboardingRepository<TId extends string, TData>
  extends BaseRepository
  implements OnboardingRepository<TId, TData>
{
  private readonly TABLE = "onboarding_progress";

  /**
   * Get the onboarding progress record for the authenticated user.
   * Returns null if no record exists yet.
   */
  async get(): Promise<OnboardingFlowState<TId, TData> | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    if (!data) return null;

    const dto = mapRowToDTO(data as OnboardingProgressRow);
    return mapDTOToFlowState<TId, TData>(dto);
  }

  /**
   * Upsert (create or update) the onboarding progress record for the authenticated user.
   * Uses the unique constraint on user_id for conflict resolution.
   *
   * @param state - The current onboarding flow state to persist.
   * @param completed - Whether onboarding is complete. Determined by the service layer.
   */
  async save(state: OnboardingFlowState<TId, TData>, completed: boolean = false): Promise<OnboardingFlowState<TId, TData>> {
    const userId = await this.getCurrentUserId();

    // Check if a record already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (this.client.from(this.TABLE) as any)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updateData: OnboardingProgressUpdate = {
        current_step: state.currentStep,
        completed_steps: state.completedSteps as string[],
        onboarding_data: state.data as Record<string, unknown>,
        completed,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (this.client.from(this.TABLE) as any)
        .update(updateData)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(error.message, "SERVER_ERROR", 500);
      }

      if (!data) {
        throw new AppError("Failed to update onboarding progress", "SERVER_ERROR", 500);
      }

      const dto = mapRowToDTO(data as OnboardingProgressRow);
      return mapDTOToFlowState<TId, TData>(dto);
    } else {
      // Insert new record
      const insertData: OnboardingProgressInsert = {
        user_id: userId,
        current_step: state.currentStep,
        completed_steps: state.completedSteps as string[],
        onboarding_data: state.data as Record<string, unknown>,
        completed,
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
        throw new AppError("Failed to create onboarding progress", "SERVER_ERROR", 500);
      }

      const dto = mapRowToDTO(data as OnboardingProgressRow);
      return mapDTOToFlowState<TId, TData>(dto);
    }
  }

  /**
   * Reset the onboarding progress to the provided initial state.
   * Upserts the initial state, effectively restarting the flow.
   */
  async reset(initialState: OnboardingFlowState<TId, TData>): Promise<OnboardingFlowState<TId, TData>> {
    return this.save(initialState);
  }
}