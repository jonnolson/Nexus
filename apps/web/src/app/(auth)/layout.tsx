import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <Wordmark className="h-9" />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
