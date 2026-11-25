import { describe, it, expect } from 'vitest'
import { chainExtraCost, detectLoop } from '../chain'
import type { LoanEntry } from '../types'

const loan = (overrides: Partial<LoanEntry> & { id: string }): LoanEntry => ({
  type: 'loan',
  status: 'active',
  nickname: 'test',
  receivedPaise: 1_000_000,
  repayPaise: 1_200_000,
  dueDateISO: '2025-12-10',
  isAutopay: false,
  createdAt: '2025-11-26',
  ...overrides,
})

describe('chainExtraCost', () => {
  it('single loan with no parent → its own extra cost', () => {
    const loans = [loan({ id: 'a', receivedPaise: 950_000, repayPaise: 1_120_000 })]
    expect(chainExtraCost('a', loans)).toBe(170_000)
  })

  it('two active loans in a chain → accumulated extra cost', () => {
    const loans = [
      loan({ id: 'a', receivedPaise: 950_000, repayPaise: 1_120_000 }),
      loan({ id: 'b', receivedPaise: 800_000, repayPaise: 950_000, repaysLoanId: 'a' }),
    ]
    // b: 150_000 + a: 170_000 = 320_000
    expect(chainExtraCost('b', loans)).toBe(320_000)
  })

  it('repaid loans are excluded from chain total', () => {
    const loans = [
      loan({ id: 'a', status: 'repaid', receivedPaise: 950_000, repayPaise: 1_120_000 }),
      loan({ id: 'b', receivedPaise: 800_000, repayPaise: 950_000, repaysLoanId: 'a' }),
    ]
    // a is repaid → only b counted: 150_000
    expect(chainExtraCost('b', loans)).toBe(150_000)
  })

  it('chain of three accumulates all active extra costs', () => {
    const loans = [
      loan({ id: 'a', receivedPaise: 1_000_000, repayPaise: 1_100_000 }),
      loan({ id: 'b', receivedPaise: 900_000, repayPaise: 1_000_000, repaysLoanId: 'a' }),
      loan({ id: 'c', receivedPaise: 800_000, repayPaise: 900_000, repaysLoanId: 'b' }),
    ]
    // 100_000 + 100_000 + 100_000 = 300_000
    expect(chainExtraCost('c', loans)).toBe(300_000)
  })

  it('loan with received > repay contributes 0 to chain (not negative)', () => {
    const loans = [
      loan({ id: 'a', receivedPaise: 1_200_000, repayPaise: 1_000_000 }),
      loan({ id: 'b', receivedPaise: 900_000, repayPaise: 1_000_000, repaysLoanId: 'a' }),
    ]
    // a: 0 (not negative) + b: 100_000 = 100_000
    expect(chainExtraCost('b', loans)).toBe(100_000)
  })

  it('chain with a loop → returns null to signal broken chain', () => {
    const loans = [
      loan({ id: 'a', repaysLoanId: 'b' }),
      loan({ id: 'b', repaysLoanId: 'a' }),
    ]
    expect(chainExtraCost('a', loans)).toBeNull()
  })

  it('id not found → returns null', () => {
    expect(chainExtraCost('missing', [])).toBeNull()
  })
})

describe('detectLoop', () => {
  it('direct loop A→B→A → detected', () => {
    const loans = [
      loan({ id: 'a', repaysLoanId: 'b' }),
      loan({ id: 'b', repaysLoanId: 'a' }),
    ]
    expect(detectLoop('a', loans)).toBe(true)
    expect(detectLoop('b', loans)).toBe(true)
  })

  it('three-node loop A→B→C→A → detected from any entry', () => {
    const loans = [
      loan({ id: 'a', repaysLoanId: 'c' }),
      loan({ id: 'b', repaysLoanId: 'a' }),
      loan({ id: 'c', repaysLoanId: 'b' }),
    ]
    expect(detectLoop('a', loans)).toBe(true)
    expect(detectLoop('b', loans)).toBe(true)
    expect(detectLoop('c', loans)).toBe(true)
  })

  it('straight chain of three → no loop', () => {
    const loans = [
      loan({ id: 'a' }),
      loan({ id: 'b', repaysLoanId: 'a' }),
      loan({ id: 'c', repaysLoanId: 'b' }),
    ]
    expect(detectLoop('a', loans)).toBe(false)
    expect(detectLoop('b', loans)).toBe(false)
    expect(detectLoop('c', loans)).toBe(false)
  })

  it('loan with no parent → no loop', () => {
    const loans = [loan({ id: 'a' })]
    expect(detectLoop('a', loans)).toBe(false)
  })

  it('id not found → false (nothing to loop)', () => {
    expect(detectLoop('missing', [])).toBe(false)
  })
})
