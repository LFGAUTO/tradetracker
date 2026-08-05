import { createClient } from "@/lib/supabase-server";
import type { Bank, Broker, TradeListRow } from "@/lib/types";
import { TradeBoard } from "@/components/trade-board";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const supabase = createClient();

  const [tradesRes, brokersRes, banksRes] = await Promise.all([
    supabase
      .from("trade_list")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase.from("brokers").select("id, name, active").order("name"),
    supabase.from("banks").select("id, name, active").order("name"),
  ]);

  const trades = (tradesRes.data ?? []) as TradeListRow[];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Nothing is ever deleted</p>
        <h1 className="font-display text-[40px] leading-none tracking-[0.04em] text-chalk">
          Archive
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
          Completed trades moved off the board. They stay searchable and exportable here.
          An admin can restore any of them from the trade record.
        </p>
      </div>

      <TradeBoard
        trades={trades}
        brokers={(brokersRes.data ?? []) as Broker[]}
        banks={(banksRes.data ?? []) as Bank[]}
        filenameStem="lfg-trades-archive"
        emptyTitle="The archive is empty"
        emptyBody="Archive a completed trade from its record and it will land here."
      />
    </div>
  );
}
