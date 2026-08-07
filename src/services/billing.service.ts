import { localBillingRepository, type BillingRepository } from "@/repositories/billing.repository";
import type {
  BillingOverview,
  FeatureGate,
  FeatureKey,
  Plan,
  PlanId,
  PaymentMethod,
  Subscription,
  UsageMetric,
} from "@/types/billing";

export const PLAN_ORDER: PlanId[] = ["free", "pro", "enterprise"];

/**
 * Service layer for subscription, usage and feature gating.
 * Frontend-only rules live here so pages stay presentational.
 */
export function createBillingService(repository: BillingRepository = localBillingRepository) {
  return {
    getOverview: () => repository.getOverview(),
    changePlan: (planId: PlanId) => repository.changePlan(planId),
    setBillingCycle: (cycle: Subscription["billingCycle"]) => repository.setBillingCycle(cycle),
    savePaymentMethod: (method: PaymentMethod) => repository.savePaymentMethod(method),

    formatPrice(plan: Plan, cycle: Subscription["billingCycle"]) {
      const amount = cycle === "yearly" ? plan.price.yearly : plan.price.monthly;
      if (amount === 0) return "Free";
      const formatted = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: plan.price.currency,
        maximumFractionDigits: 0,
      }).format(amount);
      return `${formatted}/${cycle === "yearly" ? "yr" : "mo"}`;
    },

    formatAmount(amount: number, currency: string) {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    },

    yearlySavings(plan: Plan) {
      if (plan.price.monthly === 0) return 0;
      const full = plan.price.monthly * 12;
      return Math.max(0, Math.round(((full - plan.price.yearly) / full) * 100));
    },

    usagePercent(metric: UsageMetric) {
      if (metric.limit === null) return 0;
      if (metric.limit === 0) return 100;
      return Math.min(100, Math.round((metric.used / metric.limit) * 100));
    },

    isNearLimit(metric: UsageMetric) {
      return metric.limit !== null && metric.used / metric.limit >= 0.8;
    },

    gate(overview: BillingOverview | undefined, key: FeatureKey): FeatureGate {
      const metric = overview?.usage.find((item) => item.key === key);
      if (!metric) return { key, allowed: true, remaining: null, limit: null };
      if (metric.limit === null) return { key, allowed: true, remaining: null, limit: null };
      const remaining = Math.max(0, metric.limit - metric.used);
      return {
        key,
        allowed: remaining > 0,
        remaining,
        limit: metric.limit,
        reason:
          remaining > 0
            ? undefined
            : `You've used all ${metric.limit} ${metric.unit} on your current plan.`,
      };
    },

    nextPlan(planId: PlanId): PlanId | null {
      const index = PLAN_ORDER.indexOf(planId);
      return index >= 0 && index < PLAN_ORDER.length - 1 ? PLAN_ORDER[index + 1] : null;
    },
  };
}

export const billingService = createBillingService();
