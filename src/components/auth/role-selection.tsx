import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Check, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

const ROLES = [
  {
    value: "candidate" as const,
    icon: Users,
    title: "I'm a candidate",
    description: "Build an AI-analyzed career profile, get matched, and track every application.",
    points: ["Resume intelligence", "Match recommendations", "Application tracker"],
  },
  {
    value: "recruiter" as const,
    icon: Briefcase,
    title: "I'm a recruiter",
    description: "Post roles, get explainable shortlists, and run your pipeline end to end.",
    points: ["AI shortlisting", "Hiring pipeline", "Team analytics"],
  },
];

export function RoleSelection() {
  const { selectRole, user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<UserRole | null>(user?.role ?? null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const updated = await selectRole(selected);
      toast.success(`You're set up as a ${selected}`);
      await navigate({ to: authService.homePathForRole(updated.role) });
    } catch {
      toast.error("We couldn't save your role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="Select how you'll use CareerOS"
        className="grid gap-4 sm:grid-cols-2"
      >
        {ROLES.map((role) => {
          const active = selected === role.value;
          return (
            <button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(role.value)}
              className={cn(
                "focus-ring group relative flex h-full flex-col rounded-2xl border bg-card p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
                active ? "border-primary ring-2 ring-primary/25" : "border-border",
              )}
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-xl transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
                )}
              >
                <role.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{role.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{role.description}</p>
              <ul className="mt-4 space-y-2">
                {role.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={!selected || submitting}
        onClick={handleContinue}
      >
        {submitting ? <LoadingSpinner label="Saving role" /> : null}
        {submitting ? "Setting up…" : "Continue"}
        {!submitting && <ArrowRight />}
      </Button>
    </div>
  );
}
