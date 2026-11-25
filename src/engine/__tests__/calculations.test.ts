import { describe, it, expect } from 'vitest'
import { loanExtraCost, cardCoverGap } from '../calculations'

describe('loanExtraCost', () => {
  it('REQUIRED CASE 1: received 9500, repay 11200 → extra 1700, no yearly rate', () => {
    const r = loanExtraCost({ receivedPaise: 950_000, repayPaise: 1_120_000 })
    expect(r.extraCostPaise).toBe(170_000)
    expect(r.yearlyRate).toBeUndefined()
  })

  it('received equals repay → extra cost zero', () => {
    const r = loanExtraCost({ receivedPaise: 500_000, repayPaise: 500_000 })
    expect(r.extraCostPaise).toBe(0)
  })

  it('received exceeds repay → extra cost zero, not negative', () => {
    const r = loanExtraCost({ receivedPaise: 600_000, repayPaise: 500_000 })
    expect(r.extraCostPaise).toBe(0)
  })

  it('small loan: received 500, repay 600 → extra 100', () => {
    const r = loanExtraCost({ receivedPaise: 50_000, repayPaise: 60_000 })
    expect(r.extraCostPaise).toBe(10_000)
  })
})

describe('cardCoverGap', () => {
  it('REQUIRED CASE 2a: due 5 Dec, friend promises 15 Dec → worst case 40000, gap 10 days', () => {
    const r = cardCoverGap({
      amountPaidPaise: 4_000_000,
      cardDueDate: '2025-12-05',
      friendPromiseDate: '2025-12-15',
    })
    expect(r.worstCasePaise).toBe(4_000_000)
    expect(r.gapDays).toBe(10)
  })

  it('REQUIRED CASE 2b: friend promises before due date → worst case 40000, gap 0', () => {
    const r = cardCoverGap({
      amountPaidPaise: 4_000_000,
      cardDueDate: '2025-12-15',
      friendPromiseDate: '2025-12-05',
    })
    expect(r.worstCasePaise).toBe(4_000_000)
    expect(r.gapDays).toBe(0)
  })

  it('friend promises on the same day as due → gap 0', () => {
    const r = cardCoverGap({
      amountPaidPaise: 4_000_000,
      cardDueDate: '2025-12-05',
      friendPromiseDate: '2025-12-05',
    })
    expect(r.gapDays).toBe(0)
  })

  it('worst case is always the full amount paid, regardless of gap', () => {
    const r = cardCoverGap({
      amountPaidPaise: 1_500_000,
      cardDueDate: '2025-12-10',
      friendPromiseDate: '2025-12-20',
    })
    expect(r.worstCasePaise).toBe(1_500_000)
    expect(r.gapDays).toBe(10)
  })
})
