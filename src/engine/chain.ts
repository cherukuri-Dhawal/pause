import type { LoanEntry } from './types'
import { loanExtraCost } from './calculations'

export function detectLoop(startId: string, loans: LoanEntry[]): boolean {
  const map = new Map(loans.map(l => [l.id, l]))
  const visited = new Set<string>()
  let current: string | undefined = startId
  while (current !== undefined) {
    if (visited.has(current)) return true
    visited.add(current)
    const loan = map.get(current)
    if (!loan) return false
    current = loan.repaysLoanId
  }
  return false
}

/**
 * Returns the sum of extra costs for all active loans in the chain starting at
 * startId and following repaysLoanId links. Returns null if the chain has a
 * loop or if startId is not found.
 */
export function chainExtraCost(startId: string, loans: LoanEntry[]): number | null {
  if (detectLoop(startId, loans)) return null
  const map = new Map(loans.map(l => [l.id, l]))
  if (!map.has(startId)) return null

  let total = 0
  let current: string | undefined = startId
  while (current !== undefined) {
    const loan = map.get(current)
    if (!loan) break
    if (loan.status === 'active') {
      total += loanExtraCost({ receivedPaise: loan.receivedPaise, repayPaise: loan.repayPaise }).extraCostPaise
    }
    current = loan.repaysLoanId
  }
  return total
}
