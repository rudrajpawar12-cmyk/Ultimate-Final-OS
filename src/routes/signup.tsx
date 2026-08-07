import { Link, createFileRoute } from "@tanstack/react-router";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your CareerOS account" },
      {
        name: "description",
        content: "Create a free CareerOS account and unlock AI resume intelligence and matching.",
      },
      { property: "og:title", content: "Create your CareerOS account" },
      { property: "og:description", content: "Free forever plan. No credit card required." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      description="Free forever plan. No credit card required."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="focus-ring rounded font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
