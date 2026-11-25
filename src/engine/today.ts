/** Returns today's date in IST (UTC+5:30) as YYYY-MM-DD. */
export function todayIST(): string {
  const nowMs = Date.now() + 330 * 60 * 1000 // shift to IST
  const d = new Date(nowMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
