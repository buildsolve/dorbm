# Build Prompt: Kassenführung / Cash Controlling Module

## Context
Add a new module, **Cash Controlling ("Kassenführung", module code `KC`)**, to the existing
CakeERP application (NestJS + Prisma/PostgreSQL backend, React + TypeScript + Tailwind frontend,
JWT auth with role-based access). Follow the existing module conventions used by Inventory,
Production, and Dashboard (`backend/src/<module>/`, `frontend/src/pages/<module>/`,
Prisma models appended to `schema.prisma`, API client in `frontend/src/api/`).

## Purpose
Daily end-of-shift cash drawer reconciliation ("Kassensturz") for a small business. An employee
counts the physical cash in the till, the system compares it to the expected balance, captures a
reason for any discrepancy plus a signature, and management gets a dashboard and automatic
email alerts if a day's count is never submitted.

## Actors & Roles
- **Employee**: any active team member who performs a cash count. Selected from the existing
  `Employee` list (not necessarily a `User` with login — the person doing the count may be
  picked from a dropdown rather than logging in individually). Confirm: does the employee need
  their own login, or does one shared/kiosk device log in and the employee is just selected from
  a list? *(Assumption below: kiosk-style, no individual login required for the count itself.)*
- **Cash Controller / Admin**: a `User` role (e.g. `CASH_ADMIN`, or reuse `ADMIN`) with access to
  the full dashboard, all historical counts, denomination breakdowns, and discrepancy reports.
- **System**: runs a daily scheduled job that checks whether a count was submitted for the
  business day and emails configured recipients if not.

## Workflow (must match exactly)
1. Employee opens the Cash Control screen and selects the **business date** (defaults to today,
   editable) and their **name** from the employee list.
2. Employee enters the **count of each denomination** (EUR), from coins to notes:
   - Coins: 1c, 2c, 5c, 10c, 20c, 50c, €1, €2
   - Notes: €5, €10, €20, €50, €100, €200, €500
   - UI shows a quantity input per denomination and live-calculates the counted subtotal and
     grand total as the employee types.
3. System computes **Kassendifferenz** = counted total − expected/soll balance for that date,
   where the expected/soll balance is built from three parts:
   - **Opening balance** — yesterday's closing `countedAmount`, carried forward automatically
     (read-only, shown for reference).
   - **+ Today's POS cash sales** — copied by the employee from the daily POS report
     ("Tagesbericht"/"Bericht") into a single input field for that business date.
   - **− Today's till withdrawals** — cash taken out of the till during the day for purchases
     ("Barentnahme"), logged as a running list of entries (amount + purpose/note, timestamp),
     summed automatically. Employees can add one or more withdrawal entries at any point during
     the day, before the closing count.
   - `expectedAmount = openingBalance + posCashSales − sum(withdrawals)`, computed server-side.
   - If the difference is non-zero (over/under a configurable threshold, default any non-zero
     cent), the UI shows the Kassendifferenz and **requires a written reason/justification**
     before the count can be submitted. If it's zero, the reason field is optional.
4. Employee provides the reason (free text) and it is saved with the count record.
5. Employee **signs** on a signature pad (touch/finger input on a tablet/touchscreen — implement
   as an HTML canvas signature pad, e.g. `react-signature-canvas`, capturing the stroke as a
   base64 PNG or SVG path). Signature is stored against the count record; the record becomes
   **read-only / locked** once signed.
6. If a business day passes with **no submitted count**, a scheduled job (end-of-day cutoff,
   configurable time, e.g. 23:00 business timezone) sends an email to a **configured recipient
   list** flagging the missing submission for that date/store.
7. Users with the Cash Controller role get a **dashboard**: list/calendar of all counts,
   denomination breakdown per count, discrepancy trend over time, per-employee history, filter
   by date range/employee, export (CSV/PDF), and drill-down into an individual count's signature
   and reason.

## Data Model (Prisma — new models)
```prisma
model CashCount {
  id                String       @id @default(uuid())
  businessDate      DateTime     // date only, no time component
  employeeId        String
  employee          Employee     @relation(fields: [employeeId], references: [id])

  openingBalance     Float       // carried forward from previous day's countedAmount
  posCashSales       Float       @default(0) // copied from the daily POS report ("Bericht")
  withdrawalsTotal   Float       @default(0) // sum of withdrawals, cached for convenience
  expectedAmount     Float       // "Soll" = openingBalance + posCashSales - withdrawalsTotal
  countedAmount      Float       // sum of all denomination lines, cached for convenience
  difference         Float       // countedAmount - expectedAmount ("Kassendifferenz")

  reason             String?     // required in the API layer when difference != 0
  signatureImage      String?    // base64 PNG (or object storage URL)
  signedAt            DateTime?
  status              String     @default("DRAFT") // DRAFT | SUBMITTED
  createdByUserId     String?    // User who was logged in on the device, if applicable
  createdAt           DateTime   @default(now())
  updatedAt            DateTime  @updatedAt

  denominationCounts DenominationCount[]
  withdrawals        CashWithdrawal[]

  @@unique([businessDate, employeeId])
  @@map("cash_counts")
}

model DenominationCount {
  id          String     @id @default(uuid())
  cashCountId String
  cashCount   CashCount  @relation(fields: [cashCountId], references: [id], onDelete: Cascade)
  denomination Float     // face value, e.g. 0.01, 0.02, ... 500
  kind         String    // COIN | NOTE
  quantity     Int
  subtotal     Float     // denomination * quantity

  @@map("denomination_counts")
}

model CashWithdrawal {
  id          String     @id @default(uuid())
  cashCountId String
  cashCount   CashCount  @relation(fields: [cashCountId], references: [id], onDelete: Cascade)
  amount      Float
  purpose     String     // what the cash was taken out for (e.g. "Blumen Einkauf")
  takenAt     DateTime   @default(now())

  @@map("cash_withdrawals")
}

model CashControlSettings {
  id                 String   @id @default(uuid())
  alertRecipients    String   // comma-separated emails, or a related table if multiple businesses
  dailyCutoffTime    String   @default("23:00")
  currency           String   @default("EUR")
  discrepancyThreshold Float  @default(0)
  updatedAt          DateTime @updatedAt

  @@map("cash_control_settings")
}
```

## Business Rules
- One `CashCount` per `(businessDate, employee)` — prevent duplicate submissions.
- `openingBalance` for a given date = the most recent prior date's `countedAmount` (the actual
  counted closing figure, not its expected figure) — carried forward automatically so employees
  never re-type it. For the very first count ever entered, an admin must seed an initial balance
  (via settings or a one-time manual entry).
- `withdrawalsTotal` is always recomputed server-side as the sum of that count's
  `CashWithdrawal.amount` entries; withdrawals can be added any time before the count is
  `SUBMITTED`, each with a mandatory `purpose` note (this is what gets shown in the dashboard as
  the itemized reason cash left the till, distinct from the closing `reason` used for the
  Kassendifferenz).
- `countedAmount` is always the sum of `denominationCounts[].subtotal`; recompute server-side,
  never trust a client-sent total.
- `difference = countedAmount - expectedAmount`; sign matters (over vs. under).
- `reason` is mandatory when `difference != 0` (or beyond `discrepancyThreshold`); enforced both
  client-side (can't proceed to signature) and server-side (reject submission without it).
- Once `signatureImage` and `signedAt` are set and `status = SUBMITTED`, the record is
  **immutable** — no further edits via the API (only admins can view/export, not modify).
- Missing-submission check: a daily cron (business timezone) after the cutoff time queries for
  any active employee/store expected to submit that day with no matching `CashCount` row, and
  sends one email per missing date to `CashControlSettings.alertRecipients`.

## Backend (NestJS)
- New module `backend/src/cash-control/` with controller, service, DTOs, and a
  `@nestjs/schedule` cron provider for the missing-submission check.
- Endpoints:
  - `POST /api/cash-control/counts` — create/save a draft count
  - `PATCH /api/cash-control/counts/:id` — update denominations/reason (only while `DRAFT`)
  - `POST /api/cash-control/counts/:id/sign` — attach signature, set `SUBMITTED`
  - `GET /api/cash-control/counts` — list with filters (date range, employee, status)
  - `GET /api/cash-control/counts/:id` — full detail incl. denomination breakdown + signature
  - `GET /api/cash-control/summary` — dashboard aggregates (discrepancy trend, per-employee)
  - `GET/PATCH /api/cash-control/settings` — recipients, cutoff time, threshold (admin-only)
- Mailer: introduce `@nestjs-modules/mailer` or `nodemailer` directly (no existing mail infra in
  the codebase today) with SMTP config via env vars (`SMTP_HOST`, `SMTP_USER`, etc., added to
  `.env.example`).
- Access control: reuse the existing JWT `RolesGuard`; add a role (or reuse `ADMIN`) that gates
  the dashboard/settings endpoints. Count *submission* endpoints should be usable by any
  authenticated device/user since the "employee" is just a dropdown value, not necessarily the
  logged-in `User`.

## Frontend (React)
- New route/section `frontend/src/pages/cash-control/`:
  - `CashCountEntry.tsx` — date + employee picker → denomination grid (coins → notes) with
    running total → Kassendifferenz panel (shown once totals are entered) → reason field
    (required if difference ≠ 0) → signature pad → submit.
  - `CashControlDashboard.tsx` (admin-only route) — table/calendar of counts, filters, drill-down
    modal showing denomination breakdown, reason, and signature image; discrepancy trend chart
    (reuse Recharts, matching existing Dashboard module style).
  - `CashControlSettings.tsx` (admin-only) — manage alert recipients, cutoff time, threshold.
- Signature pad: `react-signature-canvas` (or similar), touch-enabled, "Clear" and "Save" actions,
  exported as base64 PNG on submit.
- Guard admin-only routes/pages the same way the existing app restricts pages by `role`.

## Non-Functional
- All monetary values handled in EUR cents internally (integers) to avoid floating-point drift in
  denomination sums, converting to `Float` only for display/DB if that's the existing app
  convention — confirm against how `Ingredient.unitCost` etc. are already stored.
- Audit trail: never allow deleting a `SUBMITTED` count; soft-delete only, consistent with the
  rest of the app's "Key Business Rules Enforced" (see `README.md`).
- Timezone: business date and cutoff time must use a single configured business timezone, not
  server-local time (relevant since deployment is on Railway, likely UTC).

## Confirmed decisions
1. **POS cash sales entry** — manual single-number entry, copied by eye from the daily POS
   report ("Bericht"). No POS API/export integration.
2. **Withdrawal approval** — no second-person sign-off required; any employee entering the count
   can log a till withdrawal unilaterally (amount + purpose only).
3. **One till** — single cash drawer for the whole business; no per-register/location split.
   `(businessDate, employee)` stays the uniqueness key (no till/location dimension needed).
4. **Login model (default)** — one shared/kiosk `User` login for the cash-control screen; the
   individual doing the count is picked from the `Employee` dropdown, no per-employee password.
5. **Recipients (default)** — fixed list of email addresses, editable by admins via
   `CashControlSettings` in the admin UI (not per-user configurable).
6. **Denomination set (default)** — the 8 coins + 7 notes listed above (standard EUR cash
   denominations, 1c through €500).
