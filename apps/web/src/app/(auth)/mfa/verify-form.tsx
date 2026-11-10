"use client";

import { useActionState, useRef } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { verifyCode } from "./actions";

export function VerifyForm({
  factorId,
  next,
  submitLabel = "Verify",
}: {
  factorId: string;
  next: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(verifyCode, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />

      <div className="flex justify-center">
        <InputOTP
          name="code"
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          disabled={pending}
          aria-label="6-digit code"
          aria-invalid={state?.error ? true : undefined}
          onComplete={() => formRef.current?.requestSubmit()}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="size-11 text-base" />
            <InputOTPSlot index={1} className="size-11 text-base" />
            <InputOTPSlot index={2} className="size-11 text-base" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="size-11 text-base" />
            <InputOTPSlot index={4} className="size-11 text-base" />
            <InputOTPSlot index={5} className="size-11 text-base" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {state?.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
