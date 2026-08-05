"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { createTrade, updateTrade, type ActionResult } from "@/lib/actions";
import { decodeVin, normalizeVin, vinError } from "@/lib/vin";
import { shortDate, todayISO } from "@/lib/format";
import { STATUS_LABELS, STATUS_ORDER, type Bank, type Broker, type TradeListRow } from "@/lib/types";
import { ErrorNote, Field, SubmitButton } from "@/components/ui";

const NEW_BANK = "__new";

export function TradeForm({
  mode,
  brokers,
  banks,
  trade,
}: {
  mode: "create" | "edit";
  brokers: Broker[];
  banks: Bank[];
  trade?: TradeListRow;
}) {
  const action = mode === "create" ? createTrade : updateTrade;
  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [vin, setVin] = useState(trade?.vin ?? "");
  const [year, setYear] = useState(trade?.year ? String(trade.year) : "");
  const [make, setMake] = useState(trade?.make ?? "");
  const [model, setModel] = useState(trade?.model ?? "");
  const [trim, setTrim] = useState(trade?.trim ?? "");
  const [decoding, setDecoding] = useState(false);
  const [decodeNote, setDecodeNote] = useState<string | null>(null);
  const [decodeErr, setDecodeErr] = useState<string | null>(null);
  const [didDecode, setDidDecode] = useState(false);

  const [finance, setFinance] = useState(trade?.finance_type ?? "");
  const [bankId, setBankId] = useState(trade?.bank_id ?? "");

  // Duplicate handshake: the action replies DUPLICATE::id::client::date.
  const dupe = state?.error?.startsWith("DUPLICATE::")
    ? (() => {
        const [, id, client, date] = state.error!.split("::");
        return { id, client, date };
      })()
    : null;

  const plainError = state?.error && !dupe ? state.error : null;

  async function runDecode() {
    const clean = normalizeVin(vin);
    setVin(clean);
    setDecodeNote(null);

    const invalid = vinError(clean);
    if (invalid) {
      setDecodeErr(invalid);
      return;
    }

    setDecodeErr(null);
    setDecoding(true);
    try {
      const d = await decodeVin(clean);
      if (!d.year && !d.make && !d.model) {
        setDecodeErr(
          d.errorText
            ? `The decoder could not read this VIN: ${d.errorText}`
            : "The decoder returned nothing for this VIN. Fill the vehicle in by hand."
        );
      } else {
        if (d.year) setYear(String(d.year));
        if (d.make) setMake(d.make);
        if (d.model) setModel(d.model);
        setTrim(d.trim ?? "");
        setDidDecode(true);
        setDecodeNote(
          d.trim
            ? "Decoded. Correct anything the decoder got wrong."
            : "Decoded, but no trim came back. Add it by hand if you need it."
        );
      }
    } catch (e) {
      setDecodeErr(
        e instanceof Error ? e.message : "The VIN decoder could not be reached."
      );
    } finally {
      setDecoding(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5"
    >
      {mode === "edit" ? <input type="hidden" name="trade_id" value={trade!.id} /> : null}
      <input type="hidden" name="vin_decoded" value={didDecode ? "yes" : "no"} />

      <ErrorNote message={plainError} />

      {dupe ? (
        <div className="panel border-[#5A4A16] bg-[#1C1708] p-4">
          <p className="font-head text-[12px] font-bold uppercase tracking-[0.14em] text-warn">
            This VIN is already on the board
          </p>
          <p className="mt-1.5 text-[13.5px] text-chalk">
            {dupe.client} · added {shortDate(dupe.date)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/trades/${dupe.id}`} className="btn btn-gold btn-sm">
              Open that trade
            </Link>
            <button
              type="submit"
              name="allow_duplicate"
              value="yes"
              className="btn btn-ghost btn-sm"
            >
              Add a second record anyway
            </button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && state?.ok ? (
        <p className="rounded-xs border border-[#1F4632] bg-[#0B1A12] px-3 py-2 text-[13px] text-good">
          Changes saved.
        </p>
      ) : null}

      {/* ------------------------------------------------ vehicle */}
      <section className="panel panel-ruled p-5">
        <h2 className="mb-4 font-display text-2xl tracking-wide text-chalk">Vehicle</h2>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            label="VIN — required"
            hint="17 characters. Paste it and press Decode VIN."
          >
            <input
              name="vin"
              value={vin}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase());
                setDecodeErr(null);
              }}
              onBlur={() => setVin(normalizeVin(vin))}
              maxLength={17}
              required
              spellCheck={false}
              autoCapitalize="characters"
              className="field tnum tracking-[0.12em]"
              placeholder="1HGCM82633A004352"
            />
          </Field>
          <button
            type="button"
            onClick={runDecode}
            disabled={decoding}
            className="btn btn-gold h-[46px]"
          >
            {decoding ? "Decoding" : "Decode VIN"}
          </button>
        </div>

        {decodeErr ? (
          <p className="mt-2 text-[13px] text-bad" role="alert">
            {decodeErr}
          </p>
        ) : null}
        {decodeNote ? <p className="mt-2 text-[13px] text-good">{decodeNote}</p> : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Year">
            <input
              name="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              className="field tnum"
            />
          </Field>
          <Field label="Make">
            <input
              name="make"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="field"
            />
          </Field>
          <Field label="Model">
            <input
              name="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="field"
            />
          </Field>
          <Field label="Trim">
            <input
              name="trim"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
              className="field"
            />
          </Field>
        </div>

        <div className="mt-4 max-w-xs">
          <Field label="Mileage — required">
            <input
              name="current_mileage"
              type="number"
              min={0}
              required
              defaultValue={trade?.current_mileage ?? ""}
              className="field tnum"
              placeholder="42150"
            />
          </Field>
        </div>
      </section>

      {/* ------------------------------------------------- client */}
      <section className="panel panel-ruled p-5">
        <h2 className="mb-4 font-display text-2xl tracking-wide text-chalk">Client</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Client name — required">
            <input
              name="client_name"
              required
              defaultValue={trade?.client_name ?? ""}
              className="field"
              placeholder="Sam Rivera"
            />
          </Field>
          <Field label="Broker — required">
            <select
              name="broker_id"
              required
              defaultValue={trade?.broker_id ?? ""}
              className="field"
            >
              <option value="" disabled>
                Choose a broker
              </option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date added">
            <input
              name="date_added"
              type="date"
              defaultValue={trade?.date_added ?? todayISO()}
              className="field"
            />
          </Field>
        </div>

        {mode === "edit" ? (
          <div className="mt-4 max-w-xs">
            <Field label="Status">
              <select name="status" defaultValue={trade!.status} className="field">
                {STATUS_ORDER.filter((s) => s !== "archived").map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <input type="hidden" name="status" value="new" />
        )}
      </section>

      {/* ------------------------------------------------ finance */}
      <section className="panel panel-ruled p-5">
        <h2 className="mb-4 font-display text-2xl tracking-wide text-chalk">Finance</h2>

        <div className="max-w-xs">
          <Field label="Lease or loan — required">
            <select
              name="finance_type"
              required
              value={finance}
              onChange={(e) => setFinance(e.target.value)}
              className="field"
            >
              <option value="" disabled>
                Choose one
              </option>
              <option value="lease">Lease</option>
              <option value="loan">Loan</option>
            </select>
          </Field>
        </div>

        {finance ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Field
                label={
                  finance === "lease"
                    ? "Leasing company — required"
                    : "Bank — required"
                }
                hint="Pick one from the list, or add a new one."
              >
                <select
                  name="bank_id"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="field"
                  required
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value={NEW_BANK}>+ Add a new one</option>
                </select>
              </Field>
              {bankId === NEW_BANK ? (
                <input
                  name="bank_name"
                  className="field mt-2"
                  placeholder="Type the bank or leasing company name"
                  required
                />
              ) : null}
            </div>

            <Field label="Current payoff">
              <input
                name="current_payoff"
                type="number"
                min={0}
                step="0.01"
                defaultValue={trade?.current_payoff ?? ""}
                className="field tnum"
                placeholder="Optional"
              />
            </Field>

            <Field label="Payoff good through">
              <input
                name="payoff_good_through"
                type="date"
                defaultValue={trade?.payoff_good_through ?? ""}
                className="field"
              />
            </Field>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-gold">
          {mode === "create" ? "Save trade" : "Save changes"}
        </SubmitButton>
        <Link
          href={mode === "edit" ? `/trades/${trade!.id}` : "/"}
          className="btn btn-ghost"
        >
          Cancel
        </Link>
        {mode === "create" ? (
          <p className="text-[12.5px] text-dim">
            MMR and appraisals get added on the trade record after saving.
          </p>
        ) : null}
      </div>
    </form>
  );
}
