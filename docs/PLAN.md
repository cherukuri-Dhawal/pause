# Build Plan

## Draft / unfinished entry rule (agreed)
An unfinished entry is never counted in any total. On reload, the app shows "Unfinished entry. Continue or discard?" in a separate draft slot. At most one draft exists at a time. "Saved" and "in progress" are distinct states.

---

## Step 1 — Data model, calculations, storage, tests (current)

**Goals:** establish the foundation everything else sits on. No UI yet.

- All money as whole paise (`number`, integers only). No floating point anywhere.
- Dates as `YYYY-MM-DD` strings in IST. No `Date` arithmetic across midnight.
- Injectable `today: string` on every function that uses the current date.
- Loan status: `active | repaid`. Repaid loans are excluded from "this week" totals and chain extra-cost totals.
- Entry types: `loan` and `card-cover`.

**Modules (`src/engine/`):**
- `types.ts` — all shared types (`LoanEntry`, `CardCoverEntry`, `Entry`, `LoanStatus`)
- `calculations.ts` — `loanExtraCost`, `cardCoverGap`
- `chain.ts` — `chainExtraCost`, `detectLoop`
- `autopay.ts` — `calculateAutopayRisk`
- `thisWeek.ts` — `getThisWeekDues` (today through today+6 days inclusive)
- `storage.ts` — `StorageManager` (localStorage wrapper; draft separate from confirmed)

**Edge cases covered by tests:**
- `received > repay` → `extraCostPaise` is 0, not negative
- Deleting a loan that other loans point to via `repaysLoanId` → children are orphaned (field cleared)
- Loop in the chain (A → B → A) → `detectLoop` returns `true`; `chainExtraCost` does not hang

**Privacy test suite (`e2e/privacy.test.ts`):**
- No network requests after initial page load
- App works fully offline
- Nothing stored outside localStorage (no sessionStorage, IndexedDB, cookies)
- No third-party scripts loaded
- User-entered text never rendered as a clickable anchor

**`npm run check`:** `tsc --noEmit && vitest run && playwright test`

---

## Step 2 — Single loan entry, delete-all, 10-second Add delay

- Four-field form: amount received, amount to repay, due date, autopay toggle.
- Output: extra cost in rupees, amounts due this week.
- Delete-all wired to both localStorage and React state; plain-language confirmation.
- Add button disabled for 10 seconds after form opens (behaviour, no animation yet).
- Mobile-first layout.

---

## Step 3 — Loan list and chain view

- Linking loans via "this repays loan X" one-tap selector.
- Chain display: list of linked loans with per-loan and cumulative extra cost.
- Repaid status toggle.

---

## Step 4 — Autopay collision warning

- Autopay toggle on each loan (from step 2).
- Optional expected balance for a given date.
- Same-day collision warning with shortfall in rupees.

---

## Step 5 — Card/friend scenario

- Separate entry type (`card-cover`).
- Fields: amount paid, card due date, friend's promise date.
- Output: worst case (full amount), gap in days.

---

## Step 6 — "This week" view, "show someone I trust" summary, help screen, first-run privacy note

- This week: loans and autopays due in the next 6 days.
- Trusted summary: screen-readable view, never a link.
- Help screen: plain explanations of each number.
- First-run note: one sentence explaining nothing leaves the device, with a dismiss.
- Help screen footer credit (condensed-mono label style, plain text only, no links, no network requests):
  Line 1: "Built by Cherukuri Dhawal for the Groww product case study."
  Line 2 (smaller): "Not affiliated with or endorsed by Groww."
  No Groww logo, no Groww colours, no external anchors.

---

## Step 7 — Framer Motion animations

- Added last, after all features are correct.
- `useReducedMotion` checked on every animated component from the first line written.
- No flashing, no urgency cues.

---

## Step 8 — Playwright smoke test (full flow)

- One test: enter a loan chain, verify chain total is visible and correct.
