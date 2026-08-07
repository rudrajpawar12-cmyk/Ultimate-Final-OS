import { createFileRoute } from "@tanstack/react-router";

import { RoleSelection } from "@/components/auth/role-selection";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/role-selection")({
  head: () => ({
    meta: [
      { title: "Choose your CareerOS workspace" },
      {
        name: "description",
        content:
          "Tell CareerOS whether you're a candidate or a recruiter to tailor your workspace.",
      },
      { property: "og:title", content: "Choose your CareerOS workspace" },
      { property: "og:description", content: "Candidate or recruiter — pick your experience." },
    ],
  }),
  component: RoleSelectionPage,
});

function RoleSelectionPage() {
  return (
    <AuthLayout
      size="wide"
      title="How will you use CareerOS?"
      description="You can change this later in settings."
    >
      <RoleSelection />
    </AuthLayout>
  );
}
