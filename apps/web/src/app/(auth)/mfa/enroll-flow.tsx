"use client";

import { useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startEnrollment, type EnrollResult } from "./actions";
import { VerifyForm } from "./verify-form";

type Enrollment = Extract<EnrollResult, { ok: true }>;

export function EnrollFlow({ next }: { next: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const result = await startEnrollment();
      if (result.ok) setEnrollment(result);
      else setError(result.error);
    });

  const copySecret = async () => {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!enrollment) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Nexus requires an authenticator app (1Password, Google Authenticator, Authy…) on
            every sign-in. Setup takes about a minute.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button size="lg" onClick={begin} disabled={pending} className="w-full">
          {pending && <LoaderCircle className="animate-spin" />}
          Set up authenticator
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <ol className="grid gap-6 text-sm">
        <li className="grid gap-3">
          <p>
            <span className="font-medium">1.</span> Scan this QR code with your authenticator app.
          </p>
          <div className="mx-auto rounded-lg bg-white p-3">
            {/* SVG data URL from Supabase; next/image adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="Authenticator QR code" width={176} height={176} />
          </div>
          <div className="grid gap-1.5">
            <p className="text-muted-foreground">Can&apos;t scan? Enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
                {enrollment.secret}
              </code>
              <Button variant="outline" size="icon" onClick={copySecret} aria-label="Copy key">
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
        </li>
        <li className="grid gap-3">
          <p>
            <span className="font-medium">2.</span> Enter the 6-digit code it shows.
          </p>
          <VerifyForm factorId={enrollment.factorId} next={next} submitLabel="Finish setup" />
        </li>
      </ol>
    </div>
  );
}
