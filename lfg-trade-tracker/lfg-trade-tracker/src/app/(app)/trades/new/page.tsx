import { createClient } from "@/lib/supabase-server";
import type { Bank, Broker } from "@/lib/types";
import { TradeForm } from "@/components/trade-form";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const supabase = createClient();

  const [brokersRes, banksRes] = await Promise.all([
    supabase.from("brokers").select("id, name, active").eq("active", true).order("name"),
    supabase.from("banks").select("id, name, active").eq("active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow">Add to the board</p>
        <h1 className="font-display text-[40px] leading-none tracking-[0.04em] text-chalk">
          New trade
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          VIN, mileage, client, broker, lease or loan, bank. Nine fields and you are done.
        </p>
      </div>

      <TradeForm
        mode="create"
        brokers={(brokersRes.data ?? []) as Broker[]}
        banks={(banksRes.data ?? []) as Bank[]}
      />
    </div>
  );
}
