import { Link, createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — CareerOS" },
      { name: "description", content: "Log in to your CareerOS candidate or recruiter workspace." },
      { property: "og:title", content: "Log in — CareerOS" },
      { property: "og:description", content: "Access your CareerOS workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to continue building your career intelligence."
      footer={
        <p className="text-sm text-muted-foreground">
          New to CareerOS?{" "}
          <Link
            to="/signup"
            className="focus-ring rounded font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
