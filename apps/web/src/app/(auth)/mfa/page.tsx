import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/sign-out";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { EnrollFlow } from "./enroll-flow";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Two-factor" };

export default function MfaPage({ searchParams }: PageProps<"/mfa">) {
  return (
    <div className="grid gap-4">
      <Suspense fallback={<Card className="h-64 animate-pulse" />}>
        <MfaStep searchParams={searchParams} />
      </Suspense>
      <form action={signOut} className="text-center">
        <Button type="submit" variant="link" size="sm" className="text-muted-foreground">
          Use a different account
        </Button>
      </form>
    </div>
  );
}

async function MfaStep({ searchParams }: Pick<PageProps<"/mfa">, "searchParams">) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const next = safeNext((await searchParams).next);
  if (claimsData.claims.aal === "aal2") redirect(next);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];

  if (factor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-factor check</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyForm factorId={factor.id} next={next} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure your account</CardTitle>
        <CardDescription>One-time setup for two-factor authentication.</CardDescription>
      </CardHeader>
      <CardContent>
        <EnrollFlow next={next} />
      </CardContent>
    </Card>
  );
}
