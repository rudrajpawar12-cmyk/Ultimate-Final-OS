import { createFileRoute } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRecruiterSettings, useSaveRecruiterSettings } from "@/hooks/use-hiring";
import { useRecruiterProfile, useUpdateRecruiter } from "@/hooks/use-recruiter";
import { useCompanyByRecruiter, useUpdateCompany } from "@/hooks/use-company";
import { useNotificationSound } from "@/hooks/use-notification-sound";

export const Route = createFileRoute("/recruiter/settings")({
  head: () => ({
    meta: [
      { title: "Recruiter settings — CareerOS" },
      { name: "description", content: "Company profile, team and notification preferences." },
      { property: "og:title", content: "Recruiter settings — CareerOS" },
      { property: "og:description", content: "Manage your hiring workspace configuration." },
    ],
  }),
  component: RecruiterSettingsPage,
});

function RecruiterSettingsPage() {
  const settings = useRecruiterSettings();
  const save = useSaveRecruiterSettings();
  const profile = useRecruiterProfile();
  const updateProfile = useUpdateRecruiter();
  const company = useCompanyByRecruiter(profile.data?.id);
  const updateCompany = useUpdateCompany();
  const sound = useNotificationSound();

  return (
    <RecruiterPage title="Settings" description="Company profile and hiring preferences.">
      {/* ── Recruiter Profile Section (Supabase-backed) ── */}
      <AsyncSection
        isLoading={profile.isLoading}
        isError={profile.isError}
        data={profile.data}
        onRetry={() => void profile.refetch()}
        emptyTitle="No recruiter profile found"
        emptyDescription="Complete onboarding to create your recruiter profile."
        isEmpty={(data) => data === null}
      >
        {(data) =>
          data && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Recruiter profile</CardTitle>
                  <CardDescription>Your personal recruiter information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      defaultValue={data.fullName}
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value && value !== data.fullName) {
                          updateProfile.mutate({ fullName: value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input
                      id="jobTitle"
                      defaultValue={data.jobTitle}
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value && value !== data.jobTitle) {
                          updateProfile.mutate({ jobTitle: value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      defaultValue={data.department ?? ""}
                      placeholder="e.g. Engineering, HR"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.department ?? "")) {
                          updateProfile.mutate({ department: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workEmail">Work email</Label>
                    <Input
                      id="workEmail"
                      type="email"
                      defaultValue={data.workEmail ?? ""}
                      placeholder="you@company.com"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.workEmail ?? "")) {
                          updateProfile.mutate({ workEmail: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue={data.phone ?? ""}
                      placeholder="+1 (555) 000-0000"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.phone ?? "")) {
                          updateProfile.mutate({ phone: value || null });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Company details</CardTitle>
                  <CardDescription>Company information from your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileCompanyName">Company name</Label>
                    <Input
                      id="profileCompanyName"
                      defaultValue={data.companyName ?? ""}
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companyName ?? "")) {
                          updateProfile.mutate({ companyName: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileCompanyWebsite">Website</Label>
                    <Input
                      id="profileCompanyWebsite"
                      defaultValue={data.companyWebsite ?? ""}
                      placeholder="https://company.com"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companyWebsite ?? "")) {
                          updateProfile.mutate({ companyWebsite: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileCompanyIndustry">Industry</Label>
                    <Input
                      id="profileCompanyIndustry"
                      defaultValue={data.companyIndustry ?? ""}
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companyIndustry ?? "")) {
                          updateProfile.mutate({ companyIndustry: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileCompanySize">Company size</Label>
                    <Input
                      id="profileCompanySize"
                      defaultValue={data.companySize ?? ""}
                      placeholder="e.g. 51–200"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companySize ?? "")) {
                          updateProfile.mutate({ companySize: value || null });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileCompanyHQ">Headquarters</Label>
                    <Input
                      id="profileCompanyHQ"
                      defaultValue={data.companyHeadquarters ?? ""}
                      placeholder="City, Country"
                      disabled={updateProfile.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companyHeadquarters ?? "")) {
                          updateProfile.mutate({ companyHeadquarters: value || null });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      </AsyncSection>

      {/* ── Company Profile Section (Supabase-backed via Company Hooks) ── */}
      <AsyncSection
        isLoading={company.isLoading}
        isError={company.isError}
        data={company.data}
        onRetry={() => void company.refetch()}
        emptyTitle="No company profile found"
        emptyDescription="Create a company profile to get started."
        isEmpty={(data) => data === null}
      >
        {(data) =>
          data && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Company profile</CardTitle>
                  <CardDescription>Manage your company information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      defaultValue={data.companyName}
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value && value !== data.companyName) {
                          updateCompany.mutate({ id: data.id, input: { companyName: value } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      defaultValue={data.website ?? ""}
                      placeholder="https://company.com"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.website ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { website: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyIndustry">Industry</Label>
                    <Input
                      id="companyIndustry"
                      defaultValue={data.industry ?? ""}
                      placeholder="e.g. Technology, Healthcare"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.industry ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { industry: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company size</Label>
                    <Input
                      id="companySize"
                      defaultValue={data.companySize ?? ""}
                      placeholder="e.g. 51–200"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.companySize ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { companySize: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      defaultValue={data.email ?? ""}
                      placeholder="contact@company.com"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.email ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { email: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone</Label>
                    <Input
                      id="companyPhone"
                      type="tel"
                      defaultValue={data.phone ?? ""}
                      placeholder="+1 (555) 000-0000"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.phone ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { phone: value || null } });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Company location</CardTitle>
                  <CardDescription>Address and headquarters information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Input
                      id="companyAddress"
                      defaultValue={data.address ?? ""}
                      placeholder="Street address"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.address ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { address: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyCity">City</Label>
                    <Input
                      id="companyCity"
                      defaultValue={data.city ?? ""}
                      placeholder="City"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.city ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { city: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyState">State / Province</Label>
                    <Input
                      id="companyState"
                      defaultValue={data.state ?? ""}
                      placeholder="State or province"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.state ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { state: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyCountry">Country</Label>
                    <Input
                      id="companyCountry"
                      defaultValue={data.country ?? ""}
                      placeholder="Country"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.country ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { country: value || null } });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPostalCode">Postal code</Label>
                    <Input
                      id="companyPostalCode"
                      defaultValue={data.postalCode ?? ""}
                      placeholder="Postal / ZIP code"
                      disabled={updateCompany.isPending}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value !== (data.postalCode ?? "")) {
                          updateCompany.mutate({ id: data.id, input: { postalCode: value || null } });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      </AsyncSection>

      {/* ── Notifications Section (local/mock) ── */}
      <AsyncSection
        isLoading={settings.isLoading}
        isError={settings.isError}
        data={settings.data}
        onRetry={() => void settings.refetch()}
      >
        {(data) => (
          <Card className="shadow-elevated border-border/70">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={notification.id}>{notification.label}</Label>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch
                    id={notification.id}
                    checked={notification.enabled}
                    disabled={save.isPending}
                    onCheckedChange={(checked) =>
                      save.mutate({
                        ...data,
                        notifications: data.notifications.map((item) =>
                          item.id === notification.id ? { ...item, enabled: checked } : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notification-sound">Notification sound</Label>
                  <p className="text-xs text-muted-foreground">
                    Play a short chime when a new in-app notification arrives.
                  </p>
                </div>
                <Switch
                  id="notification-sound"
                  checked={sound.enabled}
                  onCheckedChange={sound.setEnabled}
                />
              </div>
            </CardContent>

          </Card>
        )}
      </AsyncSection>
    </RecruiterPage>
  );
}
