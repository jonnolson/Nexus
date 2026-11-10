import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** One dashboard panel: glass card with a header (icon, title, actions) and optional "view all" footer. */
export function Block({
  title,
  icon: Icon,
  actions,
  viewAll,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  viewAll?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("glass flex flex-col rounded-xl", className)} aria-label={title}>
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Icon className="size-4 text-primary-ink" aria-hidden />
        <h2 className="flex-1 text-sm font-medium">{title}</h2>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
      <div className="flex-1 px-2 pb-2">{children}</div>
      {viewAll && (
        <footer className="border-t px-4 py-2.5">
          <Link
            href={viewAll.href}
            data-sound
            className="group inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary-ink"
          >
            {viewAll.label}
            <ArrowRight className="size-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </footer>
      )}
    </section>
  );
}

/** A clickable row inside a block: title + subtitle on the left, meta on the right. */
export function BlockRow({
  href,
  title,
  subtitle,
  meta,
  trailing,
}: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  /** Extra control outside the link (e.g. a timer button). */
  trailing?: React.ReactNode;
}) {
  return (
    <li className="relative flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-foreground/5">
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="block truncate text-sm font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
        >
          {title}
        </Link>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {meta && <div className="shrink-0 text-right text-xs text-muted-foreground">{meta}</div>}
      {trailing && <div className="relative z-10 shrink-0">{trailing}</div>}
    </li>
  );
}

export function BlockEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function BlockSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass grid gap-3 rounded-xl p-4", className)} aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
      ))}
    </div>
  );
}
