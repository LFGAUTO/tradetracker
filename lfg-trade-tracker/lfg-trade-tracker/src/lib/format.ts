import type { TradeListRow } from "./types";
import { DISPOSITION_LABELS, STATUS_LABELS } from "./types";

export const money = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v);

export const moneyExact = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export const signedMoney = (v: number) =>
  `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${money(Math.abs(v)).replace("-", "")}`;

export const miles = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${new Intl.NumberFormat("en-US").format(v)} mi`;

/** Renders a YYYY-MM-DD date without dragging it through a timezone. */
export const shortDate = (v: string | null | undefined) => {
  if (!v) return "—";
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${m}/${d}/${y.slice(2)}`;
};

export const longDate = (v: string | null | undefined) => {
  if (!v) return "—";
  const [y, m, d] = v.slice(0, 10).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const stamp = (v: string | null | undefined) =>
  !v
    ? "—"
    : new Date(v).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

export const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`;
};

/** "2026-08" -> inclusive first/last day strings. */
export function monthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export const vehicleName = (t: {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
}) => [t.year, t.make, t.model, t.trim].filter(Boolean).join(" ") || "Vehicle";

/** Change between two values, or null when there is nothing to compare. */
export function delta(latest: number | null, previous: number | null) {
  if (latest === null || previous === null || previous === 0) return null;
  const diff = latest - previous;
  return { diff, pct: (diff / previous) * 100 };
}

// ------------------------------------------------------------------ CSV
const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Leading =, +, - or @ can be executed by Excel. Prefix them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const TRADE_CSV_HEADERS = [
  "Date Added",
  "Status",
  "Year",
  "Make",
  "Model",
  "Trim",
  "VIN",
  "Mileage",
  "Client Name",
  "Broker",
  "Lease or Loan",
  "Bank",
  "Payoff",
  "Latest MMR",
  "Latest MMR Date",
  "Previous MMR",
  "Latest Appraised Value",
  "Latest Appraisal Date",
  "Previous Appraised Value",
  "MMR vs Appraisal",
  "Disposition",
  "Destination",
  "Disposition Date",
  "Sale Price",
  "Created By",
  "Last Updated",
];

export function tradeCsvRow(t: TradeListRow) {
  return [
    t.date_added,
    STATUS_LABELS[t.status],
    t.year ?? "",
    t.make ?? "",
    t.model ?? "",
    t.trim ?? "",
    t.vin,
    t.current_mileage,
    t.client_name,
    t.broker_name ?? "",
    t.finance_type === "lease" ? "Lease" : "Loan",
    t.bank_name ?? "",
    t.current_payoff ?? "",
    t.latest_mmr ?? "",
    t.latest_mmr_date ?? "",
    t.previous_mmr ?? "",
    t.latest_appraisal ?? "",
    t.latest_appraisal_date ?? "",
    t.previous_appraisal ?? "",
    t.spread ?? "",
    DISPOSITION_LABELS[t.disposition],
    t.destination_name ?? "",
    t.disposition_date ?? "",
    t.sale_price ?? "",
    t.created_by_name ?? "",
    t.updated_at,
  ];
}
