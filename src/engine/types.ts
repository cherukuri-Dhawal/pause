export type LoanStatus = 'active' | 'repaid'

export interface LoanEntry {
  id: string
  type: 'loan'
  status: LoanStatus
  nickname: string
  receivedPaise: number
  repayPaise: number
  dueDateISO: string
  isAutopay: boolean
  createdAt: string
  repaysLoanId?: string
}

export interface CardCoverEntry {
  id: string
  type: 'card-cover'
  nickname: string
  amountPaidPaise: number
  cardDueDate: string
  friendPromiseDate: string
  createdAt: string
}

export type Entry = LoanEntry | CardCoverEntry
