import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Twitter } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", to: "/features" as const },
      { label: "Pricing", to: "/pricing" as const },
      { label: "FAQ", to: "/faq" as const },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Get started", to: "/signup" as const },
      { label: "Log in", to: "/login" as const },
      { label: "Choose your role", to: "/role-selection" as const },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About CareerOS", to: "/features" as const },
      { label: "Careers", to: "/features" as const },
      { label: "Contact", to: "/faq" as const },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", to: "/faq" as const },
      { label: "Terms", to: "/faq" as const },
      { label: "Security", to: "/faq" as const },
    ],
  },
];

const SOCIALS = [
  { label: "CareerOS on X", icon: Twitter },
  { label: "CareerOS on LinkedIn", icon: Linkedin },
  { label: "CareerOS on GitHub", icon: Github },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <PageContainer size="wide" className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI-powered Career Operating System for candidates and recruiters — not another job
              board.
            </p>
            <form
              className="flex max-w-sm gap-2"
              onSubmit={(event) => event.preventDefault()}
              aria-label="Newsletter signup"
            >
              <label htmlFor="footer-newsletter" className="sr-only">
                Email address
              </label>
              <Input
                id="footer-newsletter"
                type="email"
                placeholder="you@company.com"
                className="h-10"
              />
              <Button type="submit">Subscribe</Button>
            </form>
            <div className="flex items-center gap-2 pt-1">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="focus-ring grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h3 className="text-sm font-semibold">{column.heading}</h3>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="focus-ring rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CareerOS. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Built for careers, powered by AI.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
