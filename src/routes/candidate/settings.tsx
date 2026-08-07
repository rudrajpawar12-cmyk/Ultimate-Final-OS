import { createFileRoute, Link } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCandidateSettings, useUpdateSettings } from "@/hooks/use-candidate";
import { useNotificationSound } from "@/hooks/use-notification-sound";

export const Route = createFileRoute("/candidate/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CareerOS" },
      {
        name: "description",
        content: "Manage your account, security, job alerts, notifications and subscription.",
      },
      { property: "og:title", content: "Settings — CareerOS" },
      { property: "og:description", content: "Control your CareerOS account and preferences." },
    ],
  }),
  component: CandidateSettingsPage,
});

function CandidateSettingsPage() {
  const query = useCandidateSettings();
  const update = useUpdateSettings();
  const sound = useNotificationSound();


  return (
    <CandidatePage title="Settings" description="Account, privacy, notifications and billing.">
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        }
      >
        {(settings) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Your sign-in and locale details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Email" value={settings.account.email} />
                <Row label="Language" value={settings.account.language} />
                <Row label="Timezone" value={settings.account.timezone} />
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Keep your account protected.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ToggleRow
                  id="two-factor"
                  label="Two-factor authentication"
                  hint="Require a second factor at sign-in."
                  checked={settings.security.twoFactor}
                  disabled={update.isPending}
                  onChange={(checked) =>
                    update.mutate({
                      security: { ...settings.security, twoFactor: checked },
                    })
                  }
                />
                <Row
                  label="Last password change"
                  value={new Date(settings.security.lastPasswordChange).toLocaleDateString()}
                />
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Job preferences</CardTitle>
                <CardDescription>How CareerOS surfaces roles to you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ["jobAlerts", "Job alerts", "Email me when a strong match is posted."],
                    ["weeklyDigest", "Weekly digest", "A Monday summary of your search."],
                    [
                      "profileVisible",
                      "Profile visible to recruiters",
                      "Let verified recruiters discover you.",
                    ],
                  ] as const
                ).map(([key, label, hint]) => (
                  <ToggleRow
                    key={key}
                    id={`pref-${key}`}
                    label={label}
                    hint={hint}
                    checked={settings.preferences[key]}
                    disabled={update.isPending}
                    onChange={(checked) =>
                      update.mutate({
                        preferences: { ...settings.preferences, [key]: checked },
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Choose what reaches your inbox.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ["applicationUpdates", "Application updates"],
                    ["interviewReminders", "Interview reminders"],
                    ["newMatches", "New job matches"],
                    ["productNews", "Product news"],
                  ] as const
                ).map(([key, label]) => (
                  <ToggleRow
                    key={key}
                    id={`notify-${key}`}
                    label={label}
                    checked={settings.notifications[key]}
                    disabled={update.isPending}
                    onChange={(checked) =>
                      update.mutate({
                        notifications: { ...settings.notifications, [key]: checked },
                      })
                    }
                  />
                ))}
                <div className="border-t border-border/60 pt-4">
                  <ToggleRow
                    id="notify-sound"
                    label="Notification sound"
                    hint="Play a short chime when a new in-app notification arrives."
                    checked={sound.enabled}
                    onChange={sound.setEnabled}
                  />
                </div>
              </CardContent>

            </Card>

            <Card className="shadow-elevated border-border/70 lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Subscription</CardTitle>
                  <CardDescription>
                    Renews {new Date(settings.subscription.renewsOn).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={settings.subscription.plan === "pro" ? "default" : "secondary"}>
                  {settings.subscription.plan === "pro" ? "Pro" : "Free"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>AI credits used</span>
                    <span className="text-muted-foreground">
                      {settings.subscription.aiCreditsUsed} / {settings.subscription.aiCredits}
                    </span>
                  </div>
                  <Progress
                    value={
                      settings.subscription.aiCredits
                        ? (settings.subscription.aiCreditsUsed / settings.subscription.aiCredits) *
                          100
                        : 0
                    }
                    aria-label="AI credits used"
                  />
                </div>
                <Button asChild>
                  <Link to="/billing">Manage billing</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </AsyncSection>
    </CandidatePage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
