"use client";

import { useRouter } from "next/navigation";
import { FormSelect } from "@/components/ui/form-select";
import { CATEGORY_OPTIONS } from "@/lib/expenses/categories";

/** Year + category pickers; each change navigates so the server re-renders the list. */
export function ExpenseFilters({
  years,
  year,
  category,
  q,
}: {
  years: number[];
  year: number;
  category: string;
  q: string;
}) {
  const router = useRouter();
  const go = (next: { year?: number; category?: string }) => {
    const sp = new URLSearchParams();
    sp.set("year", String(next.year ?? year));
    const c = next.category ?? category;
    if (c) sp.set("category", c);
    if (q) sp.set("q", q);
    router.push(`/expenses?${sp.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <FormSelect
        aria-label="Year"
        value={String(year)}
        onValueChange={(v) => go({ year: Number(v) })}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
        className="w-24"
      />
      <FormSelect
        aria-label="Category"
        value={category}
        onValueChange={(v) => go({ category: v })}
        options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS]}
        className="w-56"
      />
    </div>
  );
}
