import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { resumeStorageService } from "@/services/resume-storage.service";
import type { UploadResumeFileInput } from "@/repositories/supabase-resume-storage.repository";

/**
 * React Query hooks for Resume Storage operations (upload, delete, signed URLs).
 * Components use these hooks to interact with the resume storage service layer.
 *
 * UI → Hooks → Service → Repository → Supabase Storage
 */

export const resumeStorageKeys = {
  all: ["resume-storage"] as const,
  signedPreviewUrl: (storagePath: string) =>
    [...resumeStorageKeys.all, "preview-url", storagePath] as const,
  signedDownloadUrl: (storagePath: string) =>
    [...resumeStorageKeys.all, "download-url", storagePath] as const,
};

/**
 * Upload a resume file to storage.
 * Accepts an UploadResumeFileInput and delegates to the storage service.
 */
export function useUploadResume() {
  return useMutation({
    mutationFn: (input: UploadResumeFileInput) =>
      resumeStorageService.uploadResume(input),
    onSuccess: () => {
      toast.success("Resume file uploaded");
    },
    onError: () => toast.error("Couldn't upload resume file. Try again."),
  });
}

/**
 * Delete a resume file from storage.
 * Accepts the storage path of the file to remove.
 */
export function useDeleteResumeFile() {
  return useMutation({
    mutationFn: (storagePath: string) =>
      resumeStorageService.deleteResume(storagePath),
    onSuccess: () => {
      toast.success("Resume file deleted");
    },
    onError: () => toast.error("Couldn't delete resume file. Try again."),
  });
}

/**
 * Get a time-limited signed URL for inline preview of a resume.
 * Suitable for rendering in an iframe or PDF viewer.
 *
 * @param storagePath - The storage path of the resume file.
 * @param options.enabled - Whether the query should execute (default: true when storagePath is non-empty).
 * @param options.expiresIn - URL lifetime in seconds (optional, uses service default).
 */
export function useSignedPreviewUrl(
  storagePath: string,
  options?: { enabled?: boolean; expiresIn?: number },
) {
  return useQuery({
    queryKey: resumeStorageKeys.signedPreviewUrl(storagePath),
    queryFn: () =>
      resumeStorageService.getSignedPreviewUrl(storagePath, options?.expiresIn),
    enabled: options?.enabled ?? storagePath.length > 0,
    staleTime: 4 * 60 * 1000, // Refetch before the default 5-min expiry
  });
}

/**
 * Get a time-limited signed URL that forces a file download.
 *
 * @param storagePath - The storage path of the resume file.
 * @param options.enabled - Whether the query should execute (default: true when storagePath is non-empty).
 * @param options.expiresIn - URL lifetime in seconds (optional, uses service default).
 */
export function useSignedDownloadUrl(
  storagePath: string,
  options?: { enabled?: boolean; expiresIn?: number },
) {
  return useQuery({
    queryKey: resumeStorageKeys.signedDownloadUrl(storagePath),
    queryFn: () =>
      resumeStorageService.getSignedDownloadUrl(
        storagePath,
        options?.expiresIn,
      ),
    enabled: options?.enabled ?? storagePath.length > 0,
    staleTime: 50 * 1000, // Refetch before the default 60-sec expiry
  });
}