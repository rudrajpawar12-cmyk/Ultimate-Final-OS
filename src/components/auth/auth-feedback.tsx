import { MailCheck } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { SuccessState } from "@/components/ui/states";

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export function EmailVerificationNotice({ email }: { email?: string }) {
  return (
    <SuccessState
      icon={MailCheck}
      title="Verify your email"
      description={
        email
          ? `We sent a verification link to ${email}. Confirm it to unlock every CareerOS module.`
          : "We sent you a verification link. Confirm it to unlock every CareerOS module."
      }
    />
  );
}
