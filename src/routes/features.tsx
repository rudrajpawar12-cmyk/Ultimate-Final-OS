import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/layout/public-layout";
import {
  AiCapabilitiesSection,
  BenefitsSection,
  CtaSection,
  FeaturesSection,
  HowItWorksSection,
} from "@/components/marketing/sections";
import { PageContainer, SectionHeader } from "@/components/ui/page-container";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — CareerOS AI Career Platform" },
      {
        name: "description",
        content:
          "Resume intelligence, explainable AI match scores, career copilot, hiring pipeline and analytics — every CareerOS module explained.",
      },
      { property: "og:title", content: "Features — CareerOS AI Career Platform" },
      {
        property: "og:description",
        content:
          "Every CareerOS module: resume intelligence, matching, copilot, pipeline, analytics.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <PublicLayout>
      <section className="border-b border-border bg-muted/30 py-16 sm:py-20">
        <PageContainer size="wide">
          <SectionHeader
            eyebrow="Features"
            title="Everything a career needs, in one operating system"
            description="CareerOS replaces resume tools, spreadsheets, trackers and screening workflows with a single AI-native platform."
          />
        </PageContainer>
      </section>
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <AiCapabilitiesSection />
      <CtaSection />
    </PublicLayout>
  );
}
