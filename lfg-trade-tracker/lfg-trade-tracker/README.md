# LFG Trade Tracker

Internal trade and appraisal tracking for LFG AUTO. Replaces the trade spreadsheet.

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · NHTSA VIN decoder · deploys to Netlify.

---

## What it does

- Every trade needs a valid 17-character VIN. No VIN, no record.
- Paste a VIN, press **Decode VIN**, and year / make / model / trim fill themselves in. All four stay editable.
- Warns on a duplicate VIN and offers to open the existing record instead of creating a second one.
- **Many MMR values per trade.** Nothing overwrites. Latest, previous, dollar change and percent change all show at the top.
- **Many appraised values per trade.** Same treatment.
- MMR against appraised value shown side by side, labelled as a comparison — never as profit.
- Lease or loan, with the bank or leasing company required either way.
- Disposition workflow that opens only the fields the chosen outcome needs.
- Notes stack up and are never overwritten. Activity is logged automatically.
- Board defaults to the current month, with previous / current / next navigation and a custom date range.
- Search, filter, choose visible columns, sort any column, export to CSV, print a single trade.
- Archive instead of delete. Archived trades stay searchable and an admin can restore them.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region near New Jersey (`us-east-1`).
2. Save the database password somewhere safe.
3. When it finishes provisioning, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (secret — this one never goes in the browser)

## 2. Run the migrations

Open **SQL Editor** in Supabase and run the three files in `supabase/migrations/` **in order**. Paste each one, press Run, wait for success, then move to the next.

| File | What it does |
| --- | --- |
| `0001_schema.sql` | Tables, enums, indexes, triggers, and the `trade_list` view |
| `0002_rls.sql` | Row level security and access policies |
| `0003_seed.sql` | Starter brokers, banks, and the MMR website setting |

`0003_seed.sql` is safe to re-run and safe to edit before you run it. Change the broker names to match your team.

> If you use the Supabase CLI instead: `supabase db push` picks these up automatically.

## 3. Create the first admin

The first account to ever sign up becomes the **admin** automatically. Everyone after that starts as a standard user.

1. In Supabase go to **Authentication → Users → Add user → Create new user**.
2. Enter the email and a password. Tick **Auto Confirm User**.
3. That account is now the admin.

Every account after that gets added from inside the app: **Settings → People**. That page needs `SUPABASE_SERVICE_ROLE_KEY` set.

## 4. Run it locally

```bash
npm install
cp .env.example .env.local     # then paste your three keys in
npm run dev
```

Open http://localhost:3000 and sign in with the admin account.

## 5. Deploy to Netlify

### Read this first: drag-and-drop will not work here

Dragging a build folder onto Netlify only publishes static files. This app is
server-rendered — sign-in, the board, the trade record and every save run as
server code. Dropped in as a folder, you would get a blank page.

So this one has to be a **Git-connected deploy**, where Netlify runs the build
itself. It is the same amount of clicking, just done once, and after that every
edit you push from the GitHub web editor redeploys on its own.

### Steps

1. Put this folder in a GitHub repository. On github.com: **New repository**,
   then **uploading an existing file**, and drag the unzipped folder in.
   Do not upload `node_modules` — the `.gitignore` already excludes it.
2. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
   → **GitHub** → pick the repo.
3. Netlify sees Next.js and fills in the build settings on its own:

   | Setting | Value |
   | --- | --- |
   | Build command | `npm run build` |
   | Publish directory | `.next` |

   `netlify.toml` in this folder already sets both, plus Node 20. Leave the form alone.

4. Open **Add environment variables** before deploying and enter all three:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | The service_role key |

5. **Deploy.** First build runs two to four minutes.
6. Copy your `.netlify.app` URL. In Supabase → **Authentication → URL Configuration**,
   set **Site URL** to it.

### What Netlify builds

- Pages and server actions → a Netlify Function
- `src/middleware.ts` (the sign-in gate) → a Netlify Edge Function
- CSS, JS and the logo → the CDN

You do not install or configure any of that. Netlify provisions its Next.js
adapter automatically the moment it detects Next.js.

### Changing environment variables later

Netlify bakes them in at build time. After editing one, go to
**Deploys → Trigger deploy → Deploy site**, or the change will not take.

### Custom domain

**Domain management → Add a domain** — for example `trades.lfgauto.com`. Netlify
issues the certificate. Afterwards, update the Supabase **Site URL** to match.

---

## VIN decoding

Uses the NHTSA vPIC service. No key, no account, no quota, no signup:

```
https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/<VIN>?format=json
```

The call runs from the browser when **Decode VIN** is pressed, so it never counts against your server. If the decoder is down or returns nothing, the form says so and you type the vehicle in by hand — decoding never blocks saving a trade.

Older and imported vehicles sometimes come back without a trim. That is normal; the trim field stays editable.

## MMR website button

**Open MMR site** opens whatever URL is configured, in a new tab. There is no MMR API integration in this version. Change the URL at **Settings → MMR website**. It ships pointing at Manheim.

---

## Roles

| | Admin | Standard user |
| --- | :---: | :---: |
| View trades | ✓ | ✓ |
| Add and edit trades | ✓ | ✓ |
| Add / edit / delete MMR entries | ✓ | ✓ |
| Add / edit / delete appraisals | ✓ | ✓ |
| Update dispositions and notes | ✓ | ✓ |
| Export CSV | ✓ | ✓ |
| Archive and restore trades | ✓ | |
| Delete a trade permanently | ✓ | |
| Manage brokers, banks, settings, people | ✓ | |

Enforced twice: hidden in the interface, and enforced again by Postgres row level security so it holds even if someone calls the API directly.

Every trade records who created it and who last touched it.

---

## Daily workflow

1. **New trade**
2. Paste the VIN → **Decode VIN**
3. Mileage
4. Client name
5. Broker
6. Lease or loan
7. Bank
8. **Save trade**
9. **Add MMR** — slides in from the side, no page change
10. **Add appraisal** — same
11. Set the disposition whenever the outcome is known

Steps 2 through 7 are the whole form. Disposition details are never asked for up front.

---

## Checks run against this build

| Check | Result |
| --- | --- |
| Production build compiles, all 8 routes | ✓ |
| Netlify build settings resolve (`npm run build` → `.next`) | ✓ |
| TypeScript strict, no errors | ✓ |
| VIN rejected when short, or containing I, O or Q | ✓ |
| Change math matches the spec's examples (−$600 / −2.39%, −$400 / −1.65%) | ✓ |
| Month ranges correct across year boundaries and leap years | ✓ |
| Dates render without timezone drift | ✓ |
| CSV escapes quotes and neutralises spreadsheet formula injection | ✓ |

Worth walking through once against your live database, since these depend on real data:

- A trade cannot be saved without a VIN
- Live VIN decode fills year / make / model / trim
- Duplicate VIN warning offers the existing record
- Several MMR entries on one trade, all kept, latest shown at top
- Several appraisals on one trade, all kept
- Lease and loan both require a bank
- Dealer Return and Sold both open their own fields
- Current-month filter, archive, restore
- CSV export of a view, a month, and a single trade
- Activity tab shows created / decoded / added / changed entries

---

## Project layout

```
netlify.toml             build command, publish directory, Node version
supabase/migrations/     0001 schema · 0002 RLS · 0003 seed
src/app/
  login/                 sign in
  (app)/                 everything behind auth
    page.tsx             the board
    trades/new/          new trade form
    trades/[id]/         trade record + edit
    archive/             archived trades
    admin/               brokers, banks, MMR URL, people
src/components/          board, trade form, trade record, value ledger, admin panels, shared UI
src/lib/                 supabase clients, server actions, VIN, formatting, types
src/middleware.ts        route protection
```

## Brand

Matte black `#0A0A0A`, metallic gold `#D4AF37`, white. Bebas Neue for display, Montserrat for labels, Inter for data with tabular figures so number columns line up. Fonts load from Google Fonts via a stylesheet link, so the build works even on a network that blocks font fetching at build time.

## Deliberately not included

License plate, number of keys, title status, lead pipeline, follow-up tasks, sales CRM, dealership sales tracking, financing applications, messaging. This tracks trades and appraisals. That is all.
