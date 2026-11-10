"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";
import { navSections } from "@/components/shell/nav-config";

/**
 * Decorative line-art behind each section (files in public/background-graphics,
 * named after their page). The SVG is used as a mask over a pure white fill at 5%
 * opacity (owner's choice), large and anchored off the bottom-right corner.
 *
 * Every time you move to a different tab the art turns another 20° with a smooth
 * ease-out. The layout keeps this component mounted, so the angle accumulates across
 * navigation (resets on a full reload).
 */
const STEP_DEG = 20;

type Backdrop = { file: string; rotate?: number };

// Keyed by the first URL segment. Sections without their own art reuse one, turned
// so it doesn't look identical.
const BACKDROPS: Record<string, Backdrop> = {
  "": { file: "dashboard" },
  clients: { file: "clients" },
  projects: { file: "projects" },
  tasks: { file: "tasks" },
  time: { file: "time" },
  invoices: { file: "invoices" },
  expenses: { file: "expenses" },
  notes: { file: "notes" },
  contracts: { file: "invoices", rotate: 45 },
  settings: { file: "dashboard", rotate: 45 },
};

const NAV_HREFS = navSections
  .flatMap((s) => s.items.map((i) => i.href))
  .filter((h) => h !== "/")
  .sort((a, b) => b.length - a.length);

/** Which tab a path belongs to: the longest matching nav href, else its first segment. */
function tabOf(pathname: string) {
  if (pathname === "/") return "/";
  return NAV_HREFS.find((h) => pathname === h || pathname.startsWith(`${h}/`)) ?? `/${pathname.split("/")[1]}`;
}

export function PageBackdrop() {
  const pathname = usePathname();
  const tab = tabOf(pathname);
  const [state, setState] = useState({ tab, turns: 0 });
  // Adjusting state while rendering (React's pattern for "state derived from a prop
  // change"): no effect, no extra paint at the old angle.
  if (state.tab !== tab) setState({ tab, turns: state.turns + 1 });

  const art = BACKDROPS[pathname.split("/")[1] ?? ""] ?? BACKDROPS[""];
  const mask: CSSProperties = {
    maskImage: `url(/background-graphics/${art.file}.svg)`,
    maskRepeat: "no-repeat",
    rotate: `${state.turns * STEP_DEG + (art.rotate ?? 0)}deg`,
  };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden md:left-60">
      {/* Soft accent glow so the glass has some colour to diffuse. */}
      <div className="absolute -right-1/4 -bottom-1/4 size-[70vmax] rounded-full bg-primary-ink/[0.02] blur-3xl dark:bg-primary-ink/[0.025]" />
      <div
        style={mask}
        className="absolute right-0 bottom-0 aspect-square w-[max(150vmin,70rem)] translate-x-[30%] translate-y-[30%] bg-white opacity-[0.05] mask-contain mask-center transition-[rotate] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      />
    </div>
  );
}
