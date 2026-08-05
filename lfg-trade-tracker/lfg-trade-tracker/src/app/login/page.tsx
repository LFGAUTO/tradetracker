"use client";

import Image from "next/image";
import { useFormState } from "react-dom";
import { signIn, type ActionResult } from "@/lib/actions";
import { ErrorNote, SubmitButton } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="LFG AUTO" width={104} height={104} priority />
          <h1 className="mt-5 font-display text-[34px] leading-none tracking-[0.06em] text-chalk">
            Trade Tracker
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Trades, MMR and appraisals for LFG AUTO.
          </p>
        </div>

        <form action={formAction} className="panel panel-ruled space-y-4 p-6">
          <ErrorNote message={state?.error} />

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="field"
              placeholder="jessica@lfgauto.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
            />
          </div>

          <SubmitButton className="btn btn-gold w-full" pendingLabel="Signing in">
            Sign in
          </SubmitButton>

          <p className="text-center text-[12px] text-dim">
            No account? Ask an admin to add you on the Settings page.
          </p>
        </form>
      </div>
    </main>
  );
}
