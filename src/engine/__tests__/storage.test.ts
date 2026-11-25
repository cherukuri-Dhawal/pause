import { describe, it, expect, beforeEach } from 'vitest'
import { StorageManager } from '../storage'
import type { LoanEntry } from '../types'

const makeLoan = (id: string, overrides: Partial<LoanEntry> = {}): LoanEntry => ({
  id,
  type: 'loan',
  status: 'active',
  nickname: 'test',
  receivedPaise: 950_000,
  repayPaise: 1_120_000,
  dueDateISO: '2025-12-10',
  isAutopay: false,
  createdAt: '2025-11-26',
  ...overrides,
})

describe('StorageManager', () => {
  let sm: StorageManager

  beforeEach(() => {
    localStorage.clear()
    sm = new StorageManager()
  })

  it('saved loan is returned by loadAll', () => {
    sm.saveLoan(makeLoan('a'))
    expect(sm.loadAll()).toHaveLength(1)
  })

  it('loadAll returns saved loan with correct data', () => {
    sm.saveLoan(makeLoan('a'))
    const [entry] = sm.loadAll()
    expect(entry.id).toBe('a')
    expect(entry.repayPaise).toBe(1_120_000)
  })

  it('delete-all returns empty loadAll', () => {
    sm.saveLoan(makeLoan('a'))
    sm.saveLoan(makeLoan('b'))
    sm.deleteAll()
    expect(sm.loadAll()).toHaveLength(0)
  })

  it('delete-all clears drafts', () => {
    sm.saveDraft(makeLoan('draft-1'))
    sm.deleteAll()
    expect(sm.loadDraft()).toBeNull()
  })

  it('delete-all clears all app-owned keys from localStorage', () => {
    sm.saveLoan(makeLoan('a'))
    sm.saveDraft(makeLoan('draft-1'))
    sm.deleteAll()
    // No localStorage keys should remain from this app
    const keys = Object.keys(localStorage)
    expect(keys.filter(k => k.startsWith('pause:'))).toHaveLength(0)
  })

  it('draft is not returned by loadAll', () => {
    sm.saveDraft(makeLoan('draft-1'))
    expect(sm.loadAll()).toHaveLength(0)
  })

  it('draft is returned by loadDraft', () => {
    sm.saveDraft(makeLoan('draft-1'))
    expect(sm.loadDraft()).not.toBeNull()
  })

  it('saving a new draft overwrites the previous one', () => {
    sm.saveDraft(makeLoan('draft-1'))
    sm.saveDraft(makeLoan('draft-2'))
    expect(sm.loadDraft()?.id).toBe('draft-2')
  })

  it('clearDraft removes draft without touching confirmed loans', () => {
    sm.saveLoan(makeLoan('a'))
    sm.saveDraft(makeLoan('draft-1'))
    sm.clearDraft()
    expect(sm.loadDraft()).toBeNull()
    expect(sm.loadAll()).toHaveLength(1)
  })

  it('deleting a loan clears repaysLoanId on its direct child', () => {
    sm.saveLoan(makeLoan('parent'))
    sm.saveLoan(makeLoan('child', { repaysLoanId: 'parent' }))
    sm.deleteLoan('parent')
    const child = sm.loadAll().find(l => l.id === 'child')
    expect((child as LoanEntry).repaysLoanId).toBeUndefined()
  })

  it('deleting a loan with multiple children orphans all of them', () => {
    sm.saveLoan(makeLoan('parent'))
    sm.saveLoan(makeLoan('child1', { repaysLoanId: 'parent' }))
    sm.saveLoan(makeLoan('child2', { repaysLoanId: 'parent' }))
    sm.deleteLoan('parent')
    const remaining = sm.loadAll() as LoanEntry[]
    expect(remaining.every(l => l.repaysLoanId === undefined)).toBe(true)
  })

  it('deleting a loan that nothing points to leaves other loans untouched', () => {
    sm.saveLoan(makeLoan('a'))
    sm.saveLoan(makeLoan('b'))
    sm.deleteLoan('a')
    expect(sm.loadAll()).toHaveLength(1)
    expect(sm.loadAll()[0].id).toBe('b')
  })

  it('nothing is written outside localStorage', () => {
    sm.saveLoan(makeLoan('a'))
    expect(Object.keys(sessionStorage)).toHaveLength(0)
  })

  it('updating loan status to repaid is persisted', () => {
    sm.saveLoan(makeLoan('a'))
    sm.updateLoanStatus('a', 'repaid')
    const [entry] = sm.loadAll()
    expect(entry.status).toBe('repaid')
  })
})
