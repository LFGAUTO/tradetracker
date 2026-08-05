export type UserRole = "admin" | "standard";
export type FinanceType = "lease" | "loan";

export type TradeStatus =
  | "new"
  | "waiting_mmr"
  | "waiting_appraisal"
  | "appraised"
  | "waiting_decision"
  | "completed"
  | "archived";

export type DispositionType =
  | "pending"
  | "dealer_return"
  | "sold"
  | "customer_keeping"
  | "lease_buyout"
  | "no_trade"
  | "other";

export const STATUS_LABELS: Record<TradeStatus, string> = {
  new: "New",
  waiting_mmr: "Waiting for MMR",
  waiting_appraisal: "Waiting for appraisal",
  appraised: "Appraised",
  waiting_decision: "Waiting for decision",
  completed: "Completed",
  archived: "Archived",
};

export const STATUS_ORDER: TradeStatus[] = [
  "new",
  "waiting_mmr",
  "waiting_appraisal",
  "appraised",
  "waiting_decision",
  "completed",
  "archived",
];

export const DISPOSITION_LABELS: Record<DispositionType, string> = {
  pending: "Pending",
  dealer_return: "Dealer return",
  sold: "Sold",
  customer_keeping: "Customer keeping vehicle",
  lease_buyout: "Lease buyout",
  no_trade: "No trade",
  other: "Other",
};

export const DISPOSITION_ORDER: DispositionType[] = [
  "pending",
  "dealer_return",
  "sold",
  "customer_keeping",
  "lease_buyout",
  "no_trade",
  "other",
];

export type Broker = { id: string; name: string; active: boolean };
export type Bank = { id: string; name: string; active: boolean };

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type TradeListRow = {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  current_mileage: number;
  client_name: string;
  broker_id: string;
  broker_name: string | null;
  finance_type: FinanceType;
  bank_id: string;
  bank_name: string | null;
  current_payoff: number | null;
  payoff_good_through: string | null;
  status: TradeStatus;
  disposition: DispositionType;
  date_added: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  latest_mmr: number | null;
  latest_mmr_date: string | null;
  previous_mmr: number | null;
  latest_appraisal: number | null;
  latest_appraisal_date: string | null;
  previous_appraisal: number | null;
  spread: number | null;
  destination_name: string | null;
  dealer_location: string | null;
  disposition_date: string | null;
  sale_price: number | null;
};

export type MmrEntry = {
  id: string;
  trade_id: string;
  mmr_value: number;
  checked_date: string;
  mileage: number | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
  users?: { name: string } | null;
};

export type AppraisalEntry = {
  id: string;
  trade_id: string;
  appraised_value: number;
  appraisal_date: string;
  mileage: number | null;
  notes: string | null;
  appraised_by: string | null;
  created_at: string;
  users?: { name: string } | null;
};

export type DispositionRecord = {
  id: string;
  trade_id: string;
  disposition_type: DispositionType;
  destination_name: string | null;
  dealer_location: string | null;
  disposition_date: string | null;
  sale_price: number | null;
  confirmation_number: string | null;
  contact_information: string | null;
  notes: string | null;
};

export type TradeNote = {
  id: string;
  note: string;
  created_at: string;
  users?: { name: string } | null;
};

export type ActivityLog = {
  id: string;
  action: string;
  field_label: string | null;
  previous_value: string | null;
  new_value: string | null;
  created_at: string;
  users?: { name: string } | null;
};
