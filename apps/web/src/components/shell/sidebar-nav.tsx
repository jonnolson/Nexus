"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navSections } from "./nav-config";

type NavProps = { onNavigate?: () => void };

/**
 * The pathname is request data on dynamic routes (e.g. /clients/[id]), so the
 * highlighted nav streams in behind <Suspense>; the fallback is the same nav
 * without an active item, which prerenders into the static shell.
 */
export function SidebarNav(props: NavProps) {
  return (
    <Suspense fallback={<NavLinks pathname={null} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

function ActiveNavLinks(props: NavProps) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

function NavLinks({ pathname, onNavigate }: NavProps & { pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null &&
    (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Main" className="grid gap-6">
      {navSections.map((section, i) => (
        <div key={section.title ?? i} className="grid gap-1">
          {section.title && (
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{section.title}</p>
          )}
          {section.items.map(({ label, href, icon: Icon, ready }) =>
            ready ? (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive(href) ? "page" : undefined}
                data-sound
                className={cn(
                  "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-150",
                  // Active = accent outline + text, no fill (see CLAUDE.md → Design).
                  isActive(href)
                    ? "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ) : (
              <span
                key={href}
                aria-disabled
                className="flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground/70"
              >
                <Icon className="size-4" />
                {label}
                <span className="ml-auto rounded border px-1.5 text-[0.65rem] leading-4">Soon</span>
              </span>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}
