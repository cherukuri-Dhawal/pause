import { useState, useEffect } from 'react'
import { parsePaise } from '../engine/money'
import { cardCoverGap } from '../engine/calculations'
import { StorageManager } from '../engine/storage'
import { todayIST } from '../engine/today'
import type { CardCoverEntry } from '../engine/types'

const storage = new StorageManager()

function toPaise(s: string): number {
  if (!s.trim()) return 0
  const r = parsePaise(s)
  return r.ok ? r.paise : 0
}

function fmtRupees(paise: number): string {
  if (paise === 0) return '₹0'
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

interface Props {
  onSaved: () => void
}

export default function Screen3CardCover({ onSaved }: Props) {
  const [nickname, setNickname]     = useState('')
  const [amountStr, setAmount]      = useState('')
  const [cardDate, setCardDate]     = useState('')
  const [promiseDate, setPromise]   = useState('')
  const [draftId]                   = useState(() => nanoid())
  const [hasDraft, setHasDraft]     = useState(false)

  useEffect(() => {
    const draft = storage.loadDraft()
    if (draft && draft.type === 'card-cover') {
      const c = draft as CardCoverEntry
      setHasDraft(true)
      setNickname(c.nickname)
      setAmount(String(c.amountPaidPaise / 100))
      setCardDate(c.cardDueDate)
      setPromise(c.friendPromiseDate)
    }
  }, [])

  // Save draft on every change
  useEffect(() => {
    const amountPaidPaise = toPaise(amountStr)
    if (!nickname && !amountPaidPaise && !cardDate && !promiseDate) return
    const draft: CardCoverEntry = {
      id: draftId, type: 'card-cover',
      nickname: nickname.trim() || 'unnamed',
      amountPaidPaise,
      cardDueDate: cardDate || todayIST(),
      friendPromiseDate: promiseDate || todayIST(),
      createdAt: new Date().toISOString(),
    }
    storage.saveDraft(draft)
  }, [nickname, amountStr, cardDate, promiseDate, draftId])

  const amountPaidPaise = toPaise(amountStr)
  const hasGap = amountPaidPaise > 0 && cardDate.length === 10 && promiseDate.length === 10
  const gap = hasGap
    ? cardCoverGap({ amountPaidPaise, cardDueDate: cardDate, friendPromiseDate: promiseDate })
    : null

  const canSubmit =
    nickname.trim().length > 0 &&
    amountPaidPaise > 0 &&
    cardDate.length === 10 &&
    promiseDate.length === 10

  function handleAdd() {
    if (!canSubmit) return
    const entry: CardCoverEntry = {
      id: draftId, type: 'card-cover',
      nickname: nickname.trim(),
      amountPaidPaise,
      cardDueDate: cardDate,
      friendPromiseDate: promiseDate,
      createdAt: new Date().toISOString(),
    }
    storage.saveCardCover(entry)
    storage.clearDraft()
    onSaved()
  }

  function discardDraft() {
    storage.clearDraft()
    setHasDraft(false)
    setNickname('')
    setAmount('')
    setCardDate('')
    setPromise('')
  }

  return (
    <div className="screen">
      <h2 className="screen__title">Before I pay for someone</h2>

      {hasDraft && (
        <div className="draft-banner" role="alert">
          <span>Unfinished entry. Continue or discard?</span>
          <button className="draft-discard" type="button" onClick={discardDraft}>Discard</button>
        </div>
      )}

      <div className="form-stack">
        <div className="field">
          <label htmlFor="s3-nickname" className="field-label">Whose card are you covering?</label>
          <input
            id="s3-nickname"
            className="text-input"
            type="text"
            autoComplete="off"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. Priya, roommate"
            maxLength={40}
          />
        </div>

        <div className="field">
          <label htmlFor="s3-amount" className="field-label">Amount you paid (₹)</label>
          <div className="input-wrap">
            <span className="currency" aria-hidden="true">₹</span>
            <input
              id="s3-amount"
              className="amount-input"
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="fields-row">
          <div className="field">
            <label htmlFor="s3-carddate" className="field-label">Card due date</label>
            <input
              id="s3-carddate"
              className="text-input text-input--date"
              type="date"
              value={cardDate}
              onChange={e => setCardDate(e.target.value)}
              min={todayIST()}
            />
          </div>
          <div className="field">
            <label htmlFor="s3-promise" className="field-label">Friend's promise date</label>
            <input
              id="s3-promise"
              className="text-input text-input--date"
              type="date"
              value={promiseDate}
              onChange={e => setPromise(e.target.value)}
              min={todayIST()}
            />
          </div>
        </div>

        {gap && (
          <div className="gap-result">
            <div className="gap-result__row">
              <span className="field-label">Worst case</span>
              <span className="gap-result__value gap-result__value--lilac">
                {fmtRupees(gap.worstCasePaise)}
              </span>
            </div>
            <div className="gap-result__row">
              <span className="field-label">Gap</span>
              <span className={`gap-result__value${gap.gapDays === 0 ? ' gap-result__value--ok' : ''}`}>
                {gap.gapDays === 0
                  ? 'Promise before card due — no gap'
                  : `${gap.gapDays} day${gap.gapDays === 1 ? '' : 's'} you must cover`}
              </span>
            </div>
          </div>
        )}

        <button
          className="add-btn"
          type="button"
          disabled={!canSubmit}
          onClick={handleAdd}
        >
          Add this cover
        </button>
      </div>
    </div>
  )
}
