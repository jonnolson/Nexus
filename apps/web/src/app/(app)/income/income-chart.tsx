"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One payment, in the charted currency. Amounts in minor units. */
export type ChartPoint = { date: string; net: number; tax: number; total: number };

type Bucket = { key: string; label: string; longLabel: string; net: number; tax: number; total: number; count: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Round up to a clean axis maximum (1, 2, 2.5, 5 × 10^n) split into 4 steps. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

const SEGMENT = "rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground";
const SEGMENT_ON = "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset hover:text-primary-ink";

export function IncomeChart({
  points,
  currency,
  year,
  firstYear,
  lastYear,
}: {
  points: ChartPoint[];
  currency: string;
  /** Selected year (also drives the payment list below, via ?year=). */
  year: number;
  firstYear: number;
  lastYear: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<"month" | "year">("month");
  const [display, setDisplay] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  const money = (minor: number) => formatMoney(minor, currency);
  // Intl's compact notation differs between Node and browsers (hydration mismatch), so
  // compact labels are built by hand around the currency symbol formatMoney uses.
  const symbol = formatMoney(0, currency).replace(/[\d.,\s]/g, "");
  const compact = (minor: number, digits = 1) => {
    const v = minor / 100;
    const [n, unit] = v >= 1e6 ? [v / 1e6, "M"] : v >= 1e3 ? [v / 1e3, "K"] : [v, ""];
    return `${symbol}${unit ? Number(n.toFixed(digits)).toString() : Math.round(n).toLocaleString("en-CA")}${unit}`;
  };
  const axis = (minor: number) => (minor / 100 >= 10_000 ? compact(minor, 0) : `${symbol}${Math.round(minor / 100).toLocaleString("en-CA")}`);

  const buckets = useMemo<Bucket[]>(() => {
    const list: Bucket[] =
      view === "month"
        ? MONTHS.map((m, i) => ({
            key: `${year}-${String(i + 1).padStart(2, "0")}`,
            label: m,
            longLabel: `${MONTHS_LONG[i]} ${year}`,
            net: 0, tax: 0, total: 0, count: 0,
          }))
        : Array.from({ length: lastYear - firstYear + 1 }, (_, i) => {
            const y = String(firstYear + i);
            return { key: y, label: y, longLabel: y, net: 0, tax: 0, total: 0, count: 0 };
          });
    const index = new Map(list.map((b, i) => [b.key, i]));
    for (const p of points) {
      const i = index.get(view === "month" ? p.date.slice(0, 7) : p.date.slice(0, 4));
      if (i === undefined) continue;
      list[i].net += p.net;
      list[i].tax += p.tax;
      list[i].total += p.total;
      list[i].count += 1;
    }
    return list;
  }, [points, view, year, firstYear, lastYear]);

  const span = buckets.reduce(
    (s, b) => ({ net: s.net + b.net, tax: s.tax + b.tax, total: s.total + b.total, count: s.count + b.count }),
    { net: 0, tax: 0, total: 0, count: 0 },
  );
  const { top, ticks } = niceScale(Math.max(...buckets.map((b) => b.net)));
  const spanLabel = view === "month" ? `Income in ${year}` : `Income ${firstYear}–${lastYear}`;

  const goYear = (y: number) => {
    setActive(null);
    router.replace(`/income?year=${y}`, { scroll: false });
  };

  return (
    <section className="glass grid gap-4 rounded-xl p-4 sm:p-5" aria-labelledby="income-chart-title">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Group by">
          {(["month", "year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-sound
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setActive(null);
              }}
              className={cn(SEGMENT, view === v && SEGMENT_ON)}
            >
              {v === "month" ? "By month" : "By year"}
            </button>
          ))}
        </div>
        {view === "month" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous year" disabled={year <= firstYear} onClick={() => goYear(year - 1)}>
              <ChevronLeft />
            </Button>
            <span className="min-w-12 text-center text-sm font-medium tabular-nums">{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next year" disabled={year >= lastYear} onClick={() => goYear(year + 1)}>
              <ChevronRight />
            </Button>
          </div>
        )}
        <div className="ml-auto flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Display">
          {(["chart", "table"] as const).map((d) => (
            <button
              key={d}
              type="button"
              data-sound
              aria-pressed={display === d}
              onClick={() => setDisplay(d)}
              className={cn(SEGMENT, display === d && SEGMENT_ON)}
            >
              {d === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {/* Span total */}
      <div className="grid gap-0.5">
        <h2 id="income-chart-title" className="text-xs text-muted-foreground">
          {spanLabel} <span className="text-muted-foreground/80">(before tax)</span>
        </h2>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{money(span.net)}</p>
        <p className="text-xs text-muted-foreground">
          {span.tax > 0 && <>GST/HST collected {money(span.tax)} · </>}
          {span.count} payment{span.count === 1 ? "" : "s"}
          {span.tax > 0 && <> · {money(span.total)} received incl. tax</>}
        </p>
      </div>

      {display === "chart" ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          {/* Y axis */}
          <div className="relative h-56 w-12 text-right text-[11px] text-muted-foreground tabular-nums" aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(t / top) * 100}%` }}>
                {axis(t)}
              </span>
            ))}
          </div>

          {/* Plot */}
          <div className="relative h-56">
            {ticks.map((t) => (
              <div key={t} aria-hidden className="absolute inset-x-0 border-t border-foreground/10" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <ol className="absolute inset-0 flex" aria-label={`${spanLabel}, ${view === "month" ? "by month" : "by year"}`}>
              {buckets.map((b, i) => {
                const h = (b.net / top) * 100;
                const on = active === i;
                return (
                  <li key={b.key} className="relative flex-1">
                    <button
                      type="button"
                      className="group absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={`${b.longLabel}: ${money(b.net)} before tax, ${b.count} payment${b.count === 1 ? "" : "s"}`}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive((a) => (a === i ? null : a))}
                      onClick={() => {
                        if (view === "year") {
                          setView("month");
                          goYear(Number(b.key));
                        }
                      }}
                    >
                      {b.net > 0 && (
                        <>
                          <span
                            className="absolute left-1/2 w-[min(24px,60%)] -translate-x-1/2 rounded-t-[4px] bg-primary-ink transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none"
                            style={{ height: `${h}%`, bottom: 0, opacity: active === null || on ? 0.9 : 0.45 }}
                          />
                          <span
                            className="absolute left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-muted-foreground tabular-nums sm:text-[11px]"
                            style={{ bottom: `calc(${h}% + 4px)` }}
                          >
                            {compact(b.net)}
                          </span>
                        </>
                      )}
                    </button>
                    {on && (
                      <div
                        role="tooltip"
                        className={cn(
                          "pointer-events-none absolute z-10 w-max rounded-lg border bg-popover px-3 py-2 text-left text-xs shadow-md",
                          "animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none",
                          // Beside the hovered bar (not over it), on whichever side has room.
                          i < buckets.length / 2 ? "left-[calc(50%+16px)]" : "right-[calc(50%+16px)]",
                        )}
                        style={{ top: 0 }}
                      >
                        <p className="text-sm font-semibold tabular-nums">{money(b.net)}</p>
                        <p className="text-muted-foreground">{b.longLabel} · before tax</p>
                        {b.count > 0 && (
                          <p className="mt-1 text-muted-foreground tabular-nums">
                            {b.tax > 0 && <>+ {money(b.tax)} GST/HST · </>}
                            {b.count} payment{b.count === 1 ? "" : "s"}
                          </p>
                        )}
                        {view === "year" && <p className="mt-1 text-muted-foreground">Click to see months</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* X axis */}
          <div aria-hidden />
          <div className="flex pt-1.5 text-[11px] text-muted-foreground" aria-hidden>
            {buckets.map((b) => (
              <span key={b.key} className="flex-1 text-center">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{view === "month" ? "Month" : "Year"}</th>
                <th className="py-2 pr-3 text-right font-medium">Income (before tax)</th>
                <th className="py-2 pr-3 text-right font-medium">GST/HST</th>
                <th className="py-2 pr-3 text-right font-medium">Received</th>
                <th className="py-2 text-right font-medium">Payments</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {buckets.map((b) => (
                <tr key={b.key} className="border-b border-foreground/5 last:border-0">
                  <td className="py-1.5 pr-3">{b.longLabel}</td>
                  <td className="py-1.5 pr-3 text-right font-medium">{money(b.net)}</td>
                  <td className="py-1.5 pr-3 text-right text-muted-foreground">{money(b.tax)}</td>
                  <td className="py-1.5 pr-3 text-right text-muted-foreground">{money(b.total)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{b.count}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-right">{money(span.net)}</td>
                <td className="py-2 pr-3 text-right">{money(span.tax)}</td>
                <td className="py-2 pr-3 text-right">{money(span.total)}</td>
                <td className="py-2 text-right">{span.count}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
