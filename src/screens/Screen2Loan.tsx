import { useState, useEffect, useRef } from 'react'
import { parsePaise } from '../engine/money'
import { loanExtraCost } from '../engine/calculations'
import { detectLoop } from '../engine/chain'
import { StorageManager } from '../engine/storage'
import { todayIST } from '../engine/today'
import type { LoanEntry } from '../engine/types'

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

// 10-second press-and-hold ring button
function HoldButton({ onCommit, label, disabled }: { onCommit: () => void; label: string; disabled: boolean }) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const HOLD_MS = 10000

  function startHold() {
    if (disabled) return
    startRef.current = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / HOLD_MS, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onCommit()
        setProgress(0)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function cancelHold() {
    cancelAnimationFrame(rafRef.current)
    setProgress(0)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const r = 20
  const circ = 2 * Math.PI * r
  const dash = circ * progress

  return (
    <button
      className={`hold-btn${disabled ? ' hold-btn--disabled' : ''}`}
      type="button"
      aria-label={`${label} — hold for 10 seconds to confirm`}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={e => { e.preventDefault(); startHold() }}
      onTouchEnd={cancelHold}
      disabled={disabled}
    >
      <svg className="hold-btn__ring" viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <circle
          cx="25" cy="25" r={r} fill="none"
          stroke="var(--teal)" strokeWidth="2"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 25 25)"
        />
      </svg>
      <span className="hold-btn__label">{label}</span>
    </button>
  )
}

interface Props {
  onSaved: () => void
}

export default function Screen2Loan({ onSaved }: Props) {
  const [nickname, setNickname]     = useState('')
  const [receivedStr, setReceived]  = useState('')
  const [repayStr, setRepay]        = useState('')
  const [dueDate, setDueDate]       = useState('')
  const [isAutopay, setAutopay]     = useState(false)
  const [repaysId, setRepaysId]     = useState('')
  const [existingLoans, setLoans]   = useState<LoanEntry[]>([])
  const [draftId]                   = useState(() => nanoid())
  const [saved, setSaved]           = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')
  const [hasDraft, setHasDraft]     = useState(false)

  // Load existing loans for chain selector
  useEffect(() => {
    setLoans(storage.loadAll().filter(l => l.status === 'active'))
    // Check for existing loan draft
    const draft = storage.loadDraft()
    if (draft && draft.type === 'loan') {
      const l = draft as LoanEntry
      setHasDraft(true)
      setNickname(l.nickname)
      setReceived(String(l.receivedPaise / 100))
      setRepay(String(l.repayPaise / 100))
      setDueDate(l.dueDateISO)
      setAutopay(l.isAutopay)
      setRepaysId(l.repaysLoanId ?? '')
    }
  }, [])

  // Save draft on every change
  useEffect(() => {
    if (saved) return
    const receivedPaise = toPaise(receivedStr)
    const repayPaise    = toPaise(repayStr)
    if (!nickname && !receivedPaise && !repayPaise && !dueDate) return
    const draft: LoanEntry = {
      id: draftId, type: 'loan', status: 'active',
      nickname: nickname.trim() || 'unnamed',
      receivedPaise, repayPaise,
      dueDateISO: dueDate || todayIST(),
      isAutopay, createdAt: new Date().toISOString(),
      ...(repaysId ? { repaysLoanId: repaysId } : {}),
    }
    storage.saveDraft(draft)
  }, [nickname, receivedStr, repayStr, dueDate, isAutopay, repaysId, saved, draftId])

  const receivedPaise = toPaise(receivedStr)
  const repayPaise    = toPaise(repayStr)
  const { extraCostPaise } = loanExtraCost({ receivedPaise, repayPaise })

  const canSubmit =
    nickname.trim().length > 0 &&
    receivedPaise > 0 &&
    repayPaise > 0 &&
    dueDate.length === 10

  function handleCommit() {
    if (!canSubmit) return
    setErrorMsg('')

    const allLoans = storage.loadAll()
    if (repaysId) {
      const hypothetical: LoanEntry = {
        id: draftId, type: 'loan', status: 'active',
        nickname: nickname.trim(), receivedPaise, repayPaise,
        dueDateISO: dueDate, isAutopay, createdAt: new Date().toISOString(),
        repaysLoanId: repaysId,
      }
      if (detectLoop(draftId, [...allLoans, hypothetical])) {
        setErrorMsg('This would create a repayment loop. Choose a different loan or leave blank.')
        return
      }
    }

    const entry: LoanEntry = {
      id: draftId, type: 'loan', status: 'active',
      nickname: nickname.trim(), receivedPaise, repayPaise,
      dueDateISO: dueDate, isAutopay, createdAt: new Date().toISOString(),
      ...(repaysId ? { repaysLoanId: repaysId } : {}),
    }
    storage.saveLoan(entry)
    storage.clearDraft()
    setSaved(true)
    onSaved()
  }

  function discardDraft() {
    storage.clearDraft()
    setHasDraft(false)
    setNickname('')
    setReceived('')
    setRepay('')
    setDueDate('')
    setAutopay(false)
    setRepaysId('')
  }

  return (
    <div className="screen">
      <h2 className="screen__title">Before I borrow</h2>

      {hasDraft && (
        <div className="draft-banner" role="alert">
          <span>Unfinished entry. Continue or discard?</span>
          <button className="draft-discard" type="button" onClick={discardDraft}>Discard</button>
        </div>
      )}

      <div className="form-stack">
        <div className="field">
          <label htmlFor="s2-nickname" className="field-label">Nickname for this loan</label>
          <input
            id="s2-nickname"
            className="text-input"
            type="text"
            autoComplete="off"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. rent shortfall"
            maxLength={40}
          />
        </div>

        <div className="fields-row">
          <div className="field">
            <label htmlFor="s2-received" className="field-label">You receive (₹)</label>
            <div className="input-wrap">
              <span className="currency" aria-hidden="true">₹</span>
              <input
                id="s2-received"
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={receivedStr}
                onChange={e => setReceived(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="s2-repay" className="field-label">You repay (₹)</label>
            <div className="input-wrap">
              <span className="currency" aria-hidden="true">₹</span>
              <input
                id="s2-repay"
                className="amount-input"
                type="text"
                inputMode="decimal"
                value={repayStr}
                onChange={e => setRepay(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {receivedPaise > 0 && repayPaise > 0 && (
          <div className="inline-result">
            <span className="field-label">Extra cost</span>
            <span className={`inline-result__value${extraCostPaise === 0 ? ' inline-result__value--ok' : ''}`}>
              {fmtRupees(extraCostPaise)}
            </span>
          </div>
        )}

        <div className="field">
          <label htmlFor="s2-due" className="field-label">Due date</label>
          <input
            id="s2-due"
            className="text-input text-input--date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={todayIST()}
          />
        </div>

        <div className="field field--row">
          <span className="field-label">Autopay?</span>
          <button
            className={`toggle-btn${isAutopay ? ' toggle-btn--on' : ''}`}
            type="button"
            role="switch"
            aria-checked={isAutopay}
            onClick={() => setAutopay(v => !v)}
          >
            {isAutopay ? 'Yes' : 'No'}
          </button>
        </div>

        {existingLoans.length > 0 && (
          <div className="field">
            <label htmlFor="s2-chain" className="field-label">Does this repay an earlier loan?</label>
            <select
              id="s2-chain"
              className="text-input"
              value={repaysId}
              onChange={e => setRepaysId(e.target.value)}
            >
              <option value="">No, it's a new loan</option>
              {existingLoans.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nickname} — {fmtRupees(l.repayPaise)} due {l.dueDateISO}
                </option>
              ))}
            </select>
          </div>
        )}

        {errorMsg && <p className="form-error" role="alert">{errorMsg}</p>}

        <p className="hold-hint">Hold the button for 10 seconds to add this loan.</p>

        <HoldButton
          label="Add this loan"
          disabled={!canSubmit}
          onCommit={handleCommit}
        />
      </div>
    </div>
  )
}
