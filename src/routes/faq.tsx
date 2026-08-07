import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/layout/public-layout";
import { CtaSection, FaqSection } from "@/components/marketing/sections";
import { PageContainer, SectionHeader } from "@/components/ui/page-container";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — How CareerOS Works" },
      {
        name: "description",
        content:
          "Answers about CareerOS: how AI match scores work, data security, roles for candidates and recruiters, and plans.",
      },
      { property: "og:title", content: "FAQ — How CareerOS Works" },
      {
        property: "og:description",
        content: "Common questions about AI matching, data security, roles and pricing.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PublicLayout>
      <section className="border-b border-border bg-muted/30 py-16 sm:py-20">
        <PageContainer size="wide">
          <SectionHeader
            eyebrow="Support"
            title="Frequently asked questions"
            description="Everything about how CareerOS works, what the AI does, and how your data is handled."
          />
        </PageContainer>
      </section>
      <FaqSection />
      <CtaSection />
    </PublicLayout>
  );
}
