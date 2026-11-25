# Pause — Project Brief & Hard Rules

## What this is

Pause is a local-only financial clarity tool. Before someone borrows or covers a purchase for another person, it shows the worst case in rupees: extra loan cost, upcoming cash pressure, the repayment chain, and autopay collision risk. It never touches actual money.

## Hard rules (non-negotiable)

### Privacy & data
1. Everything stays on the device. No backend, no accounts, no analytics, no third-party scripts, no network calls after the page loads. The app must work fully offline.
2. Never ask for card numbers, CVV, account numbers, UPI IDs, OTPs, phone numbers, or full names. Users type a nickname only.
3. No SMS, contacts, location, or gallery access.
4. The "show someone I trust" summary is a screen-readable view only — never a generated shareable link.
5. Nothing stored outside localStorage (no sessionStorage, IndexedDB, cookies).
6. User-entered text must never be rendered as a clickable anchor tag.

### What the app does and does not do
7. The app never lends, collects, or cancels an autopay. It only records and calculates.
8. A delete-all button must wipe everything: all localStorage keys the app wrote, all in-memory state, all drafts. It shows a plain-language confirmation before acting.

### Draft / unfinished entry rule
9. An unfinished entry is never counted in any total. On reload, it shows "Unfinished entry. Continue or discard?" in a separate draft slot. At most one draft exists at a time.

### Tone & design
10. No betting or gambling wording or visuals.
11. No confetti, flashing red, urgency timers, streaks, or shame language.
12. The tone is calm and plain.
13. All live animations must respect `prefers-reduced-motion`.

## Who uses this
Stressed, tired young people on a mid-range Android phone. Mobile-first. Simple and fast above all.

## Tech stack
- Vite + React + TypeScript
- Vitest (unit tests in `src/engine/__tests__/`)
- Playwright (privacy/e2e tests in `e2e/`)
- localStorage for persistence
- Framer Motion for animation (added in a later step, reduced-motion respected from day one)

## Money and dates
- All money stored and calculated as whole paise (1 rupee = 100 paise). Never use floating point for money.
- Dates are plain calendar dates (`YYYY-MM-DD`) in India time (IST = UTC+5:30).
- Functions that depend on "today" accept an injectable `today: string` parameter so tests can pass a fixed date.

## npm scripts
- `npm run check` — runs TypeScript type-check, all unit tests, and all privacy/e2e tests. Must pass clean before any merge.
