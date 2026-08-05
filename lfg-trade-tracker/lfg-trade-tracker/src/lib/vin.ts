/**
 * VIN handling.
 *
 * Decoding uses the free NHTSA vPIC service. No key, no account, no quota:
 * https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/<VIN>?format=json
 */

// I, O and Q are never valid in a VIN.
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidVin(raw: string): boolean {
  return VIN_PATTERN.test(normalizeVin(raw));
}

export function vinError(raw: string): string | null {
  const vin = normalizeVin(raw);
  if (!vin) return "Enter a VIN.";
  if (vin.length !== 17) return `A VIN is 17 characters. This one has ${vin.length}.`;
  if (!VIN_PATTERN.test(vin)) return "A VIN cannot contain the letters I, O or Q.";
  return null;
}

export type DecodedVin = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  errorText: string | null;
};

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s === "Not Applicable" || s === "0") return null;
  return s;
};

export async function decodeVin(rawVin: string): Promise<DecodedVin> {
  const vin = normalizeVin(rawVin);

  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`The VIN decoder returned ${res.status}.`);

  const json = await res.json();
  const r = json?.Results?.[0];
  if (!r) throw new Error("The VIN decoder returned no results.");

  const yearRaw = clean(r.ModelYear);
  const trim = clean(r.Trim) ?? clean(r.Trim2) ?? clean(r.Series);

  return {
    year: yearRaw ? Number(yearRaw) : null,
    make: clean(r.Make),
    model: clean(r.Model),
    trim,
    bodyClass: clean(r.BodyClass),
    driveType: clean(r.DriveType),
    errorText: clean(r.ErrorText),
  };
}
