"use client"

import * as React from "react"
import { cn } from "cn"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export type SelectOption = { value: string; label: React.ReactNode; disabled?: boolean }

/** Radix Select forbids "" as an item value; the app uses "" for "none". */
const EMPTY = "__empty__"
const toRadix = (v: string) => (v === "" ? EMPTY : v)
const fromRadix = (v: string) => (v === EMPTY ? "" : v)

/**
 * The app's select: custom-styled and animated, but with a native-select API.
 * - Works uncontrolled (`defaultValue`) or controlled (`value` + `onValueChange`).
 * - With `name`, submits the real value (including "") through a hidden input,
 *   so Server Action forms work exactly as with a native <select>.
 */
export function FormSelect({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  size = "default",
  disabled,
  required,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  /** Applied to the trigger (e.g. "w-full"). */
  className?: string
  size?: "sm" | "default"
  disabled?: boolean
  required?: boolean
  "aria-label"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
}) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal
  const hasEmptyOption = options.some((o) => o.value === "")
  // No "" option and nothing chosen → show the placeholder.
  const radixValue = current === "" && !hasEmptyOption ? undefined : toRadix(current)
  const selected = radixValue === undefined ? undefined : options.find((o) => o.value === current)

  return (
    <>
      <Select
        value={radixValue}
        onValueChange={(v) => {
          const next = fromRadix(v)
          if (value === undefined) setInternal(next)
          onValueChange?.(next)
        }}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={id}
          size={size}
          className={cn("w-full", className)}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          {/* Explicit label so the trigger is correct in the server-rendered HTML too
              (Radix only learns item labels once the content mounts in the browser). */}
          <SelectValue placeholder={placeholder}>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || EMPTY} value={toRadix(o.value)} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={current} />}
    </>
  )
}
