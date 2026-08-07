/**
 * Profile Completion Widget for the Candidate Dashboard.
 *
 * Aggregates data from all profile section hooks, calculates completion
 * using the Profile Completion Engine, and displays progress.
 * Automatically persists completion data to Supabase when sections change.
 */

import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleDashed, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useProfileCompletionEngine } from "@/hooks/use-profile-completion";
import { useEducation } from "@/hooks/use-education";
import { useExperience } from "@/hooks/use-experience";
import { useSkills } from "@/hooks/use-skills";
import { useProjects } from "@/hooks/use-projects";
import { usePreferences } from "@/hooks/use-preferences";
import { useResumesList } from "@/hooks/use-resumes";
import { candidateProfileService } from "@/services/candidate-profile.service";
import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the candidate profile from the Supabase-backed service.
 */
function useCandidateProfileData() {
  return useQuery({
    queryKey: ["candidate-profile", "completion-data"],
    queryFn: () => candidateProfileService.getProfile(),
  });
}

export function ProfileCompletionWidget({ className }: { className?: string }) {
  const profileQuery = useCandidateProfileData();
  const educationQuery = useEducation();
  const experienceQuery = useExperience();
  const skillsQuery = useSkills();
  const projectsQuery = useProjects();
  const preferencesQuery = usePreferences();
  const resumesQuery = useResumesList();

  const isLoading =
    profileQuery.isLoading ||
    educationQuery.isLoading ||
    experienceQuery.isLoading ||
    skillsQuery.isLoading ||
    projectsQuery.isLoading ||
    preferencesQuery.isLoading ||
    resumesQuery.isLoading;

  const completion = useProfileCompletionEngine({
    profile: profileQuery.data,
    education: educationQuery.data,
    experience: experienceQuery.data,
    skills: skillsQuery.data,
    projects: projectsQuery.data,
    preferences: preferencesQuery.data,
    resumes: resumesQuery.data,
    isLoading,
  });

  // Auto-persist completion whenever calculation changes
  const prevPercentage = useRef<number | null>(null);
  useEffect(() => {
    if (
      completion.data &&
      completion.sectionData &&
      prevPercentage.current !== completion.data.percentage
    ) {
      prevPercentage.current = completion.data.percentage;
      completion.recalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completion.data?.percentage]);

  if (isLoading) {
    return (
      <Card className={cn("border-border/70 animate-pulse", className)}>
        <CardHeader>
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-60 rounded bg-muted mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!completion.data) {
    return null;
  }

  const { percentage, sectionDetails, report } = completion.data;
  const isComplete = percentage === 100;
  const mandatoryMissing = sectionDetails.filter((s) => !s.done && s.mandatory);

  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader>
        <CardTitle className="text-base">Profile completion</CardTitle>
        <CardDescription>
          {isComplete
            ? "Your profile is fully complete — you're getting the best matches."
            : `${percentage}% complete — finish these sections to improve your results.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} aria-label={`${percentage}% complete`} />

        {/* Mandatory fields warning */}
        {mandatoryMissing.length > 0 && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertCircle className="size-4" />
              Missing required sections
            </p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {mandatoryMissing.map((s) => (
                <li key={s.id}>
                  {s.label}: {s.missingFields.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section checklist */}
        <ul className="space-y-2">
          {sectionDetails.map((section) => (
            <li key={section.id} className="flex items-start gap-2 text-sm">
              {section.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <CircleDashed
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className={cn(section.done ? "text-muted-foreground" : "font-medium")}>
                {section.label}
                {section.mandatory && !section.done && (
                  <span className="ml-1 text-xs text-destructive">(required)</span>
                )}
                {!section.done && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {section.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* Next step recommendation */}
        {report.next && (
          <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm">
            <p className="font-semibold text-primary">Recommended next step</p>
            <p className="mt-0.5 text-muted-foreground">
              {report.next.label} — {report.next.hint}
            </p>
          </div>
        )}

        {!isComplete && (
          <Button asChild className="w-full">
            <Link to="/candidate/profile">
              Complete profile
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
