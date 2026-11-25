/** Returns the number of whole days since an arbitrary epoch for a YYYY-MM-DD string. */
function isoDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export interface LoanExtraCostResult {
  extraCostPaise: number
  yearlyRate?: number
}

export function loanExtraCost({
  receivedPaise,
  repayPaise,
}: {
  receivedPaise: number
  repayPaise: number
}): LoanExtraCostResult {
  return { extraCostPaise: Math.max(0, repayPaise - receivedPaise) }
}

export interface CardCoverGapResult {
  worstCasePaise: number
  gapDays: number
}

export function cardCoverGap({
  amountPaidPaise,
  cardDueDate,
  friendPromiseDate,
}: {
  amountPaidPaise: number
  cardDueDate: string
  friendPromiseDate: string
}): CardCoverGapResult {
  const gapDays = Math.max(0, isoDayNumber(friendPromiseDate) - isoDayNumber(cardDueDate))
  return { worstCasePaise: amountPaidPaise, gapDays }
}
