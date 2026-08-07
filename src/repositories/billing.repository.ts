import {
  comparisonFixture,
  invoicesFixture,
  paymentMethodFixture,
  plansFixture,
  subscriptionFixture,
  usageFixture,
} from "@/repositories/fixtures/platform.fixtures";
import type {
  BillingOverview,
  Invoice,
  PaymentMethod,
  PlanId,
  Subscription,
  UsageMetric,
} from "@/types/billing";

/**
 * Data source boundary for subscription & billing.
 * Frontend-only: a payment provider implementation slots in here later.
 */
export interface BillingRepository {
  getOverview(): Promise<BillingOverview>;
  changePlan(planId: PlanId): Promise<Subscription>;
  setBillingCycle(cycle: Subscription["billingCycle"]): Promise<Subscription>;
  savePaymentMethod(method: PaymentMethod): Promise<PaymentMethod>;
}

const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

let subscription: Subscription = { ...subscriptionFixture };
let paymentMethod: PaymentMethod | null = paymentMethodFixture;
const invoices: Invoice[] = invoicesFixture.map((invoice) => ({ ...invoice }));

const limitsByPlan: Record<PlanId, Record<string, number | null>> = {
  free: {
    "ai-credits": 20,
    "resume-analyses": 3,
    "job-applications": 15,
    "recruiter-seats": 1,
  },
  pro: {
    "ai-credits": 500,
    "resume-analyses": null,
    "job-applications": null,
    "recruiter-seats": 3,
  },
  enterprise: {
    "ai-credits": null,
    "resume-analyses": null,
    "job-applications": null,
    "recruiter-seats": null,
  },
};

function usageForPlan(planId: PlanId): UsageMetric[] {
  return usageFixture.map((metric) => ({
    ...metric,
    limit: limitsByPlan[planId][metric.key] ?? null,
  }));
}

export const localBillingRepository: BillingRepository = {
  async getOverview() {
    await delay();
    return {
      subscription,
      plans: plansFixture,
      usage: usageForPlan(subscription.planId),
      invoices,
      paymentMethod,
      comparison: comparisonFixture,
    };
  },
  async changePlan(planId) {
    await delay(320);
    subscription = { ...subscription, planId, status: "active" };
    return subscription;
  },
  async setBillingCycle(cycle) {
    await delay(180);
    subscription = { ...subscription, billingCycle: cycle };
    return subscription;
  },
  async savePaymentMethod(method) {
    await delay(240);
    paymentMethod = method;
    return method;
  },
};
