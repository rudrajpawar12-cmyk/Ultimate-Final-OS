import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard, Download } from "lucide-react";
import { useState } from "react";

import { candidateNav } from "@/components/candidate/candidate-nav";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { recruiterNav } from "@/components/recruiter/recruiter-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/page-container";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useBillingActions, useBillingOverview } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import { billingService } from "@/services/billing.service";
import type { PaymentMethod, PlanId, Subscription } from "@/types/billing";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & billing — CareerOS" },
      {
        name: "description",
        content: "Manage your CareerOS plan, AI usage, invoices and payment method.",
      },
      { property: "og:title", content: "Subscription & billing — CareerOS" },
      { property: "og:description", content: "Plans, usage and invoices for CareerOS." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useBillingOverview();
  const { changePlan, setBillingCycle, savePaymentMethod } = useBillingActions();

  return (
    <ProtectedRoute>
      <DashboardLayout
        groups={user?.role === "recruiter" ? recruiterNav : candidateNav}
        breadcrumbs={[{ label: "Account" }, { label: "Billing" }]}
        showUpgrade={false}
      >
        <SectionHeader
          align="left"
          title="Subscription & billing"
          description="Your plan, usage and invoices. Payments are simulated in this preview."
        />

        <div className="mt-6 space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-72 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          ) : isError || !data ? (
            <ErrorState
              title="Couldn't load billing"
              description="Retry in a moment."
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <Card className="shadow-elevated border-border/70">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Current plan</p>
                    <p className="text-2xl font-bold capitalize">{data.subscription.planId}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.subscription.status} · renews{" "}
                      {new Date(data.subscription.renewsOn).toLocaleDateString()} ·{" "}
                      {data.subscription.seats} seat{data.subscription.seats > 1 ? "s" : ""}
                    </p>
                  </div>
                  <CycleToggle
                    cycle={data.subscription.billingCycle}
                    onChange={(cycle) => setBillingCycle.mutate(cycle)}
                  />
                </CardContent>
              </Card>

              <section className="space-y-4" aria-label="Usage this period">
                <h2 className="text-lg font-semibold tracking-tight">Usage</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {data.usage.map((metric) => {
                    const percent = billingService.usagePercent(metric);
                    const near = billingService.isNearLimit(metric);
                    return (
                      <Card key={metric.key} className="shadow-elevated border-border/70">
                        <CardContent className="space-y-3 p-5">
                          <p className="text-sm font-medium">{metric.label}</p>
                          <p className="text-2xl font-bold">
                            {metric.used}
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              / {metric.limit ?? "∞"} {metric.unit}
                            </span>
                          </p>
                          <Progress
                            value={percent}
                            className={cn(near && "[&>div]:bg-destructive")}
                            aria-label={`${metric.label} usage ${percent}%`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Resets {new Date(metric.resetsOn).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4" aria-label="Plans">
                <h2 className="text-lg font-semibold tracking-tight">Plans</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {data.plans.map((plan) => {
                    const current = plan.id === data.subscription.planId;
                    const savings = billingService.yearlySavings(plan);
                    return (
                      <Card
                        key={plan.id}
                        className={cn(
                          "shadow-elevated flex flex-col border-border/70",
                          plan.recommended && "border-primary ring-1 ring-primary/30",
                        )}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            {plan.recommended && (
                              <Badge className="rounded-full">Recommended</Badge>
                            )}
                          </div>
                          <CardDescription>{plan.tagline}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-4">
                          <div>
                            <p className="text-3xl font-bold">
                              {billingService.formatPrice(plan, data.subscription.billingCycle)}
                            </p>
                            {data.subscription.billingCycle === "yearly" && savings > 0 && (
                              <p className="text-xs text-success">Save {savings}% yearly</p>
                            )}
                          </div>
                          <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                            {plan.highlights.map((highlight) => (
                              <li key={highlight} className="flex gap-2">
                                <Check
                                  className="mt-0.5 size-4 shrink-0 text-success"
                                  aria-hidden="true"
                                />
                                {highlight}
                              </li>
                            ))}
                          </ul>
                          <Button
                            variant={current ? "outline" : "default"}
                            disabled={current || changePlan.isPending}
                            onClick={() => changePlan.mutate(plan.id as PlanId)}
                          >
                            {current ? "Current plan" : `Switch to ${plan.name}`}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4" aria-label="Plan comparison">
                <h2 className="text-lg font-semibold tracking-tight">Compare plans</h2>
                <Card className="shadow-elevated overflow-x-auto border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Free</TableHead>
                        <TableHead>Pro</TableHead>
                        <TableHead>Enterprise</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.comparison.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell>{row.free}</TableCell>
                          <TableCell>{row.pro}</TableCell>
                          <TableCell>{row.enterprise}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <PaymentMethodCard
                  method={data.paymentMethod}
                  onSave={(method) => savePaymentMethod.mutate(method)}
                  isSaving={savePaymentMethod.isPending}
                />

                <Card className="shadow-elevated border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">Invoices</CardTitle>
                    <CardDescription>Download receipts for your records.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{invoice.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.issuedAt).toLocaleDateString()} ·{" "}
                            {invoice.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full capitalize">
                            {invoice.status}
                          </Badge>
                          <span className="text-sm font-semibold">
                            {billingService.formatAmount(invoice.amount, invoice.currency)}
                          </span>
                          <Button variant="ghost" size="sm" aria-label="Download invoice">
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function CycleToggle({
  cycle,
  onChange,
}: {
  cycle: Subscription["billingCycle"];
  onChange: (cycle: Subscription["billingCycle"]) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-border/70 p-1"
      role="group"
      aria-label="Billing cycle"
    >
      {(["monthly", "yearly"] as const).map((value) => (
        <Button
          key={value}
          size="sm"
          variant={cycle === value ? "default" : "ghost"}
          className="rounded-full capitalize"
          aria-pressed={cycle === value}
          onClick={() => onChange(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}

function PaymentMethodCard({
  method,
  onSave,
  isSaving,
}: {
  method: PaymentMethod | null;
  onSave: (method: PaymentMethod) => void;
  isSaving: boolean;
}) {
  const [holder, setHolder] = useState(method?.holder ?? "");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState(method?.expiry ?? "");

  const digits = number.replace(/\D/g, "");
  const valid = holder.trim().length > 1 && digits.length >= 12 && /^\d{2}\/\d{2}$/.test(expiry);

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" aria-hidden="true" /> Payment method
        </CardTitle>
        <CardDescription>
          {method ? `${method.brand} ending ${method.last4} · expires ${method.expiry}` : "No card on file yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onSave({
              brand: digits.startsWith("4") ? "Visa" : "Mastercard",
              last4: digits.slice(-4),
              expiry,
              holder: holder.trim(),
            });
            setNumber("");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="card-holder">Cardholder name</Label>
            <Input
              id="card-holder"
              value={holder}
              onChange={(event) => setHolder(event.target.value)}
              autoComplete="cc-name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card number</Label>
              <Input
                id="card-number"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                autoComplete="cc-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-expiry">Expiry (MM/YY)</Label>
              <Input
                id="card-expiry"
                placeholder="04/29"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
                autoComplete="cc-exp"
              />
            </div>
          </div>
          <Button type="submit" disabled={!valid || isSaving}>
            {isSaving ? "Saving…" : "Save card"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
