import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/layout/public-layout";
import {
  AiCapabilitiesSection,
  BenefitsSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  Hero,
  HowItWorksSection,
  PricingSection,
  SocialProofSection,
} from "@/components/marketing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerOS — The AI Career Operating System" },
      {
        name: "description",
        content:
          "CareerOS is an AI-powered career operating system: resume intelligence, explainable matching, and hiring pipelines for candidates and recruiters.",
      },
      { property: "og:title", content: "CareerOS — The AI Career Operating System" },
      {
        property: "og:description",
        content:
          "Not a job board. One intelligent system for careers and hiring, powered by explainable AI.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <PublicLayout>
      <h1 className="sr-only">CareerOS — the AI-powered Career Operating System</h1>
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <AiCapabilitiesSection />
      <SocialProofSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </PublicLayout>
  );
}
