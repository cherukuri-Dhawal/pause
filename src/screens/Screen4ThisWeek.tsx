import { useState, useEffect } from 'react'
import { StorageManager } from '../engine/storage'
import { getThisWeekDues } from '../engine/thisWeek'
import { calculateAutopayRisk } from '../engine/autopay'
import { parsePaise } from '../engine/money'
import { todayIST } from '../engine/today'
import type { LoanEntry, CardCoverEntry } from '../engine/types'

const storage = new StorageManager()

function fmtRupees(paise: number): string {
  if (paise === 0) return '₹0'
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[m - 1]} ${y}`
}

function isOverdue(dueDateISO: string, today: string): boolean {
  return dueDateISO < today
}

interface CollisionDay {
  date: string
  loans: LoanEntry[]
  totalPaise: number
  balanceStr: string
}

export default function Screen4ThisWeek() {
  const today = todayIST()
  const [loans, setLoans]           = useState<LoanEntry[]>([])
  const [cardCovers, setCovers]     = useState<CardCoverEntry[]>([])
  const [collisions, setCollisions] = useState<CollisionDay[]>([])
  const [balances, setBalances]     = useState<Record<string, string>>({})

  function reload() {
    const allLoans = storage.loadAll()
    const allCovers = storage.loadAllCardCovers()
    setLoans(allLoans.filter(l => l.status === 'active'))
    setCovers(allCovers)

    // Build collision days
    const autopayLoans = allLoans.filter(l => l.status === 'active' && l.isAutopay)
    const payments = autopayLoans.map(l => ({ dateISO: l.dueDateISO, amountPaise: l.repayPaise }))
    const risk = calculateAutopayRisk(payments, {})
    const days: CollisionDay[] = []
    for (const [date, r] of Object.entries(risk)) {
      if (r.isCollision) {
        days.push({
          date,
          loans: autopayLoans.filter(l => l.dueDateISO === date),
          totalPaise: r.totalPaise,
          balanceStr: '',
        })
      }
    }
    days.sort((a, b) => a.date.localeCompare(b.date))
    setCollisions(days)
  }

  useEffect(() => { reload() }, [])

  function getShortfall(day: CollisionDay): number | null {
    const bs = balances[day.date] ?? ''
    if (!bs.trim()) return null
    const r = parsePaise(bs)
    if (!r.ok) return null
    return Math.max(0, day.totalPaise - r.paise)
  }

  // This week's dues (loans due in next 7 days)
  const weekDues = getThisWeekDues(loans, today)
  // All overdue loans
  const overdue = loans.filter(l => isOverdue(l.dueDateISO, today))
  // Card covers due this week (friend promise date in next 7 days)
  const weekCovers = cardCovers.filter(c => {
    const diff = (new Date(c.friendPromiseDate).getTime() - new Date(today).getTime()) / 86400000
    return diff >= 0 && diff <= 6
  })

  const hasAnything = overdue.length > 0 || weekDues.length > 0 || weekCovers.length > 0

  return (
    <div className="screen">
      <h2 className="screen__title">This week</h2>

      {!hasAnything && collisions.length === 0 && (
        <p className="week-empty">Nothing due in the next 7 days.</p>
      )}

      {overdue.length > 0 && (
        <section className="week-section">
          <h3 className="week-section__heading week-section__heading--overdue">Overdue</h3>
          {overdue.map(l => (
            <LoanRow key={l.id} loan={l} today={today} />
          ))}
        </section>
      )}

      {weekDues.length > 0 && (
        <section className="week-section">
          <h3 className="week-section__heading">Due this week</h3>
          {weekDues.map(l => (
            <LoanRow key={l.id} loan={l} today={today} />
          ))}
        </section>
      )}

      {weekCovers.length > 0 && (
        <section className="week-section">
          <h3 className="week-section__heading">Friend promised this week</h3>
          {weekCovers.map(c => (
            <div key={c.id} className="week-row">
              <div className="week-row__meta">
                <span className="week-row__name">{c.nickname}</span>
                <span className="week-row__tag week-row__tag--cover">Card cover</span>
              </div>
              <div className="week-row__right">
                <span className="week-row__amount">{fmtRupees(c.amountPaidPaise)}</span>
                <span className="week-row__date">by {fmtDate(c.friendPromiseDate)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {collisions.length > 0 && (
        <section className="week-section">
          <h3 className="week-section__heading week-section__heading--collision">Autopay collision risk</h3>
          {collisions.map(day => {
            const shortfall = getShortfall(day)
            return (
              <div key={day.date} className="collision-card">
                <div className="collision-card__header">
                  <span className="collision-card__date">{fmtDate(day.date)}</span>
                  <span className="collision-card__total">{fmtRupees(day.totalPaise)} total autopay</span>
                </div>
                <ul className="collision-card__list">
                  {day.loans.map(l => (
                    <li key={l.id}>{l.nickname} — {fmtRupees(l.repayPaise)}</li>
                  ))}
                </ul>
                <div className="collision-card__balance-row">
                  <label htmlFor={`bal-${day.date}`} className="field-label">
                    Expected balance on {fmtDate(day.date)} (₹)
                  </label>
                  <div className="input-wrap input-wrap--sm">
                    <span className="currency" aria-hidden="true">₹</span>
                    <input
                      id={`bal-${day.date}`}
                      className="amount-input"
                      type="text"
                      inputMode="decimal"
                      value={balances[day.date] ?? ''}
                      onChange={e => setBalances(prev => ({ ...prev, [day.date]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                {shortfall !== null && (
                  <p className={`collision-card__shortfall${shortfall === 0 ? ' collision-card__shortfall--ok' : ''}`}
                    aria-live="polite"
                  >
                    {shortfall === 0
                      ? 'Balance covers all autopays'
                      : `Shortfall: ${fmtRupees(shortfall)}`}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

function LoanRow({ loan, today }: { loan: LoanEntry; today: string }) {
  function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${d} ${months[m - 1]} ${y}`
  }

  const over = isOverdue(loan.dueDateISO, today)
  return (
    <div className={`week-row${over ? ' week-row--overdue' : ''}`}>
      <div className="week-row__meta">
        <span className="week-row__name">{loan.nickname}</span>
        {loan.isAutopay && <span className="week-row__tag week-row__tag--autopay">Autopay</span>}
        {over && <span className="week-row__tag week-row__tag--overdue">Overdue</span>}
      </div>
      <div className="week-row__right">
        <span className="week-row__amount">{(loan.repayPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        <span className="week-row__date">{fmtDate(loan.dueDateISO)}</span>
      </div>
    </div>
  )
}
