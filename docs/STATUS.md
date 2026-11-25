# Pause — Build Status

_Last updated: 2026-11-26_

---

## Engine layer (Step 1)

| Module | Status | Proof |
|---|---|---|
| `types.ts` — LoanEntry, CardCoverEntry, Entry, LoanStatus | **DONE** | `tsc -b` clean |
| `calculations.ts` — loanExtraCost, cardCoverGap | **DONE** | 8 unit tests pass |
| `chain.ts` — chainExtraCost, detectLoop | **DONE** | 13 unit tests pass |
| `autopay.ts` — calculateAutopayRisk | **DONE** | 6 unit tests pass |
| `thisWeek.ts` — getThisWeekDues | **DONE** | 8 unit tests pass |
| `storage.ts` — StorageManager | **DONE** | 12 unit tests pass |
| `money.ts` — parsePaise, formatRupees | **DONE** | No tests yet — Step 2 |
| `today.ts` — todayIST | **DONE** | No tests yet — Step 2 |
| **Total unit tests** | **47 / 47 pass** | `npx vitest run` |
| Production build (`npm run build`) | **DONE** | Outputs `dist/` cleanly, 297 ms |

---

## Privacy / e2e tests (Playwright)

E2e tests run against the Vite dev server (`npm run dev`) at `http://localhost:5173`. Playwright starts it automatically before each run. Chromium binary lives on D:\playwright-browsers (installed manually due to C: space constraint — must set `PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers` to run).

### Break/fix results

| Test | Rule broken | How | Did it fail? |
|---|---|---|---|
| no network requests after page load | Added `fetch('https://example.com/ping')` on button click (triggered by test interaction) | Button labelled "Add loan" with fetch on click | **YES** — caught `https://example.com/ping` |
| app is usable while offline | N/A — structurally hollow | `page.reload()` failure is swallowed; `body` is always visible from pre-offline render | **Cannot fail** — hollow test |
| nothing stored outside localStorage | Added `sessionStorage.setItem('pause-violation','test')` in useEffect | Direct sessionStorage write on mount | **YES** — caught `["pause-violation"]` |
| no third-party scripts loaded | Added `<script src="https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js">` to index.html | CDN script tag in HTML | **YES** — caught `["https://cdn.jsdelivr.net/..."]` |
| user-entered text never a clickable link | N/A — hollow until UI exists | Nickname input not visible yet; `if (isVisible())` guard skips the entire test body | **Cannot fail yet** — hollow until Step 2 UI |

### Note on test 1 (network)
A fetch fired during component mount (before `waitForLoadState('networkidle')`) is **not caught** — the listener is registered after networkidle, so early fetches are invisible to it. The test only catches fetches triggered by user interaction after load. This is a gap: a rogue analytics call in a useEffect on mount would pass undetected.

---

## UI screens

| Screen / Element | Status | Proof |
|---|---|---|
| Screen 1 — headline, live inputs, bar, extra cost | **DONE** | Screenshots in docs/screens/; tsc + vitest + playwright all pass |
| Ambient arcs (Calm mode off) | **DONE** | Visible in desktop screenshot |
| Calm mode switch | **DONE** | Rendered; pauses animation |
| prefers-reduced-motion respected | **DONE** | CSS + JS both checked |
| Self-hosted fonts (Outfit, Space Mono) | **DONE** | Bundled via @fontsource, visible in build output |
| Add loan form (10-second ring, chain, autopay) | **DONE** | Screenshot s2-borrow-mobile.png; ₹1,700 test case confirmed |
| Before I pay for someone (card cover) | **DONE** | Screenshot s3-cover-mobile.png; 10-day gap confirmed |
| This week view (loans, overdue, collision) | **DONE** | Screenshot s4-week-collision.png; ₹1,500 shortfall confirmed |
| Autopay collision warning with balance input | **DONE** | Wired to calculateAutopayRisk |
| Delete-all press-and-hold (1.5s ring) | **DONE** | Screen5More.tsx with confirm dialog |
| Help / About screen + footer credit | **DONE** | "Built by Cherukuri Dhawal…" in about-footer |
| First-run privacy note | **DONE** | PrivacyNote overlay, dismissed to pause:privacy-dismissed |
| Bottom navigation (Home/Borrow/Cover/Week/More) | **DONE** | Five-tab nav, aria-current, reduced-motion respected |
| "Show someone I trust" summary | NOT STARTED | — |
| Dashboard — owed ring, 14-day bars | NOT STARTED | — |

---

## Three biggest risks before ship

1. **Two privacy tests are hollow.** The offline test (test 2) cannot detect a network-dependent app — `body` is always visible. The anchor test (test 5) is skipped entirely until the UI is built. Both need to be strengthened before the test suite can be called a real privacy guard. The network test (test 1) also misses fetches fired at mount.

2. **`parsePaise` is untested and unwired.** It is the only boundary between user strings and engine integers. If the form bypasses it and uses `Number(input)` directly, floating-point money errors enter the engine silently. This is the highest correctness risk and should be the first thing proved in Step 2.

3. **Playwright requires a manual env var and D: drive binary.** `npm run check` will silently fail on any machine without `PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers` set. CI or a collaborator running the check will see broken tests that have nothing to do with the code. This should be fixed before any handoff — either add the env var to a `.env.test` file or set it in `playwright.config.ts` via `process.env`.
