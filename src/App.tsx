import { useState, useEffect, useRef } from 'react'
import { parsePaise } from './engine/money'
import { loanExtraCost } from './engine/calculations'
import Screen2Loan from './screens/Screen2Loan'
import Screen3CardCover from './screens/Screen3CardCover'
import Screen4ThisWeek from './screens/Screen4ThisWeek'
import Screen5More from './screens/Screen5More'
import { PrivacyNote } from './screens/Screen5More'
import '@fontsource/outfit/200.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/space-mono/400.css'
import './App.css'

type Tab = 'home' | 'borrow' | 'cover' | 'week' | 'more'

// ── animated number counter ───────────────────────────────────────────────────
function useAnimatedPaise(target: number, animate: boolean): number {
  const [displayed, setDisplayed] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!animate) {
      cancelAnimationFrame(rafRef.current)
      fromRef.current = target
      setDisplayed(target)
      return
    }
    const from = fromRef.current
    if (from === target) return
    cancelAnimationFrame(rafRef.current)
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 300, 1)
      const ease = 1 - (1 - t) ** 3
      const v = Math.round(from + (target - from) * ease)
      fromRef.current = v
      setDisplayed(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, animate])

  return displayed
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function fmtRupees(paise: number): string {
  if (paise === 0) return '₹0'
  return '₹' + (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function AmbientBackground({ paused }: { paused: boolean }) {
  return (
    <div className={paused ? 'ambient ambient--paused' : 'ambient'} aria-hidden="true">
      <svg
        className="ambient__svg"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse className="ambient__arc"
          cx="390" cy="-30" rx="310" ry="260"
          fill="none" stroke="#1FB5A8" strokeWidth="1" opacity="0.13"
        />
        <ellipse className="ambient__arc"
          cx="-30" cy="780" rx="370" ry="290"
          fill="none" stroke="#D9A8F0" strokeWidth="0.8" opacity="0.1"
        />
        <ellipse className="ambient__arc"
          cx="430" cy="520" rx="230" ry="210"
          fill="none" stroke="#1FB5A8" strokeWidth="0.6" opacity="0.08"
        />
      </svg>
    </div>
  )
}

function toPaise(s: string): number {
  if (!s) return 0
  const r = parsePaise(s)
  return r.ok ? r.paise : 0
}

// ── Screen 1 — home calculator ────────────────────────────────────────────────
function HomeScreen({ onAddLoan, calmMode, setCalmMode }: {
  onAddLoan: () => void
  calmMode: boolean
  setCalmMode: (v: boolean | ((p: boolean) => boolean)) => void
}) {
  const [receivedStr, setReceivedStr] = useState('')
  const [repayStr,    setRepayStr]    = useState('')
  const prefersReduced = usePrefersReducedMotion()
  const shouldAnimate  = !calmMode && !prefersReduced

  const receivedPaise = toPaise(receivedStr)
  const repayPaise    = toPaise(repayStr)
  const { extraCostPaise } = loanExtraCost({ receivedPaise, repayPaise })

  const displayedCost = useAnimatedPaise(extraCostPaise, shouldAnimate)

  const hasRepay    = repayPaise > 0
  const receivedPct = hasRepay ? Math.min(100, (receivedPaise / repayPaise) * 100) : 0
  const extraPct    = hasRepay ? (extraCostPaise / repayPaise) * 100 : 0

  return (
    <>
      <AmbientBackground paused={!shouldAnimate} />
      <main className="main">
        <header>
          <span className="app-name">Pause</span>
        </header>

        <h1 className="headline">
          See the <em>worst case</em><br />
          in rupees—before<br />
          you commit.
        </h1>

        <section aria-label="Loan amounts">
          <div className="inputs">
            <div>
              <label htmlFor="received" className="field-label">You receive</label>
              <div className="input-wrap">
                <span className="currency" aria-hidden="true">₹</span>
                <input
                  id="received"
                  className="amount-input"
                  type="text"
                  inputMode="decimal"
                  value={receivedStr}
                  onChange={e => setReceivedStr(e.target.value)}
                  placeholder="0"
                  aria-label="Amount you receive in rupees"
                />
              </div>
            </div>

            <div>
              <label htmlFor="repay" className="field-label">You repay</label>
              <div className="input-wrap">
                <span className="currency" aria-hidden="true">₹</span>
                <input
                  id="repay"
                  className="amount-input"
                  type="text"
                  inputMode="decimal"
                  value={repayStr}
                  onChange={e => setRepayStr(e.target.value)}
                  placeholder="0"
                  aria-label="Amount you repay in rupees"
                />
              </div>
            </div>
          </div>
        </section>

        <div
          className={shouldAnimate ? 'bar' : 'bar bar--instant'}
          aria-hidden="true"
        >
          <div className="bar__fill bar__fill--received" style={{ width: `${receivedPct}%` }} />
          <div className="bar__fill bar__fill--extra" style={{ left: `${receivedPct}%`, width: `${extraPct}%` }} />
        </div>

        <div className="cost">
          <span className="field-label">Extra cost</span>
          <span
            className={`cost__number${extraCostPaise === 0 ? ' cost__number--zero' : ''}`}
            aria-live="polite"
            aria-label={extraCostPaise === 0 ? 'Extra cost: none' : `Extra cost: ${fmtRupees(displayedCost)}`}
          >
            {fmtRupees(displayedCost)}
          </span>
        </div>

        <p className="privacy">
          Everything stays on this phone.
          We never ask for card or bank details.
        </p>

        <button className="add-btn" type="button" onClick={onAddLoan}>
          Add this loan
        </button>

        <button
          className="calm-btn"
          type="button"
          aria-pressed={calmMode}
          onClick={() => setCalmMode(v => !v)}
        >
          {calmMode ? '◉' : '○'}&nbsp;&nbsp;Calm mode
        </button>
      </main>
    </>
  )
}

// ── bottom navigation ─────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'home',   label: 'Home'   },
  { id: 'borrow', label: 'Borrow' },
  { id: 'cover',  label: 'Cover'  },
  { id: 'week',   label: 'Week'   },
  { id: 'more',   label: 'More'   },
]

// ── app ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState<Tab>('home')
  const [calmMode, setCalmMode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function afterSave() {
    setRefreshKey(k => k + 1)
    setTab('week')
  }

  function afterDelete() {
    setRefreshKey(k => k + 1)
    setTab('home')
  }

  return (
    <div className="app">
      <PrivacyNote />

      <div className="tab-content">
        {tab === 'home' && (
          <HomeScreen
            onAddLoan={() => setTab('borrow')}
            calmMode={calmMode}
            setCalmMode={setCalmMode}
          />
        )}
        {tab === 'borrow' && (
          <div className="main main--screen">
            <Screen2Loan key={refreshKey} onSaved={afterSave} />
          </div>
        )}
        {tab === 'cover' && (
          <div className="main main--screen">
            <Screen3CardCover key={refreshKey} onSaved={afterSave} />
          </div>
        )}
        {tab === 'week' && (
          <div className="main main--screen">
            <Screen4ThisWeek key={refreshKey} />
          </div>
        )}
        {tab === 'more' && (
          <div className="main main--screen">
            <Screen5More onDeleted={afterDelete} />
          </div>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`bottom-nav__item${tab === item.id ? ' bottom-nav__item--active' : ''}`}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
