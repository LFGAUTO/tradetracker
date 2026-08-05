"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient, getProfile } from "./supabase-server";
import { isValidVin, normalizeVin, vinError } from "./vin";
import {
  DISPOSITION_LABELS,
  STATUS_LABELS,
  type DispositionType,
  type TradeStatus,
} from "./types";

export type ActionResult = { ok: boolean; error?: string; id?: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

const num = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(/[$,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const dateOrNull = (fd: FormData, k: string) => str(fd, k) || null;

async function requireUser() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?error=inactive");
  return profile;
}

// ------------------------------------------------------------- activity
type LogInput = {
  tradeId: string | null;
  action: string;
  field?: string;
  before?: unknown;
  after?: unknown;
};

async function log(userId: string, entries: LogInput[]) {
  if (!entries.length) return;
  const supabase = createClient();
  await supabase.from("activity_logs").insert(
    entries.map((e) => ({
      trade_id: e.tradeId,
      user_id: userId,
      action: e.action,
      field_label: e.field ?? null,
      previous_value:
        e.before === undefined || e.before === null ? null : String(e.before),
      new_value: e.after === undefined || e.after === null ? null : String(e.after),
    }))
  );
}

// =====================================================================
// Auth
// =====================================================================
export async function signIn(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail("That email and password combination did not work.");

  redirect("/");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// =====================================================================
// Trades
// =====================================================================
async function resolveBank(fd: FormData): Promise<{ id?: string; error?: string }> {
  const supabase = createClient();
  const existing = str(fd, "bank_id");
  const typed = str(fd, "bank_name");

  if (existing && existing !== "__new") return { id: existing };
  if (!typed) return { error: "Select a bank or leasing company, or type a new one." };

  const { data: found } = await supabase
    .from("banks")
    .select("id")
    .ilike("name", typed)
    .maybeSingle();
  if (found) return { id: found.id };

  const { data, error } = await supabase
    .from("banks")
    .insert({ name: typed })
    .select("id")
    .single();
  if (error) return { error: "That bank could not be added." };
  return { id: data.id };
}

function validateTradeCore(fd: FormData) {
  const vin = normalizeVin(str(fd, "vin"));
  const vinMsg = vinError(vin);
  if (vinMsg) return vinMsg;

  const mileage = num(fd, "current_mileage");
  if (mileage === null) return "Enter the mileage.";
  if (mileage < 0) return "Mileage cannot be negative.";

  if (!str(fd, "client_name")) return "Enter the client name.";
  if (!str(fd, "broker_id")) return "Select a broker.";

  const finance = str(fd, "finance_type");
  if (finance !== "lease" && finance !== "loan") return "Choose lease or loan.";

  const payoff = num(fd, "current_payoff");
  if (payoff !== null && payoff < 0) return "Payoff cannot be negative.";

  return null;
}

export async function createTrade(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const problem = validateTradeCore(fd);
  if (problem) return fail(problem);

  const bank = await resolveBank(fd);
  if (bank.error) return fail(bank.error);

  const vin = normalizeVin(str(fd, "vin"));
  const supabase = createClient();

  // Duplicate guard. The form re-submits with allow_duplicate=yes to override.
  if (str(fd, "allow_duplicate") !== "yes") {
    const { data: dupe } = await supabase
      .from("trades")
      .select("id, client_name, date_added")
      .eq("vin", vin)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();
    if (dupe) {
      return {
        ok: false,
        error: `DUPLICATE::${dupe.id}::${dupe.client_name}::${dupe.date_added}`,
      };
    }
  }

  const yearRaw = num(fd, "year");

  const { data, error } = await supabase
    .from("trades")
    .insert({
      vin,
      year: yearRaw,
      make: str(fd, "make") || null,
      model: str(fd, "model") || null,
      trim: str(fd, "trim") || null,
      current_mileage: num(fd, "current_mileage"),
      client_name: str(fd, "client_name"),
      broker_id: str(fd, "broker_id"),
      finance_type: str(fd, "finance_type"),
      bank_id: bank.id,
      current_payoff: num(fd, "current_payoff"),
      payoff_good_through: dateOrNull(fd, "payoff_good_through"),
      date_added: str(fd, "date_added") || undefined,
      status: (str(fd, "status") || "new") as TradeStatus,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) return fail(error.message);

  const logs: LogInput[] = [
    { tradeId: data.id, action: "Trade created", field: "VIN", after: vin },
  ];
  if (str(fd, "vin_decoded") === "yes") {
    logs.push({
      tradeId: data.id,
      action: "VIN decoded",
      field: "Vehicle",
      after: [yearRaw, str(fd, "make"), str(fd, "model"), str(fd, "trim")]
        .filter(Boolean)
        .join(" "),
    });
  }
  await log(user.id, logs);

  revalidatePath("/");
  redirect(`/trades/${data.id}`);
}

export async function updateTrade(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const id = str(fd, "trade_id");
  if (!id) return fail("Missing trade.");

  const problem = validateTradeCore(fd);
  if (problem) return fail(problem);

  const bank = await resolveBank(fd);
  if (bank.error) return fail(bank.error);

  const supabase = createClient();
  const { data: before } = await supabase
    .from("trades")
    .select("*, brokers(name), banks(name)")
    .eq("id", id)
    .single();
  if (!before) return fail("That trade no longer exists.");

  const patch = {
    vin: normalizeVin(str(fd, "vin")),
    year: num(fd, "year"),
    make: str(fd, "make") || null,
    model: str(fd, "model") || null,
    trim: str(fd, "trim") || null,
    current_mileage: num(fd, "current_mileage")!,
    client_name: str(fd, "client_name"),
    broker_id: str(fd, "broker_id"),
    finance_type: str(fd, "finance_type") as "lease" | "loan",
    bank_id: bank.id!,
    current_payoff: num(fd, "current_payoff"),
    payoff_good_through: dateOrNull(fd, "payoff_good_through"),
    date_added: str(fd, "date_added") || before.date_added,
    status: str(fd, "status") as TradeStatus,
    updated_by: user.id,
  };

  const { error } = await supabase.from("trades").update(patch).eq("id", id);
  if (error) return fail(error.message);

  const logs: LogInput[] = [];
  if (before.current_mileage !== patch.current_mileage)
    logs.push({
      tradeId: id,
      action: "Mileage changed",
      field: "Mileage",
      before: before.current_mileage,
      after: patch.current_mileage,
    });
  if (before.bank_id !== patch.bank_id) {
    const { data: nb } = await supabase
      .from("banks")
      .select("name")
      .eq("id", patch.bank_id)
      .single();
    logs.push({
      tradeId: id,
      action: "Bank changed",
      field: "Bank",
      before: (before as any).banks?.name,
      after: nb?.name,
    });
  }
  if (before.status !== patch.status)
    logs.push({
      tradeId: id,
      action: "Status changed",
      field: "Status",
      before: STATUS_LABELS[before.status as TradeStatus],
      after: STATUS_LABELS[patch.status],
    });
  if (before.vin !== patch.vin)
    logs.push({ tradeId: id, action: "VIN changed", field: "VIN", before: before.vin, after: patch.vin });
  if (!logs.length) logs.push({ tradeId: id, action: "Trade edited" });

  await log(user.id, logs);
  revalidatePath(`/trades/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function setStatus(tradeId: string, status: TradeStatus) {
  const user = await requireUser();
  const supabase = createClient();

  const { data: before } = await supabase
    .from("trades")
    .select("status")
    .eq("id", tradeId)
    .single();

  await supabase.from("trades").update({ status, updated_by: user.id }).eq("id", tradeId);
  await log(user.id, [
    {
      tradeId,
      action: "Status changed",
      field: "Status",
      before: before ? STATUS_LABELS[before.status as TradeStatus] : null,
      after: STATUS_LABELS[status],
    },
  ]);

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
}

export async function archiveTrade(tradeId: string) {
  const user = await requireUser();
  if (user.role !== "admin") return;
  const supabase = createClient();
  await supabase
    .from("trades")
    .update({ archived_at: new Date().toISOString(), status: "archived", updated_by: user.id })
    .eq("id", tradeId);
  await log(user.id, [{ tradeId, action: "Trade archived" }]);
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/trades/${tradeId}`);
}

export async function restoreTrade(tradeId: string) {
  const user = await requireUser();
  if (user.role !== "admin") return;
  const supabase = createClient();
  await supabase
    .from("trades")
    .update({ archived_at: null, status: "completed", updated_by: user.id })
    .eq("id", tradeId);
  await log(user.id, [{ tradeId, action: "Trade restored" }]);
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/trades/${tradeId}`);
}

export async function deleteTrade(tradeId: string) {
  const user = await requireUser();
  if (user.role !== "admin") return;
  const supabase = createClient();
  await supabase.from("trades").delete().eq("id", tradeId);
  revalidatePath("/");
  revalidatePath("/archive");
  redirect("/");
}

// =====================================================================
// MMR
// =====================================================================
export async function saveMmr(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const tradeId = str(fd, "trade_id");
  const entryId = str(fd, "entry_id");

  const value = num(fd, "mmr_value");
  if (value === null) return fail("Enter the MMR value.");
  if (value < 0) return fail("MMR cannot be negative.");
  const mileage = num(fd, "mileage");
  if (mileage !== null && mileage < 0) return fail("Mileage cannot be negative.");
  const checked = str(fd, "checked_date");
  if (!checked) return fail("Enter the date checked.");

  const supabase = createClient();
  const row = {
    trade_id: tradeId,
    mmr_value: value,
    checked_date: checked,
    mileage,
    notes: str(fd, "notes") || null,
    entered_by: user.id,
  };

  if (entryId) {
    const { data: before } = await supabase
      .from("mmr_entries")
      .select("mmr_value")
      .eq("id", entryId)
      .single();
    const { error } = await supabase.from("mmr_entries").update(row).eq("id", entryId);
    if (error) return fail(error.message);
    await log(user.id, [
      {
        tradeId,
        action: "MMR edited",
        field: "MMR",
        before: before?.mmr_value,
        after: value,
      },
    ]);
  } else {
    const { error } = await supabase.from("mmr_entries").insert(row);
    if (error) return fail(error.message);
    await log(user.id, [
      { tradeId, action: "MMR added", field: "MMR", after: value },
    ]);
  }

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMmr(entryId: string, tradeId: string) {
  const user = await requireUser();
  const supabase = createClient();
  const { data: before } = await supabase
    .from("mmr_entries")
    .select("mmr_value")
    .eq("id", entryId)
    .single();
  await supabase.from("mmr_entries").delete().eq("id", entryId);
  await log(user.id, [
    { tradeId, action: "MMR deleted", field: "MMR", before: before?.mmr_value },
  ]);
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
}

// =====================================================================
// Appraisals
// =====================================================================
export async function saveAppraisal(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const tradeId = str(fd, "trade_id");
  const entryId = str(fd, "entry_id");

  const value = num(fd, "appraised_value");
  if (value === null) return fail("Enter the appraised value.");
  if (value < 0) return fail("An appraised value cannot be negative.");
  const mileage = num(fd, "mileage");
  if (mileage !== null && mileage < 0) return fail("Mileage cannot be negative.");
  const date = str(fd, "appraisal_date");
  if (!date) return fail("Enter the appraisal date.");

  const supabase = createClient();
  const row = {
    trade_id: tradeId,
    appraised_value: value,
    appraisal_date: date,
    mileage,
    notes: str(fd, "notes") || null,
    appraised_by: user.id,
  };

  if (entryId) {
    const { data: before } = await supabase
      .from("appraisal_entries")
      .select("appraised_value")
      .eq("id", entryId)
      .single();
    const { error } = await supabase.from("appraisal_entries").update(row).eq("id", entryId);
    if (error) return fail(error.message);
    await log(user.id, [
      {
        tradeId,
        action: "Appraisal edited",
        field: "Appraised value",
        before: before?.appraised_value,
        after: value,
      },
    ]);
  } else {
    const { error } = await supabase.from("appraisal_entries").insert(row);
    if (error) return fail(error.message);
    await log(user.id, [
      { tradeId, action: "Appraisal added", field: "Appraised value", after: value },
    ]);
  }

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAppraisal(entryId: string, tradeId: string) {
  const user = await requireUser();
  const supabase = createClient();
  const { data: before } = await supabase
    .from("appraisal_entries")
    .select("appraised_value")
    .eq("id", entryId)
    .single();
  await supabase.from("appraisal_entries").delete().eq("id", entryId);
  await log(user.id, [
    {
      tradeId,
      action: "Appraisal deleted",
      field: "Appraised value",
      before: before?.appraised_value,
    },
  ]);
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
}

// =====================================================================
// Disposition
// =====================================================================
export async function saveDisposition(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const tradeId = str(fd, "trade_id");
  const type = str(fd, "disposition_type") as DispositionType;
  if (!type) return fail("Choose a disposition.");

  const price = num(fd, "sale_price");
  if (price !== null && price < 0) return fail("A sale price cannot be negative.");

  const supabase = createClient();
  const { data: beforeTrade } = await supabase
    .from("trades")
    .select("disposition")
    .eq("id", tradeId)
    .single();

  if (type === "pending") {
    await supabase.from("dispositions").delete().eq("trade_id", tradeId);
  } else {
    const row = {
      trade_id: tradeId,
      disposition_type: type,
      destination_name: str(fd, "destination_name") || null,
      dealer_location: str(fd, "dealer_location") || null,
      disposition_date: dateOrNull(fd, "disposition_date"),
      sale_price: price,
      confirmation_number: str(fd, "confirmation_number") || null,
      contact_information: str(fd, "contact_information") || null,
      notes: str(fd, "notes") || null,
    };
    const { error } = await supabase
      .from("dispositions")
      .upsert(row, { onConflict: "trade_id" });
    if (error) return fail(error.message);
  }

  const patch: Record<string, unknown> = { disposition: type, updated_by: user.id };
  if (type !== "pending" && str(fd, "complete_trade") === "yes") patch.status = "completed";

  await supabase.from("trades").update(patch).eq("id", tradeId);

  await log(user.id, [
    {
      tradeId,
      action: "Disposition changed",
      field: "Disposition",
      before: beforeTrade
        ? DISPOSITION_LABELS[beforeTrade.disposition as DispositionType]
        : null,
      after: DISPOSITION_LABELS[type],
    },
  ]);

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/");
  return { ok: true };
}

// =====================================================================
// Notes
// =====================================================================
export async function addNote(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const tradeId = str(fd, "trade_id");
  const note = str(fd, "note");
  if (!note) return fail("Write a note before saving.");

  const supabase = createClient();
  const { error } = await supabase
    .from("trade_notes")
    .insert({ trade_id: tradeId, note, created_by: user.id });
  if (error) return fail(error.message);

  await log(user.id, [{ tradeId, action: "Note added" }]);
  revalidatePath(`/trades/${tradeId}`);
  return { ok: true };
}

// =====================================================================
// Admin
// =====================================================================
async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function addBroker(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return fail("Enter a broker name.");
  const supabase = createClient();
  const { error } = await supabase.from("brokers").insert({ name });
  if (error) return fail("That broker already exists.");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleBroker(id: string, active: boolean) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from("brokers").update({ active }).eq("id", id);
  revalidatePath("/admin");
}

export async function addBank(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return fail("Enter a bank name.");
  const supabase = createClient();
  const { error } = await supabase.from("banks").insert({ name });
  if (error) return fail("That bank already exists.");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleBank(id: string, active: boolean) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from("banks").update({ active }).eq("id", id);
  revalidatePath("/admin");
}

export async function saveSetting(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const key = str(fd, "setting_key");
  const value = str(fd, "setting_value");
  const supabase = createClient();
  const { error } = await supabase
    .from("application_settings")
    .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" });
  if (error) return fail(error.message);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createUser(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const name = str(fd, "name");
  const role = str(fd, "role") === "admin" ? "admin" : "standard";

  if (!email || !password) return fail("Enter an email and a starting password.");
  if (password.length < 8) return fail("Use at least 8 characters for the password.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (error) return fail(error.message);

  // The signup trigger defaults new accounts to standard. Apply the choice.
  await admin.from("users").update({ role, name }).eq("id", data.user.id);

  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserRole(userId: string, role: "admin" | "standard") {
  const me = await requireAdmin();
  if (me.id === userId) return; // no self-demotion
  const supabase = createClient();
  await supabase.from("users").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserActive(userId: string, active: boolean) {
  const me = await requireAdmin();
  if (me.id === userId) return;
  const supabase = createClient();
  await supabase.from("users").update({ active }).eq("id", userId);
  revalidatePath("/admin");
}
