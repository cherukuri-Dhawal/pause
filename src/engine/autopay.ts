export interface AutopayDayRisk {
  totalPaise: number
  shortfallPaise: number
  isCollision: boolean
}

export function calculateAutopayRisk(
  payments: { dateISO: string; amountPaise: number }[],
  expectedBalances: Record<string, number>,
): Record<string, AutopayDayRisk> {
  const grouped: Record<string, { totalPaise: number; count: number }> = {}

  for (const p of payments) {
    if (!grouped[p.dateISO]) grouped[p.dateISO] = { totalPaise: 0, count: 0 }
    grouped[p.dateISO].totalPaise += p.amountPaise
    grouped[p.dateISO].count += 1
  }

  const result: Record<string, AutopayDayRisk> = {}
  for (const [date, { totalPaise, count }] of Object.entries(grouped)) {
    const balance = expectedBalances[date]
    const shortfallPaise = balance !== undefined ? Math.max(0, totalPaise - balance) : 0
    result[date] = { totalPaise, shortfallPaise, isCollision: count >= 2 }
  }
  return result
}
