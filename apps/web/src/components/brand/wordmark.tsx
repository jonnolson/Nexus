import { cn } from "@/lib/utils";
import { LOGO_MARK_DOT, LOGO_MARK_PATHS, LOGO_TEXT_PATH } from "./logo-paths";

/**
 * The Nexus logo (public/nexus-logo.svg), drawn inline so its colour follows the
 * theme: brand aqua #94FFF3 in dark mode, a deep teal of the same hue in light
 * mode (aqua on white would be unreadable). See --primary-ink in globals.css.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 454 131"
      role="img"
      aria-label="Nexus"
      className={cn("h-6 w-auto fill-primary-ink", className)}
    >
      <path d={LOGO_TEXT_PATH} />
      {LOGO_MARK_PATHS.map((d) => (
        <path key={d.slice(0, 12)} d={d} />
      ))}
      <rect {...LOGO_MARK_DOT} />
    </svg>
  );
}

/** Just the mark (square), e.g. for compact spots. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 30.2 86 86" role="img" aria-label="Nexus" className={cn("size-6 fill-primary-ink", className)}>
      {LOGO_MARK_PATHS.map((d) => (
        <path key={d.slice(0, 12)} d={d} />
      ))}
      <rect {...LOGO_MARK_DOT} />
    </svg>
  );
}
