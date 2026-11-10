"use client";

import { useEffect } from "react";
import { playHover, unlockAudio } from "@/lib/sound";

/**
 * Plays a soft tick when the mouse moves onto an important control. Delegated from
 * the document so individual components don't need wiring:
 * buttons, dropdown triggers and checkboxes match by their shadcn `data-slot`;
 * anything else opts in with a `data-sound` attribute (nav links, filter tabs).
 */
const SELECTOR = [
  '[data-slot="button"]',
  '[data-slot="select-trigger"]',
  '[data-slot="dropdown-menu-trigger"]',
  '[data-slot="checkbox"]',
  "[data-sound]",
].join(",");

const DISABLED = ':disabled, [aria-disabled="true"], [data-disabled]';

export function SoundEffects() {
  useEffect(() => {
    let current: Element | null = null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = e.target instanceof Element ? e.target.closest(SELECTOR) : null;
      // pointerover also fires when moving between an element's children: only sound
      // when entering a new control.
      if (el === current) return;
      current = el;
      if (el && !el.matches(DISABLED)) playHover();
    };
    const unlock = () => unlockAudio();

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", unlock, { capture: true });
    document.addEventListener("keydown", unlock, { capture: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", unlock, { capture: true });
      document.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  return null;
}
