import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/states";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";

/**
 * Client-side route gate. Handles the four required states:
 * loading, unauthorized, redirect, authenticated.
 * When Supabase auth lands, only `useAuth` changes — not this component.
 */
export function ProtectedRoute({ role, children }: { role?: UserRole; children: ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      void navigate({ to: "/login", replace: true });
    }
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Redirecting to login…" />
      </div>
    );
  }

  if (user && !user.role) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          icon={ShieldAlert}
          title="Choose how you'll use CareerOS"
          description="Pick the Candidate or Recruiter experience to continue."
          action={
            <Button asChild>
              <Link to="/role-selection">Select a role</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (role && user?.role !== role) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          icon={ShieldAlert}
          title="You don't have access to this workspace"
          description={`This area is reserved for ${role} accounts.`}
          action={
            <Button asChild>
              <Link to={user?.role === "recruiter" ? "/recruiter" : "/candidate"}>
                Go to my workspace
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
