export type PlanId = "free" | "pro" | "enterprise";

export type FeatureKey = "ai-credits" | "resume-analyses" | "job-applications" | "recruiter-seats";

export interface PlanPrice {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: PlanPrice;
  highlights: string[];
  recommended?: boolean;
}

export interface UsageMetric {
  key: FeatureKey;
  label: string;
  used: number;
  /** null means unlimited on the current plan. */
  limit: number | null;
  unit: string;
  resetsOn: string;
}

export interface Subscription {
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  billingCycle: "monthly" | "yearly";
  renewsOn: string;
  seats: number;
}

export interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "refunded";
  description: string;
}

export interface PaymentMethod {
  brand: string;
  last4: string;
  expiry: string;
  holder: string;
}

export interface ComparisonRow {
  label: string;
  free: string;
  pro: string;
  enterprise: string;
}

export interface BillingOverview {
  subscription: Subscription;
  plans: Plan[];
  usage: UsageMetric[];
  invoices: Invoice[];
  paymentMethod: PaymentMethod | null;
  comparison: ComparisonRow[];
}

export interface FeatureGate {
  key: FeatureKey;
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  reason?: string;
}
