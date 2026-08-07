import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { companyService } from "@/services/company.service";
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/repositories/supabase-company.repository";

/**
 * Hook layer: the only bridge between React components and the company service layer.
 *
 * UI → Hooks → Service → Repository → Supabase
 */
export const companyKeys = {
  all: ["company"] as const,
  detail: (id: string) => [...companyKeys.all, "detail", id] as const,
};

/**
 * Fetch a single company by ID.
 * Returns null when no accessible record exists.
 */
export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companyService.getCompany(id),
    enabled: !!id,
  });
}

/**
 * Fetch the company belonging to a specific recruiter.
 * Returns null when no company record exists for the recruiter.
 */
export function useCompanyByRecruiter(recruiterId: string | undefined) {
  return useQuery({
    queryKey: [...companyKeys.all, "byRecruiter", recruiterId] as const,
    queryFn: () => companyService.getCompanyByRecruiterId(recruiterId!),
    enabled: !!recruiterId,
  });
}

/**
 * Create a new company record.
 * Invalidates all company queries on success.
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) =>
      companyService.createCompany(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      toast.success("Company created");
    },
    onError: () => toast.error("Couldn't create company. Try again."),
  });
}

/**
 * Update an existing company record.
 * Invalidates all company queries on success.
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCompanyInput }) =>
      companyService.updateCompany(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      toast.success("Company updated");
    },
    onError: () => toast.error("Couldn't update company. Try again."),
  });
}

/**
 * Delete a company record.
 * Invalidates all company queries on success.
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.deleteCompany(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      toast.success("Company deleted");
    },
    onError: () => toast.error("Couldn't delete company. Try again."),
  });
}