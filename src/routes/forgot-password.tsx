import { Link, createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your CareerOS password" },
      {
        name: "description",
        content: "Request a secure password reset link for your CareerOS account.",
      },
      { property: "og:title", content: "Reset your CareerOS password" },
      { property: "og:description", content: "We'll email you a secure reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a secure reset link."
      footer={
        <p className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="focus-ring rounded font-medium text-primary hover:underline">
            Back to login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
