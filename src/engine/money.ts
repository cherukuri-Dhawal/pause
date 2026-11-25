const MAX_PAISE = 100_000_000_00 // 10 crore rupees in paise

export type ParseResult =
  | { ok: true; paise: number }
  | { ok: false; error: string }

/** Parse user-entered rupee string (e.g. "9500.50") into whole paise. */
export function parsePaise(raw: string): ParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: false, error: 'Amount cannot be blank.' }

  const n = Number(trimmed)
  if (!Number.isFinite(n)) return { ok: false, error: 'Enter a valid number.' }
  if (n < 0) return { ok: false, error: 'Amount cannot be negative.' }
  if (n > MAX_PAISE / 100) {
    return { ok: false, error: 'Amount is too large.' }
  }

  // Round to nearest paise to absorb floating-point fuzz from user input
  const paise = Math.round(n * 100)
  return { ok: true, paise }
}

/** Format whole paise as a rupee string, e.g. 170000 → "1,700.00" */
export function formatRupees(paise: number): string {
  const rupees = paise / 100
  return rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
