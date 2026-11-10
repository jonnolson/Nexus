"use client";

import { useSyncExternalStore } from "react";
import { formatElapsed } from "@/lib/time/format";

// One shared 1-second clock for every <Elapsed> on the page.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Live "1:05:09" since `startedAt`, ticking every second. */
export function Elapsed({ startedAt, className }: { startedAt: string; className?: string }) {
  // Server render has no clock (null) → placeholder; the client takes over on hydration.
  const current = useSyncExternalStore(subscribe, () => now, () => null);
  return (
    <span className={className}>
      {current === null ? "–:––:––" : formatElapsed((current - Date.parse(startedAt)) / 1000)}
    </span>
  );
}
