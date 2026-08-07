import { Link, createFileRoute } from "@tanstack/react-router";

import { ResetPasswordForm } from "@/components/auth/password-forms";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    // Supabase may also pass type and access_token via query params
    type: typeof search.type === "string" ? search.type : "",
  }),
  head: () => ({
    meta: [
      { title: "Set a new CareerOS password" },
      { name: "description", content: "Choose a new password for your CareerOS account." },
      { property: "og:title", content: "Set a new CareerOS password" },
      { property: "og:description", content: "Choose a new, secure password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a strong password you haven't used before."
      footer={
        <p className="text-sm text-muted-foreground">
          Need a new link?{" "}
          <Link
            to="/forgot-password"
            className="focus-ring rounded font-medium text-primary hover:underline"
          >
            Request another
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
