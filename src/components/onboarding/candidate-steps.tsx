import { Building2, Check, FileText, Loader2, Sparkles, Upload, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ChipListField,
  ImageUploadField,
  OptionGroup,
  RecordEditor,
  TextField,
} from "@/components/onboarding/fields";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SuccessState } from "@/components/ui/states";
import {
  NOTICE_PERIODS,
  SUGGESTED_SKILLS,
  WORK_MODES,
  candidateService,
} from "@/services/candidate.service";
import type { CareerPreferences, OnboardingData, OnboardingStepId } from "@/types/candidate";
import { cn } from "@/lib/utils";

interface StepProps {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
}

function id() {
  return crypto.randomUUID();
}

/* ---------------------------------- Steps ---------------------------------- */

function WelcomeStep() {
  const highlights = [
    {
      icon: Sparkles,
      title: "AI resume intelligence",
      copy: "We score your resume for ATS readiness and surface concrete fixes.",
    },
    {
      icon: Building2,
      title: "Matched opportunities",
      copy: "Roles ranked against your real skills, not keyword guesswork.",
    },
    {
      icon: FileText,
      title: "One tracked pipeline",
      copy: "Applications, interviews and prep in a single workspace.",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        This takes about four minutes. Everything saves automatically, so you can leave and resume
        exactly where you stopped.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
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

function BasicStep({ data, update }: StepProps) {
  const basic = data.basic ?? { fullName: "", headline: "" };
  const patch = (value: Partial<typeof basic>) => update({ basic: { ...basic, ...value } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Full name"
        required
        value={basic.fullName}
        placeholder="Aarav Sharma"
        maxLength={80}
        onChange={(value) => patch({ fullName: value })}
      />
      <TextField
        label="Professional headline"
        required
        value={basic.headline}
        placeholder="Senior Frontend Engineer"
        onChange={(value) => patch({ headline: value })}
      />
      <TextField
        label="Phone"
        type="tel"
        maxLength={20}
        value={basic.phone ?? ""}
        placeholder="+91 98765 43210"
        onChange={(value) => patch({ phone: value })}
      />
      <TextField
        label="Location"
        value={basic.location ?? ""}
        placeholder="Bengaluru, India"
        maxLength={80}
        onChange={(value) => patch({ location: value })}
      />
      <TextField
        className="sm:col-span-2"
        label="Short bio"
        multiline
        maxLength={800}
        hint="A two-line summary recruiters read first."
        value={basic.bio ?? ""}
        placeholder="Frontend engineer with 6 years building design systems and data-heavy dashboards."
        onChange={(value) => patch({ bio: value })}
      />
    </div>
  );
}

function PhotoStep({ data, update }: StepProps) {
  return (
    <ImageUploadField
      label="Profile photo"
      description="A clear headshot makes your profile 40% more likely to be opened. PNG or JPG, up to 2 MB."
      value={data.photoDataUrl}
      onChange={(photoDataUrl) => update({ photoDataUrl })}
      fallback={<UserRound className="size-8" aria-hidden="true" />}
    />
  );
}

function EducationStep({ data, update }: StepProps) {
  const education = data.education ?? [];
  return (
    <RecordEditor
      items={education}
      addLabel="Add qualification"
      emptyTitle="No qualifications yet"
      emptyDescription="Add your degrees, diplomas or bootcamps. You can skip this and add them later."
      fields={[
        { name: "institution", label: "Institution", required: true, placeholder: "BITS Pilani" },
        { name: "degree", label: "Degree", required: true, placeholder: "B.E." },
        { name: "field", label: "Field of study", placeholder: "Computer Science" },
        { name: "grade", label: "Grade / GPA", placeholder: "8.6 CGPA", maxLength: 20 },
        { name: "startYear", label: "Start year", placeholder: "2016", maxLength: 4 },
        { name: "endYear", label: "End year", placeholder: "2020", maxLength: 4 },
      ]}
      onAdd={(draft) =>
        update({
          education: [
            ...education,
            {
              id: id(),
              institution: draft.institution ?? "",
              degree: draft.degree ?? "",
              field: draft.field ?? "",
              startYear: draft.startYear ?? "",
              endYear: draft.endYear ?? "",
              grade: draft.grade,
            },
          ],
        })
      }
      onRemove={(itemId) => update({ education: education.filter((item) => item.id !== itemId) })}
      renderSummary={(item) => (
        <>
          <p className="font-semibold">
            {item.degree} {item.field && `· ${item.field}`}
          </p>
          <p className="text-muted-foreground">
            {item.institution}
            {item.endYear ? ` · ${item.startYear}–${item.endYear}` : ""}
          </p>
        </>
      )}
    />
  );
}

function SkillsStep({ data, update }: StepProps) {
  const skills = data.skills ?? [];
  return (
    <ChipListField
      label="Your skills"
      placeholder="e.g. Kubernetes"
      hint="Pick at least three. These drive match scores and skill-gap analysis."
      values={skills}
      suggestions={SUGGESTED_SKILLS}
      onChange={(next) => update({ skills: next })}
    />
  );
}

function ExperienceStep({ data, update }: StepProps) {
  const experience = data.experience ?? [];
  return (
    <RecordEditor
      items={experience}
      addLabel="Add role"
      emptyTitle="No experience added"
      emptyDescription="Add the roles you've held. Students and freshers can skip this step."
      fields={[
        { name: "title", label: "Job title", required: true, placeholder: "Frontend Engineer" },
        { name: "company", label: "Company", required: true, placeholder: "Northwind Labs" },
        { name: "location", label: "Location", placeholder: "Remote" },
        { name: "startDate", label: "Start", type: "month", maxLength: 10 },
        { name: "endDate", label: "End (leave empty if current)", type: "month", maxLength: 10 },
        {
          name: "summary",
          label: "What you did",
          multiline: true,
          placeholder: "Owned the design system and cut page load time by 38%.",
        },
      ]}
      onAdd={(draft) =>
        update({
          experience: [
            ...experience,
            {
              id: id(),
              title: draft.title ?? "",
              company: draft.company ?? "",
              location: draft.location,
              startDate: draft.startDate ?? "",
              endDate: draft.endDate || null,
              current: !draft.endDate,
              summary: draft.summary,
            },
          ],
        })
      }
      onRemove={(itemId) => update({ experience: experience.filter((item) => item.id !== itemId) })}
      renderSummary={(item) => (
        <>
          <p className="font-semibold">
            {item.title} · {item.company}
          </p>
          <p className="text-muted-foreground">
            {item.startDate} – {item.current ? "Present" : item.endDate}
            {item.location ? ` · ${item.location}` : ""}
          </p>
        </>
      )}
    />
  );
}

function ProjectsStep({ data, update }: StepProps) {
  const projects = data.projects ?? [];
  return (
    <RecordEditor
      items={projects}
      addLabel="Add project"
      emptyTitle="No projects yet"
      emptyDescription="Projects are the fastest way to prove skills you haven't used at work."
      fields={[
        {
          name: "name",
          label: "Project name",
          required: true,
          placeholder: "Realtime analytics board",
        },
        { name: "url", label: "Link", type: "url", placeholder: "https://github.com/…" },
        {
          name: "tech",
          label: "Tech used (comma separated)",
          full: true,
          placeholder: "React, TypeScript, Supabase",
        },
        {
          name: "description",
          label: "Description",
          multiline: true,
          required: true,
          placeholder: "What it does and what you owned.",
        },
      ]}
      onAdd={(draft) =>
        update({
          projects: [
            ...projects,
            {
              id: id(),
              name: draft.name ?? "",
              description: draft.description ?? "",
              url: draft.url,
              tech: (draft.tech ?? "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            },
          ],
        })
      }
      onRemove={(itemId) => update({ projects: projects.filter((item) => item.id !== itemId) })}
      renderSummary={(item) => (
        <>
          <p className="font-semibold">{item.name}</p>
          <p className="line-clamp-2 text-muted-foreground">{item.description}</p>
          {item.tech.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{item.tech.join(" · ")}</p>
          )}
        </>
      )}
    />
  );
}

function CertificationsStep({ data, update }: StepProps) {
  const certifications = data.certifications ?? [];
  return (
    <RecordEditor
      items={certifications}
      addLabel="Add certification"
      emptyTitle="No certifications added"
      emptyDescription="Cloud, security and product certifications boost recruiter trust."
      fields={[
        {
          name: "name",
          label: "Certification",
          required: true,
          placeholder: "AWS Solutions Architect",
        },
        { name: "issuer", label: "Issuer", required: true, placeholder: "Amazon Web Services" },
        { name: "issuedOn", label: "Issued on", type: "month", maxLength: 10 },
        { name: "credentialUrl", label: "Credential link", type: "url", placeholder: "https://…" },
      ]}
      onAdd={(draft) =>
        update({
          certifications: [
            ...certifications,
            {
              id: id(),
              name: draft.name ?? "",
              issuer: draft.issuer ?? "",
              issuedOn: draft.issuedOn ?? "",
              credentialUrl: draft.credentialUrl,
            },
          ],
        })
      }
      onRemove={(itemId) =>
        update({ certifications: certifications.filter((item) => item.id !== itemId) })
      }
      renderSummary={(item) => (
        <>
          <p className="font-semibold">{item.name}</p>
          <p className="text-muted-foreground">
            {item.issuer}
            {item.issuedOn ? ` · ${item.issuedOn}` : ""}
          </p>
        </>
      )}
    />
  );
}

function ResumeStep({ data, update }: StepProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-4">
      <label
        htmlFor="resume-upload"
        className={cn(
          "focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:bg-muted/50",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          {uploading ? (
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-6" aria-hidden="true" />
          )}
        </span>
        <span className="text-sm font-semibold">
          {data.resumeFileName ?? "Drop your resume or browse"}
        </span>
        <span className="text-xs text-muted-foreground">PDF, DOC or DOCX · up to 5 MB</span>
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const message = candidateService.validateResumeFile({
              name: file.name,
              sizeBytes: file.size,
            });
            if (message) {
              setError(message);
              return;
            }
            setError(null);
            setUploading(true);
            window.setTimeout(() => {
              update({ resumeFileName: file.name });
              setUploading(false);
            }, 500);
          }}
        />
      </label>

      {data.resumeFileName && !uploading && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate font-medium">{data.resumeFileName}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => update({ resumeFileName: undefined })}>
            Remove
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        You can skip this and upload later from the Resume page.
      </p>
    </div>
  );
}

function PreferencesStep({ data, update }: StepProps) {
  const preferences = data.preferences ?? {};
  const patch = (value: Partial<CareerPreferences>) =>
    update({ preferences: { ...preferences, ...value } });

  return (
    <div className="space-y-6">
      <ChipListField
        label="Target roles"
        placeholder="Senior Frontend Engineer"
        values={preferences.desiredRoles ?? []}
        onChange={(desiredRoles) => patch({ desiredRoles })}
      />
      <ChipListField
        label="Preferred locations"
        placeholder="Bengaluru"
        values={preferences.locations ?? []}
        onChange={(locations) => patch({ locations })}
      />
      <OptionGroup
        label="Work mode"
        columns={3}
        options={WORK_MODES}
        value={preferences.workMode ? [preferences.workMode] : []}
        onChange={(value) => patch({ workMode: value[0] as CareerPreferences["workMode"] })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Minimum expected salary (per year)"
          type="number"
          value={String(preferences.minSalary ?? "")}
          placeholder="1800000"
          onChange={(value) => patch({ minSalary: Number(value) || 0 })}
        />
        <OptionGroup
          label="Notice period"
          columns={2}
          options={NOTICE_PERIODS.map((item) => ({ value: item, title: item }))}
          value={preferences.noticePeriod ? [preferences.noticePeriod] : []}
          onChange={(value) => patch({ noticePeriod: value[0] })}
        />
      </div>
    </div>
  );
}

function AnalysisStep({ data, onDone }: { data: OnboardingData; onDone: () => void }) {
  const [value, setValue] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => setValue((current) => Math.min(current + 9, 100)), 320);
    return () => clearInterval(timer);
  }, []);

  const report = candidateService.onboardingCompletion(data);
  const done = value >= 100;

  return (
    <div className="space-y-6 py-2 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Sparkles className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <p className="text-sm font-medium" aria-live="polite">
          {done ? "Analysis complete" : "Analysing your profile…"}
        </p>
        <Progress value={value} aria-label="Analysis progress" />
        <p className="text-xs text-muted-foreground">
          Extracting skills, mapping target roles and scoring completeness.
        </p>
      </div>

      {done && (
        <dl className="grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">Profile strength</dt>
            <dd className="text-2xl font-bold">{report.percentage}%</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">Skills captured</dt>
            <dd className="text-2xl font-bold">{data.skills?.length ?? 0}</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">Sections left</dt>
            <dd className="text-2xl font-bold">{report.missing.length}</dd>
          </div>
        </dl>
      )}

      <Button onClick={onDone} disabled={!done}>
        {done ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        See results
      </Button>
    </div>
  );
}

function CompleteStep({ onEnter }: { onEnter: () => void }) {
  return (
    <SuccessState
      title="Your workspace is ready"
      description="We've built your career profile. Jump into the dashboard to see matches, scores and next steps."
      action={<Button onClick={onEnter}>Go to dashboard</Button>}
    />
  );
}

/* -------------------------------- Renderer --------------------------------- */

export function CandidateOnboardingStep({
  step,
  data,
  update,
  onAdvance,
  onEnterWorkspace,
}: StepProps & {
  step: OnboardingStepId;
  onAdvance: () => void;
  onEnterWorkspace: () => void;
}) {
  switch (step) {
    case "welcome":
      return <WelcomeStep />;
    case "basic":
      return <BasicStep data={data} update={update} />;
    case "photo":
      return <PhotoStep data={data} update={update} />;
    case "education":
      return <EducationStep data={data} update={update} />;
    case "skills":
      return <SkillsStep data={data} update={update} />;
    case "experience":
      return <ExperienceStep data={data} update={update} />;
    case "projects":
      return <ProjectsStep data={data} update={update} />;
    case "certifications":
      return <CertificationsStep data={data} update={update} />;
    case "resume":
      return <ResumeStep data={data} update={update} />;
    case "preferences":
      return <PreferencesStep data={data} update={update} />;
    case "analysis":
      return <AnalysisStep data={data} onDone={onAdvance} />;
    case "complete":
      return <CompleteStep onEnter={onEnterWorkspace} />;
    default:
      return null;
  }
}
