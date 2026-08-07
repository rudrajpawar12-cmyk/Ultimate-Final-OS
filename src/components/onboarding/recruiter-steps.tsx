import { Building2, Rocket, ShieldCheck, Users } from "lucide-react";

import {
  ChipListField,
  ImageUploadField,
  OptionGroup,
  TextField,
} from "@/components/onboarding/fields";
import { Button } from "@/components/ui/button";
import { SuccessState } from "@/components/ui/states";
import {
  COMPANY_SIZES,
  HIRING_VOLUMES,
  INDUSTRIES,
  SENIORITY_LEVELS,
} from "@/services/recruiter.service";
import type {
  HiringPreferences,
  RecruiterOnboardingData,
  RecruiterOnboardingStepId,
} from "@/types/recruiter";

interface StepProps {
  data: RecruiterOnboardingData;
  update: (patch: Partial<RecruiterOnboardingData>) => void;
}

function WelcomeStep() {
  const items = [
    {
      icon: Building2,
      title: "Branded company profile",
      copy: "Candidates see a verified employer page on every job post.",
    },
    {
      icon: Users,
      title: "Explainable shortlists",
      copy: "AI ranks applicants against the requirements you define here.",
    },
    {
      icon: ShieldCheck,
      title: "Structured hiring",
      copy: "Pipelines, scorecards and analytics for your whole team.",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Let&apos;s set up your hiring workspace. This takes about three minutes and everything saves
        as you go.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.title} className="rounded-2xl border border-border bg-card p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <item.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.copy}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompanyStep({ data, update }: StepProps) {
  const company = data.company ?? { name: "" };
  const patch = (value: Partial<typeof company>) => update({ company: { ...company, ...value } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Company name"
        required
        value={company.name}
        placeholder="Northwind Labs"
        onChange={(value) => patch({ name: value })}
      />
      <TextField
        label="Tagline"
        value={company.tagline ?? ""}
        placeholder="Infrastructure for modern retail"
        onChange={(value) => patch({ tagline: value })}
      />
      <TextField
        label="Headquarters"
        value={company.headquarters ?? ""}
        placeholder="Bengaluru, India"
        onChange={(value) => patch({ headquarters: value })}
      />
      <TextField
        label="Founded"
        value={company.foundedYear ?? ""}
        placeholder="2016"
        maxLength={4}
        onChange={(value) => patch({ foundedYear: value })}
      />
      <TextField
        className="sm:col-span-2"
        label="About the company"
        multiline
        rows={5}
        maxLength={1000}
        hint="Shown on every job post. What you build, who you serve, why people join."
        value={company.description ?? ""}
        onChange={(value) => patch({ description: value })}
      />
    </div>
  );
}

function LogoStep({ data, update }: StepProps) {
  return (
    <ImageUploadField
      shape="square"
      label="Company logo"
      description="Square PNG or SVG works best, up to 2 MB. Posts with a logo get significantly more applicants."
      value={data.logoDataUrl}
      onChange={(logoDataUrl) => update({ logoDataUrl })}
      fallback={<Building2 className="size-8" aria-hidden="true" />}
    />
  );
}

function WebsiteStep({ data, update }: StepProps) {
  const links = data.links ?? {};
  const patch = (value: Partial<typeof links>) => update({ links: { ...links, ...value } });

  return (
    <div className="space-y-4">
      <TextField
        label="Company website"
        type="url"
        maxLength={200}
        value={links.website ?? ""}
        placeholder="https://northwindlabs.com"
        onChange={(value) => patch({ website: value })}
      />
      <TextField
        label="Careers page"
        type="url"
        maxLength={200}
        value={links.careersPage ?? ""}
        placeholder="https://northwindlabs.com/careers"
        onChange={(value) => patch({ careersPage: value })}
      />
      <TextField
        label="LinkedIn"
        type="url"
        maxLength={200}
        value={links.linkedin ?? ""}
        placeholder="https://linkedin.com/company/northwind-labs"
        hint="Links help us verify your company faster."
        onChange={(value) => patch({ linkedin: value })}
      />
    </div>
  );
}

function IndustryStep({ data, update }: StepProps) {
  const industry = data.industry ?? { specialties: [] };
  return (
    <div className="space-y-6">
      <OptionGroup
        label="Primary industry"
        columns={3}
        options={INDUSTRIES.map((item) => ({ value: item, title: item }))}
        value={industry.primary ? [industry.primary] : []}
        onChange={(value) => update({ industry: { ...industry, primary: value[0] } })}
      />
      <ChipListField
        label="Specialties"
        placeholder="Payments infrastructure"
        hint="Optional. Helps candidates understand what you actually build."
        values={industry.specialties ?? []}
        onChange={(specialties) => update({ industry: { ...industry, specialties } })}
      />
    </div>
  );
}

function SizeStep({ data, update }: StepProps) {
  const scale = data.scale ?? {};
  return (
    <div className="space-y-6">
      <OptionGroup
        label="Employees"
        columns={3}
        options={COMPANY_SIZES.map((item) => ({ value: item, title: item }))}
        value={scale.employees ? [scale.employees] : []}
        onChange={(value) => update({ scale: { ...scale, employees: value[0] } })}
      />
      <OptionGroup
        label="Expected hiring volume"
        columns={2}
        options={HIRING_VOLUMES.map((item) => ({ value: item, title: item }))}
        value={scale.hiringVolume ? [scale.hiringVolume] : []}
        onChange={(value) => update({ scale: { ...scale, hiringVolume: value[0] } })}
      />
      <TextField
        label="Roles open right now"
        type="number"
        value={scale.openRoles ?? ""}
        placeholder="4"
        onChange={(value) => update({ scale: { ...scale, openRoles: value } })}
      />
    </div>
  );
}

function HiringStep({ data, update }: StepProps) {
  const hiring: HiringPreferences = data.hiring ?? {
    roles: [],
    locations: [],
    workModes: [],
    seniority: [],
  };
  const patch = (value: Partial<HiringPreferences>) => update({ hiring: { ...hiring, ...value } });

  return (
    <div className="space-y-6">
      <ChipListField
        label="Roles you're hiring for"
        placeholder="Senior Backend Engineer"
        values={hiring.roles}
        onChange={(roles) => patch({ roles })}
      />
      <ChipListField
        label="Hiring locations"
        placeholder="Bengaluru"
        values={hiring.locations}
        onChange={(locations) => patch({ locations })}
      />
      <OptionGroup
        label="Work modes"
        multiple
        columns={3}
        options={[
          { value: "remote", title: "Remote" },
          { value: "hybrid", title: "Hybrid" },
          { value: "onsite", title: "On-site" },
        ]}
        value={hiring.workModes}
        onChange={(value) => patch({ workModes: value as HiringPreferences["workModes"] })}
      />
      <OptionGroup
        label="Seniority levels"
        multiple
        columns={3}
        options={SENIORITY_LEVELS.map((item) => ({ value: item, title: item }))}
        value={hiring.seniority}
        onChange={(seniority) => patch({ seniority })}
      />
      <OptionGroup
        label="How urgent is hiring?"
        columns={3}
        options={[
          { value: "immediate", title: "Immediate", description: "Need hires this month" },
          { value: "this-quarter", title: "This quarter", description: "Planned roles" },
          { value: "ongoing", title: "Always-on", description: "Continuous pipeline" },
        ]}
        value={hiring.urgency ? [hiring.urgency] : []}
        onChange={(value) => patch({ urgency: value[0] as HiringPreferences["urgency"] })}
      />
      <TextField
        label="Screening notes"
        multiline
        maxLength={600}
        hint="What must-haves should AI screening weigh most?"
        value={hiring.screeningNotes ?? ""}
        onChange={(screeningNotes) => patch({ screeningNotes })}
      />
    </div>
  );
}

function ProfileStep({ data, update }: StepProps) {
  const recruiter = data.recruiter ?? { fullName: "", jobTitle: "" };
  const patch = (value: Partial<typeof recruiter>) =>
    update({ recruiter: { ...recruiter, ...value } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Full name"
        required
        value={recruiter.fullName}
        placeholder="Meera Nair"
        maxLength={80}
        onChange={(value) => patch({ fullName: value })}
      />
      <TextField
        label="Job title"
        required
        value={recruiter.jobTitle}
        placeholder="Talent Acquisition Lead"
        onChange={(value) => patch({ jobTitle: value })}
      />
      <TextField
        label="Department"
        value={recruiter.department ?? ""}
        placeholder="People & Talent"
        onChange={(value) => patch({ department: value })}
      />
      <TextField
        label="Work email"
        type="email"
        maxLength={160}
        value={recruiter.workEmail ?? ""}
        placeholder="meera@northwindlabs.com"
        onChange={(value) => patch({ workEmail: value })}
      />
      <TextField
        label="Phone"
        type="tel"
        maxLength={20}
        value={recruiter.phone ?? ""}
        placeholder="+91 98765 43210"
        onChange={(value) => patch({ phone: value })}
      />
    </div>
  );
}

function CompleteStep({ onEnter }: { onEnter: () => void }) {
  return (
    <SuccessState
      icon={Rocket}
      title="Your hiring workspace is ready"
      description="Post your first role, invite your team and let AI screening rank applicants for you."
      action={<Button onClick={onEnter}>Go to hiring dashboard</Button>}
    />
  );
}

export function RecruiterOnboardingStep({
  step,
  data,
  update,
  onEnterWorkspace,
}: StepProps & {
  step: RecruiterOnboardingStepId;
  onEnterWorkspace: () => void;
}) {
  switch (step) {
    case "welcome":
      return <WelcomeStep />;
    case "company":
      return <CompanyStep data={data} update={update} />;
    case "logo":
      return <LogoStep data={data} update={update} />;
    case "website":
      return <WebsiteStep data={data} update={update} />;
    case "industry":
      return <IndustryStep data={data} update={update} />;
    case "size":
      return <SizeStep data={data} update={update} />;
    case "hiring":
      return <HiringStep data={data} update={update} />;
    case "profile":
      return <ProfileStep data={data} update={update} />;
    case "complete":
      return <CompleteStep onEnter={onEnterWorkspace} />;
    default:
      return null;
  }
}
