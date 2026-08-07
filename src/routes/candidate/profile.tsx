import { createFileRoute } from "@tanstack/react-router";
import { Award, Braces, Briefcase, GraduationCap, Link2, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { useCandidateProfile, useUpdateProfile } from "@/hooks/use-candidate";
import { useEducation, useCreateEducation, useDeleteEducation } from "@/hooks/use-education";
import {
  useExperience,
  useCreateExperience,
  useDeleteExperience,
} from "@/hooks/use-experience";
import { useSkills, useCreateSkill, useDeleteSkill } from "@/hooks/use-skills";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-projects";
import { candidateService } from "@/services/candidate.service";
import type { CandidateProfile, Education, Experience, ProjectItem, Skill } from "@/types/candidate";

/**
 * Splits a single free-text entry like "Frontend Engineer — Acme" into
 * job title and company name. Falls back to using the whole value for both.
 */
function parseExperienceEntry(value: string): { jobTitle: string; companyName: string } {
  const separator = /\s+(?:—|–|-|@|at)\s+/i;
  const parts = value.split(separator);
  if (parts.length >= 2) {
    const jobTitle = parts[0].trim();
    const companyName = parts.slice(1).join(" ").trim();
    if (jobTitle.length >= 2 && companyName.length >= 2) {
      return { jobTitle, companyName };
    }
  }
  return { jobTitle: value, companyName: value };
}

export const Route = createFileRoute("/candidate/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — CareerOS" },
      {
        name: "description",
        content: "Manage your CareerOS candidate profile, skills and history.",
      },
      { property: "og:title", content: "Your profile — CareerOS" },
      { property: "og:description", content: "Skills, education, experience, projects and links." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const query = useCandidateProfile();
  const update = useUpdateProfile();

  return (
    <CandidatePage
      title="Profile"
      description="Everything recruiters and the AI engine read about you."
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<ListSkeleton count={3} />}
      >
        {(profile) => (
          <ProfileEditor
            profile={profile}
            saving={update.isPending}
            onSave={(patch) => update.mutate(patch)}
          />
        )}
      </AsyncSection>
    </CandidatePage>
  );
}

function ProfileEditor({
  profile,
  saving,
  onSave,
}: {
  profile: CandidateProfile;
  saving: boolean;
  onSave: (patch: Partial<CandidateProfile>) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const completion = candidateService.computeCompletion(draft);

  // Education persistence via Supabase
  const educationQuery = useEducation();
  const createEducation = useCreateEducation();
  const deleteEducation = useDeleteEducation();

  // Experience persistence via Supabase
  const experienceQuery = useExperience();
  const createExperience = useCreateExperience();
  const deleteExperience = useDeleteExperience();

  // Skills persistence via Supabase
  const skillsQuery = useSkills();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();

  // Projects persistence via Supabase
  const projectsQuery = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  // Sync Supabase experience data into draft when loaded
  useEffect(() => {
    if (experienceQuery.data) {
      const mapped: Experience[] = experienceQuery.data.map((item) => ({
        id: item.id,
        company: item.companyName,
        title: item.jobTitle,
        location: item.location ?? undefined,
        startDate: item.startDate ?? "",
        endDate: item.endDate,
        current: item.currentlyWorking,
        summary: item.description ?? undefined,
      }));
      setDraft((prev) => ({ ...prev, experience: mapped }));
    }
  }, [experienceQuery.data]);

  // Sync Supabase education data into draft when loaded
  useEffect(() => {
    if (educationQuery.data) {
      const mapped: Education[] = educationQuery.data.map((item) => ({
        id: item.id,
        institution: item.institution,
        degree: item.degree,
        field: item.fieldOfStudy ?? "",
        startYear: item.startDate ?? "",
        endYear: item.endDate ?? "",
        grade: item.grade ?? undefined,
      }));
      setDraft((prev) => ({ ...prev, education: mapped }));
    }
  }, [educationQuery.data]);

  // Sync Supabase skills data into draft when loaded
  useEffect(() => {
    if (skillsQuery.data) {
      const mapped: Skill[] = skillsQuery.data.map((item) => ({
        id: item.id,
        name: item.skillName,
        level: (item.proficiencyLevel as Skill["level"]) || "intermediate",
        years: item.yearsOfExperience ?? undefined,
      }));
      setDraft((prev) => ({ ...prev, skills: mapped }));
    }
  }, [skillsQuery.data]);

  // Sync Supabase projects data into draft when loaded
  useEffect(() => {
    if (projectsQuery.data) {
      const mapped: ProjectItem[] = projectsQuery.data.map((item) => ({
        id: item.id,
        name: item.title,
        description: item.description ?? "",
        url: item.githubUrl ?? item.liveUrl ?? undefined,
        tech: item.technologies ?? [],
      }));
      setDraft((prev) => ({ ...prev, projects: mapped }));
    }
  }, [projectsQuery.data]);

  return (
    <div className="space-y-6">
      <Card className="shadow-elevated border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Profile completion</CardTitle>
          <CardDescription>{completion.percentage}% complete</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={completion.percentage} />
          <div className="flex flex-wrap gap-2">
            {completion.sections.map((section) => (
              <Badge key={section.label} variant={section.done ? "secondary" : "outline"}>
                {section.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card className="shadow-elevated border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4 text-primary" /> Personal information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                value={draft.fullName}
                onChange={(v) => setDraft({ ...draft, fullName: v })}
              />
              <Field
                label="Headline"
                value={draft.headline}
                onChange={(v) => setDraft({ ...draft, headline: v })}
              />
              <Field
                label="Email"
                value={draft.email}
                onChange={(v) => setDraft({ ...draft, email: v })}
              />
              <Field
                label="Phone"
                value={draft.phone ?? ""}
                onChange={(v) => setDraft({ ...draft, phone: v })}
              />
              <Field
                label="Location"
                value={draft.location ?? ""}
                onChange={(v) => setDraft({ ...draft, location: v })}
              />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={5}
                  maxLength={1000}
                  value={draft.bio}
                  onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <SectionCard icon={Braces} title="Skills" empty={!draft.skills.length}>
            <div className="flex flex-wrap gap-2">
              {draft.skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="rounded-full">
                  {skill.name} · {skill.level}
                  <button
                    type="button"
                    aria-label={`Remove ${skill.name}`}
                    className="ml-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      deleteSkill.mutate(skill.id);
                      setDraft({ ...draft, skills: draft.skills.filter((s) => s.id !== skill.id) });
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <AddInline
              placeholder="Add a skill"
              onAdd={(value) => {
                createSkill.mutate({
                  skillName: value,
                  proficiencyLevel: "intermediate",
                });
              }}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <SectionCard icon={GraduationCap} title="Education" empty={!draft.education.length}>
            {draft.education.map((item) => (
              <Row
                key={item.id}
                title={`${item.degree} ${item.field}`}
                subtitle={`${item.institution} · ${item.startYear}–${item.endYear}`}
                onRemove={() => {
                  deleteEducation.mutate(item.id);
                  setDraft({ ...draft, education: draft.education.filter((e) => e.id !== item.id) });
                }}
              />
            ))}
            <AddInline
              placeholder="B.Tech Computer Science — IIT Delhi"
              onAdd={(value) => {
                createEducation.mutate({
                  institution: value,
                  degree: value,
                  fieldOfStudy: "",
                  startDate: "",
                  endDate: "",
                });
              }}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <SectionCard icon={Briefcase} title="Experience" empty={!draft.experience.length}>
            {draft.experience.map((item) => (
              <Row
                key={item.id}
                title={`${item.title} · ${item.company}`}
                subtitle={`${item.startDate} – ${item.current ? "Present" : (item.endDate ?? "")}`}
                description={item.summary}
                onRemove={() => {
                  deleteExperience.mutate(item.id);
                  setDraft({
                    ...draft,
                    experience: draft.experience.filter((e) => e.id !== item.id),
                  });
                }}
              />
            ))}
            <AddInline
              placeholder="Frontend Engineer — Acme"
              onAdd={(value) => {
                const { jobTitle, companyName } = parseExperienceEntry(value);
                createExperience.mutate({
                  jobTitle,
                  companyName,
                  employmentType: "",
                  location: "",
                  startDate: "",
                  endDate: "",
                  currentlyWorking: false,
                  description: "",
                });
              }}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <SectionCard icon={Braces} title="Projects" empty={!draft.projects.length}>
            {draft.projects.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                subtitle={item.tech.join(" · ")}
                description={item.description}
                onRemove={() => {
                  deleteProject.mutate(item.id);
                  setDraft({ ...draft, projects: draft.projects.filter((p) => p.id !== item.id) });
                }}
              />
            ))}
            <AddInline
              placeholder="Project name"
              onAdd={(value) =>
                createProject.mutate(
                  { title: value, description: null, technologies: [] },
                  {
                    onSuccess: (created) => {
                      setDraft((prev) => ({
                        ...prev,
                        projects: [
                          ...prev.projects,
                          {
                            id: created.id,
                            name: created.title,
                            description: created.description ?? "",
                            url: created.githubUrl ?? created.liveUrl ?? undefined,
                            tech: created.technologies ?? [],
                          },
                        ],
                      }));
                    },
                  },
                )
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          <SectionCard icon={Award} title="Certifications" empty={!draft.certifications.length}>
            {draft.certifications.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                subtitle={`${item.issuer} · ${item.issuedOn}`}
                onRemove={() =>
                  setDraft({
                    ...draft,
                    certifications: draft.certifications.filter((c) => c.id !== item.id),
                  })
                }
              />
            ))}
            <AddInline
              placeholder="AWS Certified Developer"
              onAdd={(value) =>
                setDraft({
                  ...draft,
                  certifications: [
                    ...draft.certifications,
                    { id: crypto.randomUUID(), name: value, issuer: "", issuedOn: "" },
                  ],
                })
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <Card className="shadow-elevated border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="size-4 text-primary" /> Social links
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="LinkedIn"
                value={draft.social.linkedin ?? ""}
                onChange={(v) => setDraft({ ...draft, social: { ...draft.social, linkedin: v } })}
              />
              <Field
                label="GitHub"
                value={draft.social.github ?? ""}
                onChange={(v) => setDraft({ ...draft, social: { ...draft.social, github: v } })}
              />
              <Field
                label="Portfolio"
                value={draft.social.portfolio ?? ""}
                onChange={(v) => setDraft({ ...draft, social: { ...draft.social, portfolio: v } })}
              />
              <Field
                label="X / Twitter"
                value={draft.social.twitter ?? ""}
                onChange={(v) => setDraft({ ...draft, social: { ...draft.social, twitter: v } })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setDraft(profile)} disabled={saving}>
          Reset
        </Button>
        <Button onClick={() => onSave(draft)} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        value={value}
        maxLength={200}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  empty,
  children,
}: {
  icon: typeof Award;
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {empty && (
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            description="Add your first entry below."
          />
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function Row({
  title,
  subtitle,
  description,
  onRemove,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function AddInline({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        maxLength={120}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button
        variant="outline"
        disabled={!value.trim()}
        onClick={() => {
          onAdd(value.trim());
          setValue("");
        }}
      >
        Add
      </Button>
    </div>
  );
}
