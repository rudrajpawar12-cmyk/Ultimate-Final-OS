import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AuthLayout({
  title,
  description,
  children,
  footer,
  size = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className={size === "wide" ? "w-full max-w-xl" : "w-full max-w-sm"}>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <Link to="/" className="focus-ring rounded hover:text-foreground">
            ← Back to careeros.com
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-border bg-primary-soft/50 lg:block">
        <div className="surface-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center gap-8 px-14">
          <blockquote className="space-y-5">
            <p className="text-2xl font-semibold leading-snug tracking-tight">
              “CareerOS turned a scattered job hunt into one system — resume intelligence, matching,
              and pipeline in a single place.”
            </p>
            <footer className="text-sm text-muted-foreground">
              Priya Raman — Senior Product Engineer
            </footer>
          </blockquote>
          <dl className="grid grid-cols-3 gap-4">
            {[
              ["3.4x", "More interviews"],
              ["68%", "Faster screening"],
              ["12k+", "Careers managed"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-background/70 p-4 shadow-sm">
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-bold text-primary">{value}</dd>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
