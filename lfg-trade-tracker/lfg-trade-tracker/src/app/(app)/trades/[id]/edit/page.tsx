import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Bank, Broker, TradeListRow } from "@/lib/types";
import { vehicleName } from "@/lib/format";
import { TradeForm } from "@/components/trade-form";

export const dynamic = "force-dynamic";

export default async function EditTradePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [tradeRes, brokersRes, banksRes] = await Promise.all([
    supabase.from("trade_list").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("brokers").select("id, name, active").eq("active", true).order("name"),
    supabase.from("banks").select("id, name, active").eq("active", true).order("name"),
  ]);

  if (!tradeRes.data) notFound();
  const trade = tradeRes.data as TradeListRow;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/trades/${trade.id}`} className="eyebrow inline-block hover:text-gold">
        ← Back to the trade
      </Link>
      <div>
        <p className="eyebrow">Editing</p>
        <h1 className="font-display text-[38px] leading-none tracking-[0.04em] text-chalk">
          {vehicleName(trade)}
        </h1>
      </div>

      <TradeForm
        mode="edit"
        trade={trade}
        brokers={(brokersRes.data ?? []) as Broker[]}
        banks={(banksRes.data ?? []) as Bank[]}
      />
    </div>
  );
}
