"use client";

import { useFormState } from "react-dom";
import {
  addBank,
  addBroker,
  createUser,
  saveSetting,
  setUserActive,
  setUserRole,
  toggleBank,
  toggleBroker,
  type ActionResult,
} from "@/lib/actions";
import type { Bank, Broker, Profile } from "@/lib/types";
import { ErrorNote, Field, SubmitButton } from "@/components/ui";

function ListRow({
  name,
  active,
  onToggle,
}: {
  name: string;
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between border-b border-line/60 py-2">
      <span className={`text-[14px] ${active ? "text-chalk" : "text-dim line-through"}`}>
        {name}
      </span>
      <button className="btn btn-quiet btn-sm" onClick={() => onToggle(!active)}>
        {active ? "Hide" : "Restore"}
      </button>
    </li>
  );
}

export function BrokerPanel({ brokers }: { brokers: Broker[] }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(addBroker, null);

  return (
    <section className="panel panel-ruled p-5">
      <h2 className="mb-1 font-display text-2xl tracking-wide text-chalk">Brokers</h2>
      <p className="mb-4 text-[13px] text-muted">
        Hidden brokers stay on old trades but drop off the new trade dropdown.
      </p>

      <form action={action} className="mb-4 flex gap-2">
        <input name="name" required className="field" placeholder="Add a broker" />
        <SubmitButton className="btn btn-gold btn-sm shrink-0">Add</SubmitButton>
      </form>
      <ErrorNote message={state?.error} />

      <ul className="max-h-80 overflow-y-auto">
        {brokers.map((b) => (
          <ListRow
            key={b.id}
            name={b.name}
            active={b.active}
            onToggle={(next) => toggleBroker(b.id, next)}
          />
        ))}
      </ul>
    </section>
  );
}

export function BankPanel({ banks }: { banks: Bank[] }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(addBank, null);

  return (
    <section className="panel panel-ruled p-5">
      <h2 className="mb-1 font-display text-2xl tracking-wide text-chalk">
        Banks and leasing companies
      </h2>
      <p className="mb-4 text-[13px] text-muted">
        Anyone can add one while entering a trade. Tidy the list here.
      </p>

      <form action={action} className="mb-4 flex gap-2">
        <input name="name" required className="field" placeholder="Add a bank" />
        <SubmitButton className="btn btn-gold btn-sm shrink-0">Add</SubmitButton>
      </form>
      <ErrorNote message={state?.error} />

      <ul className="max-h-80 overflow-y-auto">
        {banks.map((b) => (
          <ListRow
            key={b.id}
            name={b.name}
            active={b.active}
            onToggle={(next) => toggleBank(b.id, next)}
          />
        ))}
      </ul>
    </section>
  );
}

export function MmrUrlPanel({ url }: { url: string }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(saveSetting, null);

  return (
    <section className="panel panel-ruled p-5">
      <h2 className="mb-1 font-display text-2xl tracking-wide text-chalk">MMR website</h2>
      <p className="mb-4 text-[13px] text-muted">
        Where the Open MMR site buttons point. It opens in a new tab.
      </p>

      <form action={action} className="space-y-3">
        <input type="hidden" name="setting_key" value="mmr_website_url" />
        <ErrorNote message={state?.error} />
        {state?.ok ? <p className="text-[13px] text-good">Saved.</p> : null}
        <input
          name="setting_value"
          type="url"
          defaultValue={url}
          className="field"
          placeholder="https://www.manheim.com"
        />
        <SubmitButton className="btn btn-gold btn-sm">Save URL</SubmitButton>
      </form>
    </section>
  );
}

export function UserPanel({ users, me }: { users: Profile[]; me: Profile }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(createUser, null);

  return (
    <section className="panel panel-ruled p-5 lg:col-span-2">
      <h2 className="mb-1 font-display text-2xl tracking-wide text-chalk">People</h2>
      <p className="mb-4 max-w-2xl text-[13px] text-muted">
        Admins manage everything and can delete or restore trades. Standard users add
        trades, MMR, appraisals and dispositions.
      </p>

      <form action={action} className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field label="Name">
          <input name="name" className="field" placeholder="Jessica" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className="field" />
        </Field>
        <Field label="Starting password" hint="At least 8 characters.">
          <input name="password" type="text" required minLength={8} className="field" />
        </Field>
        <Field label="Role">
          <select name="role" className="field" defaultValue="standard">
            <option value="standard">Standard user</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <SubmitButton className="btn btn-gold">Add person</SubmitButton>
      </form>
      <ErrorNote message={state?.error} />
      {state?.ok ? (
        <p className="mb-4 text-[13px] text-good">
          Added. Pass along the email and password so they can sign in.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Access</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td">{u.name || "—"}</td>
                <td className="td text-muted">{u.email}</td>
                <td className="td">
                  <select
                    className="field w-auto py-1 text-[12.5px]"
                    value={u.role}
                    disabled={u.id === me.id}
                    onChange={(e) =>
                      setUserRole(u.id, e.target.value as "admin" | "standard")
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="td">
                  <span className={u.active ? "text-good" : "text-bad"}>
                    {u.active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="td text-right">
                  {u.id === me.id ? (
                    <span className="text-dim">That is you</span>
                  ) : (
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => setUserActive(u.id, !u.active)}
                    >
                      {u.active ? "Suspend" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
