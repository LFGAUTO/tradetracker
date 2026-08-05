import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { currentMonthKey, monthLabel, monthRange, shiftMonth } from "@/lib/format";
import type { Bank, Broker, TradeListRow } from "@/lib/types";
import { TradeBoard } from "@/components/trade-board";

export const dynamic = "force-dynamic";

type Search = {
  month?: string;
  from?: string;
  to?: string;
};

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="eyebrow">{label}</p>
      <p
        className={`tnum mt-1 font-display text-[32px] leading-none tracking-wide ${
          accent ? "text-gold" : "text-chalk"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const supabase = createClient();

  const usingRange = Boolean(searchParams.from && searchParams.to);
  const month = searchParams.month || currentMonthKey();
  const { start, end } = monthRange(month);
  const from = usingRange ? searchParams.from! : start;
  const to = usingRange ? searchParams.to! : end;

  const [tradesRes, brokersRes, banksRes] = await Promise.all([
    supabase
      .from("trade_list")
      .select("*")
      .is("archived_at", null)
      .gte("date_added", from)
      .lte("date_added", to)
      .order("date_added", { ascending: false }),
    supabase.from("brokers").select("id, name, active").order("name"),
    supabase.from("banks").select("id, name, active").order("name"),
  ]);

  const trades = (tradesRes.data ?? []) as TradeListRow[];
  const brokers = (brokersRes.data ?? []) as Broker[];
  const banks = (banksRes.data ?? []) as Bank[];

  const count = (fn: (t: TradeListRow) => boolean) => trades.filter(fn).length;

  const heading = usingRange
    ? `${from} to ${to}`
    : monthLabel(month);

  return (
    <div className="space-y-6">
      {/* month rail */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Trade board</p>
          <h1 className="font-display text-[40px] leading-none tracking-[0.04em] text-chalk">
            {heading}
          </h1>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Link href={`/?month=${shiftMonth(month, -1)}`} className="btn btn-ghost btn-sm">
            ← {monthLabel(shiftMonth(month, -1)).split(" ")[0]}
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm">
            This month
          </Link>
          <Link href={`/?month=${shiftMonth(month, 1)}`} className="btn btn-ghost btn-sm">
            {monthLabel(shiftMonth(month, 1)).split(" ")[0]} →
          </Link>
          <Link href="/trades/new" className="btn btn-gold btn-sm">
            New trade
          </Link>
        </div>
      </div>

      {/* custom range */}
      <form className="no-print flex flex-wrap items-end gap-3" action="/">
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={usingRange ? from : ""}
            className="field w-auto py-1.5 text-[13px]"
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={usingRange ? to : ""}
            className="field w-auto py-1.5 text-[13px]"
          />
        </div>
        <button className="btn btn-ghost btn-sm">Apply range</button>
        {usingRange ? (
          <Link href="/" className="btn btn-quiet btn-sm">
            Back to month
          </Link>
        ) : null}
      </form>

      {/* summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Trades this period" value={trades.length} accent />
        <SummaryCard label="Pending" value={count((t) => t.disposition === "pending")} />
        <SummaryCard
          label="Waiting for MMR"
          value={count((t) => t.status === "waiting_mmr" || t.latest_mmr === null)}
        />
        <SummaryCard
          label="Waiting for appraisal"
          value={count((t) => t.status === "waiting_appraisal" || t.latest_appraisal === null)}
        />
        <SummaryCard
          label="Dealer returns"
          value={count((t) => t.disposition === "dealer_return")}
        />
        <SummaryCard label="Sold" value={count((t) => t.disposition === "sold")} />
      </div>

      <TradeBoard
        trades={trades}
        brokers={brokers}
        banks={banks}
        filenameStem={`lfg-trades-${usingRange ? `${from}_${to}` : month}`}
        emptyTitle="No trades in this period"
        emptyBody="Add the first one, or use the arrows above to look at another month."
      />
    </div>
  );
}
