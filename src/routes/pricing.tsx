import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/layout/public-layout";
import { CtaSection, FaqSection, PricingSection } from "@/components/marketing/sections";
import { PageContainer, SectionHeader } from "@/components/ui/page-container";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CareerOS Plans for Candidates & Teams" },
      {
        name: "description",
        content:
          "Start free forever, upgrade to Pro for unlimited AI, or run hiring at scale with CareerOS Teams.",
      },
      { property: "og:title", content: "Pricing — CareerOS Plans for Candidates & Teams" },
      {
        property: "og:description",
        content: "Free forever, Pro for candidates, Teams for recruiting organisations.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PublicLayout>
      <section className="border-b border-border py-16 sm:py-20">
        <PageContainer size="wide">
          <SectionHeader
            eyebrow="Pricing"
            title="Pay for outcomes, not seats you don't use"
            description="Every plan includes the core career profile, tracking and security foundations."
          />
        </PageContainer>
      </section>
      <PricingSection compact />
      <FaqSection />
      <CtaSection />
    </PublicLayout>
  );
}
