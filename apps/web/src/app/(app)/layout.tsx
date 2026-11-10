import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PageBackdrop } from "@/components/shell/page-backdrop";
import { SoundEffects } from "@/components/shell/sound-effects";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { ShellTimer } from "@/components/time/shell-timer";
import { requireUser } from "@/lib/auth";

/**
 * Authenticated app shell. The chrome is static (prerendered); only the
 * account menu reads the session, behind its own <Suspense> boundary.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="isolate flex min-h-svh">
      <SoundEffects />
      {/* Section line-art behind the content area (reads the pathname, so it streams). */}
      <Suspense fallback={null}>
        <PageBackdrop />
      </Suspense>
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Wordmark />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="grid gap-2 border-t p-2">
          <Suspense fallback={<div className="h-9" />}>
            <ShellTimer />
          </Suspense>
          <Suspense fallback={<div className="h-11" />}>
            <AccountMenu />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-2 backdrop-blur md:hidden">
          <MobileNav />
          <Link href="/" className="flex-1">
            <Wordmark />
          </Link>
          <Suspense fallback={null}>
            <ShellTimer compact />
          </Suspense>
          <Suspense fallback={<div className="size-9" />}>
            <AccountMenu compact />
          </Suspense>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

async function AccountMenu({ compact }: { compact?: boolean }) {
  const user = await requireUser();
  return <UserMenu email={user.email ?? "Account"} compact={compact} />;
}
