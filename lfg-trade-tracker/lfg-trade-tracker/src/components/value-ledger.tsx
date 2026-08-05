import { delta, money, shortDate } from "@/lib/format";

function Change({ latest, previous }: { latest: number | null; previous: number | null }) {
  const d = delta(latest, previous);
  if (previous === null)
    return <span className="text-[12px] text-dim">No earlier entry to compare</span>;
  if (!d) return null;

  const tone = d.diff > 0 ? "text-good" : d.diff < 0 ? "text-bad" : "text-muted";
  const sign = d.diff > 0 ? "+" : d.diff < 0 ? "\u2212" : "";

  return (
    <span className="tnum text-[12.5px] text-muted">
      Previous {money(previous)}
      <span className={`ml-2 font-semibold ${tone}`}>
        {sign}
        {money(Math.abs(d.diff)).replace("-", "")} / {sign}
        {Math.abs(d.pct).toFixed(2)}%
      </span>
    </span>
  );
}

function Column({
  eyebrow,
  value,
  asOf,
  previous,
  accent,
  emptyPrompt,
}: {
  eyebrow: string;
  value: number | null;
  asOf: string | null;
  previous: number | null;
  accent: "gold" | "chalk";
  emptyPrompt: string;
}) {
  return (
    <div className="flex-1 px-5 py-4">
      <p className="eyebrow">{eyebrow}</p>
      {value === null ? (
        <p className="mt-2 text-[14px] text-dim">{emptyPrompt}</p>
      ) : (
        <>
          <p
            className={`tnum mt-1 font-display text-[38px] leading-none tracking-wide ${
              accent === "gold" ? "text-gold" : "text-chalk"
            }`}
          >
            {money(value)}
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <Change latest={value} previous={previous} />
          </p>
          <p className="mt-0.5 text-[11.5px] text-dim">Checked {shortDate(asOf)}</p>
        </>
      )}
    </div>
  );
}

/**
 * The one bold element on the record. Two tracks drawn to the same scale so
 * the gap between book value and what we appraised is visible before it is
 * read. Deliberately labelled as a comparison, never as profit.
 */
export function ValueLedger({
  latestMmr,
  previousMmr,
  mmrDate,
  latestAppraisal,
  previousAppraisal,
  appraisalDate,
}: {
  latestMmr: number | null;
  previousMmr: number | null;
  mmrDate: string | null;
  latestAppraisal: number | null;
  previousAppraisal: number | null;
  appraisalDate: string | null;
}) {
  const both = latestMmr !== null && latestAppraisal !== null;
  const scale = both ? Math.max(latestMmr!, latestAppraisal!) : 0;
  const mmrPct = both ? (latestMmr! / scale) * 100 : 0;
  const appPct = both ? (latestAppraisal! / scale) * 100 : 0;
  const diff = both ? latestAppraisal! - latestMmr! : 0;

  return (
    <section className="panel panel-ruled print-block">
      <div className="flex flex-col divide-y divide-line sm:flex-row sm:divide-x sm:divide-y-0">
        <Column
          eyebrow="Latest MMR"
          value={latestMmr}
          asOf={mmrDate}
          previous={previousMmr}
          accent="chalk"
          emptyPrompt="No MMR recorded yet. Add the first check."
        />
        <Column
          eyebrow="Latest appraised value"
          value={latestAppraisal}
          asOf={appraisalDate}
          previous={previousAppraisal}
          accent="gold"
          emptyPrompt="Not appraised yet. Add the first appraisal."
        />
      </div>

      {both ? (
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">MMR against appraisal</p>
            <p
              className={`tnum font-head text-[13px] font-bold tracking-wide ${
                diff > 0 ? "text-good" : diff < 0 ? "text-bad" : "text-muted"
              }`}
            >
              {diff > 0 ? "+" : diff < 0 ? "\u2212" : ""}
              {money(Math.abs(diff)).replace("-", "")}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-head text-[10px] uppercase tracking-[0.14em] text-muted">
                MMR
              </span>
              <div className="h-2.5 flex-1 bg-[#0E0E0E]">
                <div
                  className="h-full bg-[#8E8E8E]"
                  style={{ width: `${Math.max(mmrPct, 1)}%` }}
                />
              </div>
              <span className="tnum w-24 shrink-0 text-right text-[12.5px] text-chalk">
                {money(latestMmr)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-head text-[10px] uppercase tracking-[0.14em] text-muted">
                Appraised
              </span>
              <div className="h-2.5 flex-1 bg-[#0E0E0E]">
                <div
                  className="h-full bg-gold"
                  style={{ width: `${Math.max(appPct, 1)}%` }}
                />
              </div>
              <span className="tnum w-24 shrink-0 text-right text-[12.5px] text-gold">
                {money(latestAppraisal)}
              </span>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-dim">
            {diff === 0
              ? "The appraisal matches MMR."
              : `The appraisal is ${money(Math.abs(diff)).replace("-", "")} ${
                  diff < 0 ? "under" : "over"
                } MMR. This is a comparison only, not profit.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
