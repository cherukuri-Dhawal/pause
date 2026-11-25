import { describe, it, expect } from 'vitest'
import { calculateAutopayRisk } from '../autopay'

describe('calculateAutopayRisk', () => {
  it('REQUIRED CASE 3: shortfall 1500 on 5th, none on 7th', () => {
    const payments = [
      { dateISO: '2025-12-05', amountPaise: 200_000 },
      { dateISO: '2025-12-05', amountPaise: 350_000 },
      { dateISO: '2025-12-07', amountPaise: 100_000 },
    ]
    const expectedBalances: Record<string, number> = {
      '2025-12-05': 400_000,
    }
    const risk = calculateAutopayRisk(payments, expectedBalances)

    expect(risk['2025-12-05'].totalPaise).toBe(550_000)
    expect(risk['2025-12-05'].shortfallPaise).toBe(150_000)
    expect(risk['2025-12-07'].totalPaise).toBe(100_000)
    expect(risk['2025-12-07'].shortfallPaise).toBe(0)
  })

  it('two autopays on the same day → collision flag true', () => {
    const payments = [
      { dateISO: '2025-12-05', amountPaise: 200_000 },
      { dateISO: '2025-12-05', amountPaise: 350_000 },
    ]
    const risk = calculateAutopayRisk(payments, {})
    expect(risk['2025-12-05'].isCollision).toBe(true)
  })

  it('single autopay on a day → not a collision', () => {
    const payments = [{ dateISO: '2025-12-05', amountPaise: 200_000 }]
    const risk = calculateAutopayRisk(payments, {})
    expect(risk['2025-12-05'].isCollision).toBe(false)
  })

  it('no expected balance specified for a date → shortfall is zero', () => {
    const payments = [{ dateISO: '2025-12-10', amountPaise: 300_000 }]
    const risk = calculateAutopayRisk(payments, {})
    expect(risk['2025-12-10'].shortfallPaise).toBe(0)
  })

  it('expected balance exactly covers total → shortfall is zero', () => {
    const payments = [
      { dateISO: '2025-12-05', amountPaise: 200_000 },
      { dateISO: '2025-12-05', amountPaise: 300_000 },
    ]
    const risk = calculateAutopayRisk(payments, { '2025-12-05': 500_000 })
    expect(risk['2025-12-05'].shortfallPaise).toBe(0)
  })

  it('empty payments → empty result', () => {
    const risk = calculateAutopayRisk([], {})
    expect(Object.keys(risk)).toHaveLength(0)
  })
})
