import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfile } from "@/lib/settings/data";
import { profileToFormValues } from "@/lib/settings/schema";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your business details and invoicing defaults.</p>
      </div>
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const profile = await getProfile();
  return <SettingsForm defaults={profileToFormValues(profile)} />;
}
