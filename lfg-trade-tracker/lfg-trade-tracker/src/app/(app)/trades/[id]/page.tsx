import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase-server";
import type {
  ActivityLog,
  AppraisalEntry,
  DispositionRecord,
  MmrEntry,
  TradeListRow,
  TradeNote,
} from "@/lib/types";
import { TradeDetail } from "@/components/trade-detail";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();

  const { data: trade } = await supabase
    .from("trade_list")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!trade) notFound();

  const [mmrRes, appRes, dispoRes, notesRes, actRes, settingRes] = await Promise.all([
    supabase
      .from("mmr_entries")
      .select("*, users!mmr_entries_entered_by_fkey (name)")
      .eq("trade_id", params.id)
      .order("checked_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("appraisal_entries")
      .select("*, users!appraisal_entries_appraised_by_fkey (name)")
      .eq("trade_id", params.id)
      .order("appraisal_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("dispositions").select("*").eq("trade_id", params.id).maybeSingle(),
    supabase
      .from("trade_notes")
      .select("*, users!trade_notes_created_by_fkey (name)")
      .eq("trade_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*, users!activity_logs_user_id_fkey (name)")
      .eq("trade_id", params.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("application_settings")
      .select("setting_value")
      .eq("setting_key", "mmr_website_url")
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/" className="no-print eyebrow inline-block hover:text-gold">
        ← Back to the board
      </Link>

      <TradeDetail
        trade={trade as TradeListRow}
        mmr={(mmrRes.data ?? []) as MmrEntry[]}
        appraisals={(appRes.data ?? []) as AppraisalEntry[]}
        disposition={(dispoRes.data ?? null) as DispositionRecord | null}
        notes={(notesRes.data ?? []) as TradeNote[]}
        activity={(actRes.data ?? []) as ActivityLog[]}
        profile={profile}
        mmrUrl={settingRes.data?.setting_value || "https://www.manheim.com"}
      />
    </div>
  );
}
