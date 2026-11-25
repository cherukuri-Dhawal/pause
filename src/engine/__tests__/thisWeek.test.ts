import { describe, it, expect } from 'vitest'
import { getThisWeekDues } from '../thisWeek'
import type { LoanEntry } from '../types'

const loan = (
  id: string,
  dueDateISO: string,
  status: 'active' | 'repaid' = 'active',
): LoanEntry => ({
  id,
  type: 'loan',
  status,
  nickname: 'test',
  receivedPaise: 950_000,
  repayPaise: 1_120_000,
  dueDateISO,
  isAutopay: false,
  createdAt: '2025-11-26',
})

describe('getThisWeekDues', () => {
  const TODAY = '2025-12-01'

  it('includes loan due today', () => {
    const result = getThisWeekDues([loan('a', '2025-12-01')], TODAY)
    expect(result.map(l => l.id)).toContain('a')
  })

  it('includes loan due in 6 days (last day of the window)', () => {
    const result = getThisWeekDues([loan('a', '2025-12-07')], TODAY)
    expect(result.map(l => l.id)).toContain('a')
  })

  it('excludes loan due in 7 days (outside window)', () => {
    const result = getThisWeekDues([loan('a', '2025-12-08')], TODAY)
    expect(result.map(l => l.id)).not.toContain('a')
  })

  it('excludes loan due yesterday (overdue)', () => {
    const result = getThisWeekDues([loan('a', '2025-11-30')], TODAY)
    expect(result.map(l => l.id)).not.toContain('a')
  })

  it('excludes repaid loans even if due this week', () => {
    const result = getThisWeekDues([loan('a', '2025-12-03', 'repaid')], TODAY)
    expect(result).toHaveLength(0)
  })

  it('returns multiple active loans due this week', () => {
    const result = getThisWeekDues(
      [
        loan('a', '2025-12-01'),
        loan('b', '2025-12-04'),
        loan('c', '2025-12-07'),
        loan('d', '2025-12-08'), // outside
      ],
      TODAY,
    )
    expect(result.map(l => l.id)).toEqual(['a', 'b', 'c'])
  })

  it('empty input → empty output', () => {
    expect(getThisWeekDues([], TODAY)).toHaveLength(0)
  })
})
