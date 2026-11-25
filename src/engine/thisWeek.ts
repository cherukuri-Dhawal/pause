import type { LoanEntry } from './types'

function isoDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Returns active loans whose due date falls within [today, today+6] inclusive. */
export function getThisWeekDues(entries: LoanEntry[], today: string): LoanEntry[] {
  const todayN = isoDayNumber(today)
  const endN = todayN + 6
  return entries.filter(e => {
    if (e.status !== 'active') return false
    const dueN = isoDayNumber(e.dueDateISO)
    return dueN >= todayN && dueN <= endN
  })
}
