import { redirect } from "next/navigation";
import { createClient, getProfile } from "@/lib/supabase-server";
import type { Bank, Broker, Profile } from "@/lib/types";
import {
  BankPanel,
  BrokerPanel,
  MmrUrlPanel,
  UserPanel,
} from "@/components/admin-panels";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const supabase = createClient();
  const [brokersRes, banksRes, usersRes, settingRes] = await Promise.all([
    supabase.from("brokers").select("id, name, active").order("name"),
    supabase.from("banks").select("id, name, active").order("name"),
    supabase.from("users").select("id, name, email, role, active").order("email"),
    supabase
      .from("application_settings")
      .select("setting_value")
      .eq("setting_key", "mmr_website_url")
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Admin only</p>
        <h1 className="font-display text-[40px] leading-none tracking-[0.04em] text-chalk">
          Settings
        </h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BrokerPanel brokers={(brokersRes.data ?? []) as Broker[]} />
        <BankPanel banks={(banksRes.data ?? []) as Bank[]} />
        <MmrUrlPanel url={settingRes.data?.setting_value ?? "https://www.manheim.com"} />
        <UserPanel users={(usersRes.data ?? []) as Profile[]} me={profile as Profile} />
      </div>
    </div>
  );
}
