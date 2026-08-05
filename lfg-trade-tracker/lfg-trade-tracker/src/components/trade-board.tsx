"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DISPOSITION_LABELS,
  DISPOSITION_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  type Bank,
  type Broker,
  type TradeListRow,
} from "@/lib/types";
import {
  TRADE_CSV_HEADERS,
  downloadCsv,
  miles,
  money,
  shortDate,
  stamp,
  toCsv,
  tradeCsvRow,
} from "@/lib/format";
import { DispositionBadge, StatusBadge } from "@/components/ui";

type ColumnKey =
  | "date_added"
  | "status"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "vin"
  | "mileage"
  | "client_name"
  | "broker"
  | "finance"
  | "bank"
  | "latest_mmr"
  | "latest_appraisal"
  | "spread"
  | "disposition"
  | "destination"
  | "updated_at";

const COLUMNS: { key: ColumnKey; label: string; align?: "right"; defaultOn: boolean }[] = [
  { key: "date_added", label: "Added", defaultOn: true },
  { key: "status", label: "Status", defaultOn: true },
  { key: "year", label: "Year", defaultOn: true },
  { key: "make", label: "Make", defaultOn: true },
  { key: "model", label: "Model", defaultOn: true },
  { key: "trim", label: "Trim", defaultOn: false },
  { key: "vin", label: "VIN", defaultOn: true },
  { key: "mileage", label: "Mileage", align: "right", defaultOn: true },
  { key: "client_name", label: "Client", defaultOn: true },
  { key: "broker", label: "Broker", defaultOn: true },
  { key: "finance", label: "Lease / Loan", defaultOn: true },
  { key: "bank", label: "Bank", defaultOn: true },
  { key: "latest_mmr", label: "Latest MMR", align: "right", defaultOn: true },
  { key: "latest_appraisal", label: "Latest appraisal", align: "right", defaultOn: true },
  { key: "spread", label: "Difference", align: "right", defaultOn: false },
  { key: "disposition", label: "Disposition", defaultOn: true },
  { key: "destination", label: "Destination", defaultOn: false },
  { key: "updated_at", label: "Last updated", defaultOn: false },
];

const sortValue = (t: TradeListRow, key: ColumnKey): string | number => {
  switch (key) {
    case "date_added":
      return t.date_added;
    case "status":
      return STATUS_LABELS[t.status];
    case "year":
      return t.year ?? 0;
    case "make":
      return t.make ?? "";
    case "model":
      return t.model ?? "";
    case "trim":
      return t.trim ?? "";
    case "vin":
      return t.vin;
    case "mileage":
      return t.current_mileage;
    case "client_name":
      return t.client_name.toLowerCase();
    case "broker":
      return t.broker_name ?? "";
    case "finance":
      return t.finance_type;
    case "bank":
      return t.bank_name ?? "";
    case "latest_mmr":
      return t.latest_mmr ?? -1;
    case "latest_appraisal":
      return t.latest_appraisal ?? -1;
    case "spread":
      return t.spread ?? Number.NEGATIVE_INFINITY;
    case "disposition":
      return DISPOSITION_LABELS[t.disposition];
    case "destination":
      return t.destination_name ?? "";
    case "updated_at":
      return t.updated_at;
  }
};

const haystack = (t: TradeListRow) =>
  [
    t.vin,
    t.client_name,
    t.broker_name,
    t.year,
    t.make,
    t.model,
    t.trim,
    t.bank_name,
    t.destination_name,
    t.dealer_location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function TradeBoard({
  trades,
  brokers,
  banks,
  filenameStem,
  emptyTitle,
  emptyBody,
}: {
  trades: TradeListRow[];
  brokers: Broker[];
  banks: Bank[];
  filenameStem: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const [query, setQuery] = useState("");
  const [broker, setBroker] = useState("");
  const [status, setStatus] = useState("");
  const [disposition, setDisposition] = useState("");
  const [finance, setFinance] = useState("");
  const [bank, setBank] = useState("");
  const [make, setMake] = useState("");
  const [sortKey, setSortKey] = useState<ColumnKey>("date_added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showColumns, setShowColumns] = useState(false);
  const [visible, setVisible] = useState<ColumnKey[]>(
    COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)
  );

  const makes = useMemo(
    () => Array.from(new Set(trades.map((t) => t.make).filter(Boolean) as string[])).sort(),
    [trades]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = trades.filter((t) => {
      if (q && !haystack(t).includes(q)) return false;
      if (broker && t.broker_id !== broker) return false;
      if (status && t.status !== status) return false;
      if (disposition && t.disposition !== disposition) return false;
      if (finance && t.finance_type !== finance) return false;
      if (bank && t.bank_id !== bank) return false;
      if (make && t.make !== make) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [trades, query, broker, status, disposition, finance, bank, make, sortKey, sortDir]);

  const activeFilters =
    Boolean(query || broker || status || disposition || finance || bank || make);

  const clearAll = () => {
    setQuery("");
    setBroker("");
    setStatus("");
    setDisposition("");
    setFinance("");
    setBank("");
    setMake("");
  };

  const toggleSort = (key: ColumnKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date_added" || key === "updated_at" ? "desc" : "asc");
    }
  };

  const exportRows = (list: TradeListRow[], suffix: string) =>
    downloadCsv(
      `${filenameStem}-${suffix}.csv`,
      toCsv(TRADE_CSV_HEADERS, list.map(tradeCsvRow))
    );

  const shown = COLUMNS.filter((c) => visible.includes(c.key));

  const cell = (t: TradeListRow, key: ColumnKey) => {
    switch (key) {
      case "date_added":
        return shortDate(t.date_added);
      case "status":
        return <StatusBadge status={t.status} />;
      case "year":
        return t.year ?? "—";
      case "make":
        return t.make ?? "—";
      case "model":
        return t.model ?? "—";
      case "trim":
        return t.trim ?? "—";
      case "vin":
        return (
          <span className="tnum text-[12.5px] text-muted">
            {t.vin.slice(0, 9)}
            <span className="text-chalk">{t.vin.slice(9)}</span>
          </span>
        );
      case "mileage":
        return <span className="tnum">{miles(t.current_mileage)}</span>;
      case "client_name":
        return <span className="font-medium">{t.client_name}</span>;
      case "broker":
        return t.broker_name ?? "—";
      case "finance":
        return t.finance_type === "lease" ? "Lease" : "Loan";
      case "bank":
        return t.bank_name ?? "—";
      case "latest_mmr":
        return <span className="tnum">{money(t.latest_mmr)}</span>;
      case "latest_appraisal":
        return <span className="tnum text-gold">{money(t.latest_appraisal)}</span>;
      case "spread":
        return t.spread === null ? (
          "—"
        ) : (
          <span
            className={`tnum ${
              t.spread > 0 ? "text-good" : t.spread < 0 ? "text-bad" : "text-muted"
            }`}
          >
            {t.spread > 0 ? "+" : t.spread < 0 ? "\u2212" : ""}
            {money(Math.abs(t.spread)).replace("-", "")}
          </span>
        );
      case "disposition":
        return <DispositionBadge disposition={t.disposition} />;
      case "destination":
        return t.destination_name ?? "—";
      case "updated_at":
        return <span className="text-muted">{stamp(t.updated_at)}</span>;
    }
  };

  return (
    <section className="panel panel-ruled">
      {/* toolbar */}
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field min-w-[220px] flex-1"
            placeholder="Search VIN, client, broker, bank, vehicle, destination"
            aria-label="Search trades"
          />
          <div className="relative">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowColumns((v) => !v)}
              aria-expanded={showColumns}
            >
              Columns
            </button>
            {showColumns ? (
              <div className="panel absolute right-0 z-30 mt-2 w-60 p-3 shadow-lift">
                <p className="eyebrow mb-2">Show columns</p>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {COLUMNS.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-chalk"
                    >
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={visible.includes(c.key)}
                        onChange={(e) =>
                          setVisible((v) =>
                            e.target.checked ? [...v, c.key] : v.filter((k) => k !== c.key)
                          )
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => exportRows(rows, "view")}
            disabled={!rows.length}
          >
            Export view
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => exportRows(trades, "all")}
            disabled={!trades.length}
          >
            Export all
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="field w-auto py-1.5 text-[13px]"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            aria-label="Filter by broker"
          >
            <option value="">All brokers</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1.5 text-[13px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1.5 text-[13px]"
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
            aria-label="Filter by disposition"
          >
            <option value="">All dispositions</option>
            {DISPOSITION_ORDER.map((d) => (
              <option key={d} value={d}>
                {DISPOSITION_LABELS[d]}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1.5 text-[13px]"
            value={finance}
            onChange={(e) => setFinance(e.target.value)}
            aria-label="Filter by lease or loan"
          >
            <option value="">Lease and loan</option>
            <option value="lease">Lease</option>
            <option value="loan">Loan</option>
          </select>

          <select
            className="field w-auto py-1.5 text-[13px]"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            aria-label="Filter by bank"
          >
            <option value="">All banks</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1.5 text-[13px]"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            aria-label="Filter by make"
          >
            <option value="">All makes</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {activeFilters ? (
            <button type="button" className="btn btn-quiet btn-sm" onClick={clearAll}>
              Clear filters
            </button>
          ) : null}

          <span className="ml-auto self-center text-[12.5px] text-muted">
            {rows.length} of {trades.length}
          </span>
        </div>
      </div>

      {/* table */}
      {rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-2xl tracking-wide text-chalk">
            {trades.length ? "Nothing matches those filters" : emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted">
            {trades.length ? "Widen the search or clear the filters." : emptyBody}
          </p>
          {trades.length ? (
            <button className="btn btn-ghost mt-5" onClick={clearAll}>
              Clear filters
            </button>
          ) : (
            <Link href="/trades/new" className="btn btn-gold mt-5">
              New trade
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {shown.map((c) => (
                  <th key={c.key} className={`th ${c.align === "right" ? "text-right" : ""}`}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gold"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      <span className={sortKey === c.key ? "text-gold" : "text-transparent"}>
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="group hover:bg-rail">
                  {shown.map((c) => (
                    <td
                      key={c.key}
                      className={`td ${c.align === "right" ? "text-right" : ""}`}
                    >
                      {cell(t, c.key)}
                    </td>
                  ))}
                  <td className="td text-right">
                    <Link
                      href={`/trades/${t.id}`}
                      className="font-head text-[10px] font-semibold uppercase tracking-[0.14em] text-muted group-hover:text-gold"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
