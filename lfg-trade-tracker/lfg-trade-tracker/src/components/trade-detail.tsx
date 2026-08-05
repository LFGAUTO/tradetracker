"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import {
  addNote,
  archiveTrade,
  deleteAppraisal,
  deleteMmr,
  deleteTrade,
  restoreTrade,
  saveAppraisal,
  saveDisposition,
  saveMmr,
  type ActionResult,
} from "@/lib/actions";
import {
  DISPOSITION_LABELS,
  DISPOSITION_ORDER,
  type ActivityLog,
  type AppraisalEntry,
  type DispositionRecord,
  type DispositionType,
  type MmrEntry,
  type Profile,
  type TradeListRow,
  type TradeNote,
} from "@/lib/types";
import {
  downloadCsv,
  longDate,
  miles,
  money,
  moneyExact,
  shortDate,
  stamp,
  toCsv,
  todayISO,
  vehicleName,
} from "@/lib/format";
import {
  ConfirmButton,
  CopyButton,
  DispositionBadge,
  ErrorNote,
  Field,
  SlideOver,
  StatusBadge,
  SubmitButton,
} from "@/components/ui";
import { ValueLedger } from "@/components/value-ledger";

type Tab = "overview" | "mmr" | "appraisals" | "disposition" | "notes" | "activity";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "mmr", label: "MMR history" },
  { key: "appraisals", label: "Appraisal history" },
  { key: "disposition", label: "Disposition" },
  { key: "notes", label: "Notes" },
  { key: "activity", label: "Activity" },
];

/** Which extra fields each disposition needs. */
const DISPO_FIELDS: Record<
  Exclude<DispositionType, "pending">,
  {
    destination?: string;
    location?: boolean;
    date: string;
    price?: string;
    confirmation?: string;
    contact?: string;
  }
> = {
  dealer_return: {
    destination: "Returned to dealer",
    location: true,
    date: "Return date",
    confirmation: "Grounding confirmation number",
  },
  sold: {
    destination: "Sold to",
    date: "Sale date",
    price: "Sale price",
    contact: "Buyer contact or dealer",
  },
  customer_keeping: { date: "Decision date" },
  lease_buyout: {
    destination: "Buyout bank",
    date: "Buyout date",
    price: "Buyout amount",
  },
  no_trade: { date: "Completion date" },
  other: { date: "Completion date" },
};

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l border-line pl-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-[14px] text-chalk">{value}</p>
    </div>
  );
}

function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl tracking-wide text-chalk">{title}</h2>
      {action}
    </div>
  );
}

export function TradeDetail({
  trade,
  mmr,
  appraisals,
  disposition,
  notes,
  activity,
  profile,
  mmrUrl,
}: {
  trade: TradeListRow;
  mmr: MmrEntry[];
  appraisals: AppraisalEntry[];
  disposition: DispositionRecord | null;
  notes: TradeNote[];
  activity: ActivityLog[];
  profile: Profile;
  mmrUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mmrOpen, setMmrOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [editMmr, setEditMmr] = useState<MmrEntry | null>(null);
  const [editApp, setEditApp] = useState<AppraisalEntry | null>(null);

  const [mmrState, mmrAction] = useFormState<ActionResult | null, FormData>(saveMmr, null);
  const [appState, appAction] = useFormState<ActionResult | null, FormData>(
    saveAppraisal,
    null
  );
  const [dispoState, dispoAction] = useFormState<ActionResult | null, FormData>(
    saveDisposition,
    null
  );
  const [noteState, noteAction] = useFormState<ActionResult | null, FormData>(addNote, null);

  const [dispoType, setDispoType] = useState<DispositionType>(trade.disposition);
  const isAdmin = profile.role === "admin";
  const archived = Boolean(trade.archived_at);
  const name = vehicleName(trade);
  const ymmm = `${[trade.year, trade.make, trade.model].filter(Boolean).join(" ")} — ${miles(
    trade.current_mileage
  )}`;

  const openMmrForm = (entry: MmrEntry | null) => {
    setEditMmr(entry);
    setMmrOpen(true);
  };
  const openAppForm = (entry: AppraisalEntry | null) => {
    setEditApp(entry);
    setAppOpen(true);
  };

  /** Single trade export: the record plus both full histories. */
  const exportTrade = () => {
    const lines: unknown[][] = [
      ["Trade", ""],
      ["VIN", trade.vin],
      ["Vehicle", name],
      ["Mileage", trade.current_mileage],
      ["Client", trade.client_name],
      ["Broker", trade.broker_name ?? ""],
      ["Lease or loan", trade.finance_type === "lease" ? "Lease" : "Loan"],
      ["Bank", trade.bank_name ?? ""],
      ["Payoff", trade.current_payoff ?? ""],
      ["Payoff good through", trade.payoff_good_through ?? ""],
      ["Status", trade.status],
      ["Disposition", DISPOSITION_LABELS[trade.disposition]],
      ["Destination", trade.destination_name ?? ""],
      ["Date added", trade.date_added],
      ["Latest MMR", trade.latest_mmr ?? ""],
      ["Latest appraised value", trade.latest_appraisal ?? ""],
      ["MMR vs appraisal", trade.spread ?? ""],
      [],
      ["MMR history", ""],
      ["Value", "Date checked", "Mileage", "Entered by", "Notes"],
      ...mmr.map((m) => [
        m.mmr_value,
        m.checked_date,
        m.mileage ?? "",
        m.users?.name ?? "",
        m.notes ?? "",
      ]),
      [],
      ["Appraisal history", ""],
      ["Value", "Appraisal date", "Mileage", "Appraised by", "Notes"],
      ...appraisals.map((a) => [
        a.appraised_value,
        a.appraisal_date,
        a.mileage ?? "",
        a.users?.name ?? "",
        a.notes ?? "",
      ]),
    ];
    downloadCsv(`lfg-trade-${trade.vin}.csv`, toCsv(["Field", "Value"], lines));
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------- header */}
      <div className="panel panel-ruled p-5 print-block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={trade.status} />
              <DispositionBadge disposition={trade.disposition} />
              {archived ? (
                <span className="chip border-line2 bg-[#0E0E0E] text-dim">Archived</span>
              ) : null}
            </div>
            <h1 className="mt-2 font-display text-[38px] leading-none tracking-[0.03em] text-chalk">
              {name}
            </h1>
            <p className="tnum mt-1.5 text-[13.5px] tracking-[0.1em] text-muted">
              {trade.vin}
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button className="btn btn-gold btn-sm" onClick={() => openMmrForm(null)}>
              Add MMR
            </button>
            <button className="btn btn-gold btn-sm" onClick={() => openAppForm(null)}>
              Add appraisal
            </button>
            <Link href={`/trades/${trade.id}/edit`} className="btn btn-ghost btn-sm">
              Edit trade
            </Link>
            <CopyButton value={trade.vin}>Copy VIN</CopyButton>
            <CopyButton value={ymmm}>Copy vehicle</CopyButton>
            <a
              href={mmrUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost btn-sm"
            >
              Open MMR site
            </a>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTab("disposition");
                document.getElementById("tab-panel")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Complete disposition
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Spec label="Mileage" value={miles(trade.current_mileage)} />
          <Spec label="Client" value={trade.client_name} />
          <Spec label="Broker" value={trade.broker_name ?? "—"} />
          <Spec
            label="Lease or loan"
            value={trade.finance_type === "lease" ? "Lease" : "Loan"}
          />
          <Spec label="Bank" value={trade.bank_name ?? "—"} />
          <Spec label="Added" value={longDate(trade.date_added)} />
        </div>

        {trade.current_payoff !== null ? (
          <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
            Payoff <span className="tnum text-chalk">{moneyExact(trade.current_payoff)}</span>
            {trade.payoff_good_through
              ? ` · good through ${longDate(trade.payoff_good_through)}`
              : ""}
          </p>
        ) : null}
      </div>

      {/* -------------------------------------------- value ledger */}
      <ValueLedger
        latestMmr={trade.latest_mmr}
        previousMmr={trade.previous_mmr}
        mmrDate={trade.latest_mmr_date}
        latestAppraisal={trade.latest_appraisal}
        previousAppraisal={trade.previous_appraisal}
        appraisalDate={trade.latest_appraisal_date}
      />

      {/* --------------------------------------------------- tabs */}
      <div className="no-print flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2.5 font-head text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              tab === t.key
                ? "border-gold text-gold"
                : "border-transparent text-muted hover:text-chalk"
            }`}
          >
            {t.label}
            {t.key === "mmr" && mmr.length ? (
              <span className="ml-1.5 text-dim">{mmr.length}</span>
            ) : null}
            {t.key === "appraisals" && appraisals.length ? (
              <span className="ml-1.5 text-dim">{appraisals.length}</span>
            ) : null}
            {t.key === "notes" && notes.length ? (
              <span className="ml-1.5 text-dim">{notes.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div id="tab-panel">
        {/* ---------------------------------------------- overview */}
        {tab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="panel p-5">
              <SectionHead title="Recent MMR" />
              {mmr.length === 0 ? (
                <p className="text-[13.5px] text-muted">
                  Nothing checked yet.{" "}
                  <button className="link-gold" onClick={() => openMmrForm(null)}>
                    Add the first MMR
                  </button>
                  .
                </p>
              ) : (
                <ul className="space-y-2">
                  {mmr.slice(0, 4).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-baseline justify-between border-b border-line/60 pb-2 text-[13.5px]"
                    >
                      <span className="tnum font-medium text-chalk">{money(m.mmr_value)}</span>
                      <span className="text-muted">
                        {shortDate(m.checked_date)} · {m.users?.name ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel p-5">
              <SectionHead title="Recent appraisals" />
              {appraisals.length === 0 ? (
                <p className="text-[13.5px] text-muted">
                  Not appraised yet.{" "}
                  <button className="link-gold" onClick={() => openAppForm(null)}>
                    Add the first appraisal
                  </button>
                  .
                </p>
              ) : (
                <ul className="space-y-2">
                  {appraisals.slice(0, 4).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-baseline justify-between border-b border-line/60 pb-2 text-[13.5px]"
                    >
                      <span className="tnum font-medium text-gold">
                        {money(a.appraised_value)}
                      </span>
                      <span className="text-muted">
                        {shortDate(a.appraisal_date)} · {a.users?.name ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel p-5 lg:col-span-2">
              <SectionHead
                title="Record"
                action={
                  <div className="no-print flex flex-wrap gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={exportTrade}>
                      Export this trade
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                      Print summary
                    </button>
                    {isAdmin ? (
                      archived ? (
                        <ConfirmButton
                          className="btn btn-ghost btn-sm"
                          prompt="Restore it?"
                          onConfirm={() => restoreTrade(trade.id)}
                        >
                          Restore
                        </ConfirmButton>
                      ) : (
                        <ConfirmButton
                          className="btn btn-ghost btn-sm"
                          prompt="Archive it?"
                          onConfirm={() => archiveTrade(trade.id)}
                        >
                          Archive
                        </ConfirmButton>
                      )
                    ) : null}
                    {isAdmin ? (
                      <ConfirmButton
                        prompt="Delete permanently?"
                        onConfirm={() => deleteTrade(trade.id)}
                      >
                        Delete
                      </ConfirmButton>
                    ) : null}
                  </div>
                }
              />
              <div className="grid gap-4 text-[13.5px] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="eyebrow">Created by</p>
                  <p className="mt-1 text-chalk">{trade.created_by_name ?? "—"}</p>
                </div>
                <div>
                  <p className="eyebrow">Created</p>
                  <p className="mt-1 text-chalk">{stamp(trade.created_at)}</p>
                </div>
                <div>
                  <p className="eyebrow">Last updated by</p>
                  <p className="mt-1 text-chalk">{trade.updated_by_name ?? "—"}</p>
                </div>
                <div>
                  <p className="eyebrow">Last updated</p>
                  <p className="mt-1 text-chalk">{stamp(trade.updated_at)}</p>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {/* --------------------------------------------- mmr history */}
        {tab === "mmr" ? (
          <section className="panel p-5">
            <SectionHead
              title="MMR history"
              action={
                <div className="no-print flex gap-2">
                  <a
                    href={mmrUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-ghost btn-sm"
                  >
                    Open MMR site
                  </a>
                  <button className="btn btn-gold btn-sm" onClick={() => openMmrForm(null)}>
                    Add MMR
                  </button>
                </div>
              }
            />
            {mmr.length === 0 ? (
              <p className="text-[13.5px] text-muted">
                No MMR checks recorded. Values you add here are kept forever, so you can see
                how the number moved.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th text-right">Value</th>
                      <th className="th">Date checked</th>
                      <th className="th text-right">Mileage</th>
                      <th className="th">Entered by</th>
                      <th className="th">Notes</th>
                      <th className="th no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {mmr.map((m, i) => {
                      const prev = mmr[i + 1]?.mmr_value ?? null;
                      const diff = prev === null ? null : m.mmr_value - prev;
                      return (
                        <tr key={m.id}>
                          <td className="td tnum text-right font-medium">
                            {money(m.mmr_value)}
                            {diff !== null && diff !== 0 ? (
                              <span
                                className={`ml-2 text-[11.5px] ${
                                  diff > 0 ? "text-good" : "text-bad"
                                }`}
                              >
                                {diff > 0 ? "+" : "\u2212"}
                                {money(Math.abs(diff)).replace("-", "")}
                              </span>
                            ) : null}
                          </td>
                          <td className="td">{longDate(m.checked_date)}</td>
                          <td className="td tnum text-right">
                            {m.mileage === null ? "—" : miles(m.mileage)}
                          </td>
                          <td className="td">{m.users?.name ?? "—"}</td>
                          <td className="td whitespace-normal text-muted">{m.notes || "—"}</td>
                          <td className="td no-print text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-quiet btn-sm"
                                onClick={() => openMmrForm(m)}
                              >
                                Edit
                              </button>
                              <ConfirmButton
                                prompt="Delete?"
                                onConfirm={() => deleteMmr(m.id, trade.id)}
                              >
                                Delete
                              </ConfirmButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* --------------------------------------- appraisal history */}
        {tab === "appraisals" ? (
          <section className="panel p-5">
            <SectionHead
              title="Appraisal history"
              action={
                <button className="btn btn-gold btn-sm no-print" onClick={() => openAppForm(null)}>
                  Add appraisal
                </button>
              }
            />
            {appraisals.length === 0 ? (
              <p className="text-[13.5px] text-muted">
                No appraisals recorded. Every appraisal you add is kept, so re-appraising the
                same car later does not overwrite anything.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th text-right">Value</th>
                      <th className="th">Appraisal date</th>
                      <th className="th text-right">Mileage</th>
                      <th className="th">Appraised by</th>
                      <th className="th">Notes</th>
                      <th className="th no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {appraisals.map((a, i) => {
                      const prev = appraisals[i + 1]?.appraised_value ?? null;
                      const diff = prev === null ? null : a.appraised_value - prev;
                      return (
                        <tr key={a.id}>
                          <td className="td tnum text-right font-medium text-gold">
                            {money(a.appraised_value)}
                            {diff !== null && diff !== 0 ? (
                              <span
                                className={`ml-2 text-[11.5px] ${
                                  diff > 0 ? "text-good" : "text-bad"
                                }`}
                              >
                                {diff > 0 ? "+" : "\u2212"}
                                {money(Math.abs(diff)).replace("-", "")}
                              </span>
                            ) : null}
                          </td>
                          <td className="td">{longDate(a.appraisal_date)}</td>
                          <td className="td tnum text-right">
                            {a.mileage === null ? "—" : miles(a.mileage)}
                          </td>
                          <td className="td">{a.users?.name ?? "—"}</td>
                          <td className="td whitespace-normal text-muted">{a.notes || "—"}</td>
                          <td className="td no-print text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-quiet btn-sm"
                                onClick={() => openAppForm(a)}
                              >
                                Edit
                              </button>
                              <ConfirmButton
                                prompt="Delete?"
                                onConfirm={() => deleteAppraisal(a.id, trade.id)}
                              >
                                Delete
                              </ConfirmButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* -------------------------------------------- disposition */}
        {tab === "disposition" ? (
          <section className="panel p-5">
            <SectionHead title="Disposition" />
            <p className="mb-4 max-w-2xl text-[13.5px] text-muted">
              Leave this on Pending until the outcome is known. Choosing anything else opens
              the fields for that outcome.
            </p>

            <form action={dispoAction} className="max-w-2xl space-y-4">
              <input type="hidden" name="trade_id" value={trade.id} />
              <ErrorNote message={dispoState?.error} />
              {dispoState?.ok ? (
                <p className="rounded-xs border border-[#1F4632] bg-[#0B1A12] px-3 py-2 text-[13px] text-good">
                  Disposition saved.
                </p>
              ) : null}

              <div className="max-w-xs">
                <Field label="Outcome">
                  <select
                    name="disposition_type"
                    value={dispoType}
                    onChange={(e) => setDispoType(e.target.value as DispositionType)}
                    className="field"
                  >
                    {DISPOSITION_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {DISPOSITION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {dispoType !== "pending" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {DISPO_FIELDS[dispoType].destination ? (
                      <Field label={DISPO_FIELDS[dispoType].destination!}>
                        <input
                          name="destination_name"
                          defaultValue={disposition?.destination_name ?? ""}
                          className="field"
                        />
                      </Field>
                    ) : null}

                    {DISPO_FIELDS[dispoType].location ? (
                      <Field label="Dealer location">
                        <input
                          name="dealer_location"
                          defaultValue={disposition?.dealer_location ?? ""}
                          className="field"
                        />
                      </Field>
                    ) : null}

                    <Field label={DISPO_FIELDS[dispoType].date}>
                      <input
                        name="disposition_date"
                        type="date"
                        defaultValue={disposition?.disposition_date ?? todayISO()}
                        className="field"
                      />
                    </Field>

                    {DISPO_FIELDS[dispoType].price ? (
                      <Field label={`${DISPO_FIELDS[dispoType].price} — optional`}>
                        <input
                          name="sale_price"
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={disposition?.sale_price ?? ""}
                          className="field tnum"
                        />
                      </Field>
                    ) : null}

                    {DISPO_FIELDS[dispoType].confirmation ? (
                      <Field label={`${DISPO_FIELDS[dispoType].confirmation} — optional`}>
                        <input
                          name="confirmation_number"
                          defaultValue={disposition?.confirmation_number ?? ""}
                          className="field"
                        />
                      </Field>
                    ) : null}

                    {DISPO_FIELDS[dispoType].contact ? (
                      <Field label={`${DISPO_FIELDS[dispoType].contact} — optional`}>
                        <input
                          name="contact_information"
                          defaultValue={disposition?.contact_information ?? ""}
                          className="field"
                        />
                      </Field>
                    ) : null}
                  </div>

                  <Field label="Notes">
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={disposition?.notes ?? ""}
                      className="field"
                    />
                  </Field>

                  <label className="flex items-center gap-2 text-[13.5px] text-chalk">
                    <input
                      type="checkbox"
                      name="complete_trade"
                      value="yes"
                      defaultChecked
                      className="accent-gold"
                    />
                    Mark the trade completed
                  </label>
                </>
              ) : null}

              <SubmitButton>Save disposition</SubmitButton>
            </form>
          </section>
        ) : null}

        {/* -------------------------------------------------- notes */}
        {tab === "notes" ? (
          <section className="panel p-5">
            <SectionHead title="Notes" />
            <form action={noteAction} className="mb-5 max-w-2xl space-y-3">
              <input type="hidden" name="trade_id" value={trade.id} />
              <ErrorNote message={noteState?.error} />
              <textarea
                name="note"
                rows={3}
                required
                className="field"
                placeholder="What happened, who you spoke to, what comes next."
                key={notes.length}
              />
              <SubmitButton className="btn btn-gold btn-sm">Add note</SubmitButton>
            </form>

            {notes.length === 0 ? (
              <p className="text-[13.5px] text-muted">
                Nothing written down yet. Notes stack up here and are never overwritten.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-golddim pl-3">
                    <p className="whitespace-pre-wrap text-[14px] text-chalk">{n.note}</p>
                    <p className="mt-1 text-[11.5px] text-dim">
                      {n.users?.name ?? "—"} · {stamp(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* ----------------------------------------------- activity */}
        {tab === "activity" ? (
          <section className="panel p-5">
            <SectionHead title="Activity" />
            {activity.length === 0 ? (
              <p className="text-[13.5px] text-muted">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-0">
                {activity.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line/60 py-2.5 text-[13.5px]"
                  >
                    <span className="w-40 shrink-0 text-muted">{stamp(a.created_at)}</span>
                    <span className="font-medium text-chalk">{a.action}</span>
                    {a.previous_value || a.new_value ? (
                      <span className="text-muted">
                        {a.field_label ? `${a.field_label}: ` : ""}
                        {a.previous_value ? (
                          <span className="text-dim line-through">{a.previous_value}</span>
                        ) : null}
                        {a.previous_value && a.new_value ? " → " : ""}
                        {a.new_value ? <span className="text-gold">{a.new_value}</span> : null}
                      </span>
                    ) : null}
                    <span className="ml-auto text-dim">{a.users?.name ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {/* ------------------------------------------------ slide overs */}
      <SlideOver
        open={mmrOpen}
        onClose={() => setMmrOpen(false)}
        title={editMmr ? "Edit MMR" : "Add MMR"}
        subtitle={name}
      >
        <form
          action={(fd) => {
            mmrAction(fd);
            setMmrOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="trade_id" value={trade.id} />
          {editMmr ? <input type="hidden" name="entry_id" value={editMmr.id} /> : null}
          <ErrorNote message={mmrState?.error} />

          <Field label="MMR value">
            <input
              name="mmr_value"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={editMmr?.mmr_value ?? ""}
              className="field tnum text-lg"
              placeholder="24500"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date checked">
              <input
                name="checked_date"
                type="date"
                required
                defaultValue={editMmr?.checked_date ?? todayISO()}
                className="field"
              />
            </Field>
            <Field label="Mileage at check">
              <input
                name="mileage"
                type="number"
                min={0}
                defaultValue={editMmr?.mileage ?? trade.current_mileage}
                className="field tnum"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={editMmr?.notes ?? ""}
              className="field"
              placeholder="Optional"
            />
          </Field>

          <div className="flex gap-2">
            <SubmitButton>{editMmr ? "Save MMR" : "Add MMR"}</SubmitButton>
            <a
              href={mmrUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost"
            >
              Open MMR site
            </a>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        open={appOpen}
        onClose={() => setAppOpen(false)}
        title={editApp ? "Edit appraisal" : "Add appraisal"}
        subtitle={name}
      >
        <form
          action={(fd) => {
            appAction(fd);
            setAppOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="trade_id" value={trade.id} />
          {editApp ? <input type="hidden" name="entry_id" value={editApp.id} /> : null}
          <ErrorNote message={appState?.error} />

          <Field label="Appraised value">
            <input
              name="appraised_value"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={editApp?.appraised_value ?? ""}
              className="field tnum text-lg"
              placeholder="23800"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Appraisal date">
              <input
                name="appraisal_date"
                type="date"
                required
                defaultValue={editApp?.appraisal_date ?? todayISO()}
                className="field"
              />
            </Field>
            <Field label="Mileage at appraisal">
              <input
                name="mileage"
                type="number"
                min={0}
                defaultValue={editApp?.mileage ?? trade.current_mileage}
                className="field tnum"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={editApp?.notes ?? ""}
              className="field"
              placeholder="Optional"
            />
          </Field>

          <SubmitButton>{editApp ? "Save appraisal" : "Add appraisal"}</SubmitButton>
        </form>
      </SlideOver>
    </div>
  );
}
