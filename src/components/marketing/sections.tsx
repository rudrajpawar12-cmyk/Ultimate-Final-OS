import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, CircleCheck, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";

import productPreview from "@/assets/product-preview.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageContainer, SectionHeader } from "@/components/ui/page-container";
import { Badge } from "@/components/ui/badge";
import {
  AI_CAPABILITIES,
  CANDIDATE_BENEFITS,
  FAQS,
  FEATURES,
  HOW_IT_WORKS,
  PLANS,
  RECRUITER_BENEFITS,
  SOCIAL_PROOF,
  STATS,
  TRUSTED_BY,
} from "@/content/marketing";
import { cn } from "@/lib/utils";

function Reveal({
  children,
  delay = 0,
  className,
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  immediate?: boolean;
}) {
  const motionProps = immediate
    ? { animate: { opacity: 1, y: 0 } }
    : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      {...motionProps}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden pb-20 pt-16 sm:pt-24">
      <div
        className="surface-grid pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />
      <PageContainer size="wide" className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal immediate>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI-first career infrastructure
            </span>
          </Reveal>
          <Reveal immediate delay={0.06}>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              The <span className="text-gradient">Career Operating System</span> for people who take
              hiring seriously
            </h1>
          </Reveal>
          <Reveal immediate delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CareerOS is not a job board. It's one intelligent system where candidates build,
              analyze and advance their careers — and recruiters run their entire hiring pipeline
              with explainable AI.
            </p>
          </Reveal>
          <Reveal immediate delay={0.18}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="xl" variant="hero" asChild>
                <Link to="/signup">
                  Start free <ArrowRight />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/features">See how it works</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal immediate delay={0.24}>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["No credit card required", "Free forever plan", "Setup in 2 minutes"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CircleCheck className="size-3.5 text-success" aria-hidden="true" />
                    {item}
                  </span>
                ),
              )}
            </p>
          </Reveal>
        </div>

        <Reveal immediate delay={0.3} className="mt-14">
          <div className="shadow-elevated relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card">
            <img
              src={productPreview}
              alt="CareerOS dashboard showing resume score, AI match score and application pipeline"
              width={1600}
              height={1008}
              className="w-full"
            />
          </div>
        </Reveal>

        <Reveal immediate delay={0.36}>
          <div className="mt-14">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted by modern talent teams
            </p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {TRUSTED_BY.map((company) => (
                <li key={company} className="text-base font-semibold text-muted-foreground/70">
                  {company}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </PageContainer>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border py-20 sm:py-24">
      <PageContainer size="wide">
        <SectionHeader
          eyebrow="Platform"
          title="One system, every part of the career lifecycle"
          description="Modules built to work together — so nothing lives in a spreadsheet or an inbox again."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.05}>
              <Card className="group h-full border-border/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                <CardContent className="space-y-3 p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
      <PageContainer size="wide">
        <SectionHeader
          eyebrow="How CareerOS works"
          title="From raw resume to running pipeline"
          description="Four steps that replace a dozen disconnected tools."
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, index) => (
            <Reveal key={item.step} delay={index * 0.06}>
              <li className="h-full rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-2xl font-extrabold text-muted-foreground/30">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </PageContainer>
    </section>
  );
}

function BenefitList({
  eyebrow,
  title,
  items,
  cta,
  to,
}: {
  eyebrow: string;
  title: string;
  items: readonly string[];
  cta: string;
  to: "/signup" | "/features";
}) {
  return (
    <Card className="shadow-elevated h-full border-border/70">
      <CardContent className="flex h-full flex-col p-7">
        <Badge variant="secondary" className="w-fit">
          {eyebrow}
        </Badge>
        <h3 className="mt-4 text-2xl font-bold tracking-tight">{title}</h3>
        <ul className="mt-6 flex-1 space-y-3.5">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Button className="mt-7 w-fit" variant="soft" asChild>
          <Link to={to}>
            {cta} <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function BenefitsSection() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <PageContainer size="wide">
        <SectionHeader
          eyebrow="Dual portal"
          title="Built for both sides of the hiring table"
          description="Candidates and recruiters work in the same data model — which is why the matching actually means something."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <BenefitList
              eyebrow="For candidates"
              title="Run your career like a product"
              items={CANDIDATE_BENEFITS}
              cta="Create my profile"
              to="/signup"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <BenefitList
              eyebrow="For recruiters"
              title="Hire with signal, not volume"
              items={RECRUITER_BENEFITS}
              cta="Explore recruiter tools"
              to="/features"
            />
          </Reveal>
        </div>
      </PageContainer>
    </section>
  );
}

export function AiCapabilitiesSection() {
  return (
    <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
      <PageContainer size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              align="left"
              eyebrow="AI capabilities"
              title="Intelligence that explains itself"
              description="Every AI output in CareerOS is traceable to the data behind it — no black-box scores, no generic advice."
            />
            <dl className="mt-8 space-y-5">
              {AI_CAPABILITIES.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.05}>
                  <div className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm">
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="font-semibold">{item.title}</dt>
                      <dd className="text-sm text-muted-foreground">{item.copy}</dd>
                    </div>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="shadow-elevated rounded-2xl border border-border bg-card p-6"
                >
                  <p className="text-3xl font-extrabold tracking-tight text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </PageContainer>
    </section>
  );
}

export function SocialProofSection() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <PageContainer size="wide">
        <SectionHeader
          eyebrow="Social proof"
          title="Teams and candidates who switched to a system"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {SOCIAL_PROOF.map((item, index) => (
            <Reveal key={item.name} delay={index * 0.06}>
              <figure className="h-full rounded-2xl border border-border bg-card p-6">
                <div className="flex gap-0.5 text-premium" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-muted-foreground">{item.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
      <PageContainer size="wide">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans that scale with your ambition"
          description="Start free. Upgrade when the AI is doing real work for you."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.06}>
              <Card
                className={cn(
                  "relative h-full border-border/70",
                  plan.highlighted && "shadow-elevated border-primary/40 ring-1 ring-primary/25",
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <CardContent className="flex h-full flex-col p-7">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-7 w-full"
                    size="lg"
                    variant={plan.highlighted ? "hero" : "outline"}
                    asChild
                  >
                    <Link to="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
        {compact && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Need something custom?{" "}
            <Link
              to="/faq"
              className="focus-ring rounded font-semibold text-primary hover:underline"
            >
              Read the FAQ
            </Link>
          </p>
        )}
      </PageContainer>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <PageContainer size="narrow">
        <SectionHeader eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </PageContainer>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <PageContainer size="wide">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-primary-soft px-6 py-16 text-center sm:px-14">
            <div className="surface-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Stop applying into the void. Start running your career.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Join candidates and recruiting teams who replaced scattered tools with one AI-native
                operating system.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/signup">
                    Get started free <ArrowRight />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">Compare plans</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </PageContainer>
    </section>
  );
}
