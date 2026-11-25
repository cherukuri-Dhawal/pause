import type { Entry, LoanEntry, CardCoverEntry } from './types'

const SCHEMA_VERSION = 1
const KEY_ENTRIES = 'pause:entries'
const KEY_DRAFT = 'pause:draft'

interface StoragePayload {
  version: number
  entries: Entry[]
}

function readPayload(): StoragePayload {
  try {
    const raw = localStorage.getItem(KEY_ENTRIES)
    if (!raw) return { version: SCHEMA_VERSION, entries: [] }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      !('entries' in parsed) ||
      !Array.isArray((parsed as StoragePayload).entries)
    ) {
      console.warn('[pause] Unrecognised storage format — starting fresh.')
      return { version: SCHEMA_VERSION, entries: [] }
    }
    const payload = parsed as StoragePayload
    if (payload.version !== SCHEMA_VERSION) {
      console.warn(`[pause] Storage schema v${payload.version} ≠ v${SCHEMA_VERSION} — starting fresh.`)
      return { version: SCHEMA_VERSION, entries: [] }
    }
    return payload
  } catch {
    console.warn('[pause] Storage corrupted — starting fresh.')
    return { version: SCHEMA_VERSION, entries: [] }
  }
}

function writePayload(payload: StoragePayload): void {
  localStorage.setItem(KEY_ENTRIES, JSON.stringify(payload))
}

export class StorageManager {
  loadAll(): LoanEntry[] {
    return readPayload().entries.filter((e): e is LoanEntry => e.type === 'loan')
  }

  loadAllCardCovers(): CardCoverEntry[] {
    return readPayload().entries.filter((e): e is CardCoverEntry => e.type === 'card-cover')
  }

  loadAllEntries(): Entry[] {
    return readPayload().entries
  }

  saveLoan(entry: LoanEntry): void {
    const payload = readPayload()
    const idx = payload.entries.findIndex(e => e.id === entry.id)
    if (idx === -1) {
      payload.entries.push(entry)
    } else {
      payload.entries[idx] = entry
    }
    writePayload(payload)
  }

  saveCardCover(entry: CardCoverEntry): void {
    const payload = readPayload()
    const idx = payload.entries.findIndex(e => e.id === entry.id)
    if (idx === -1) {
      payload.entries.push(entry)
    } else {
      payload.entries[idx] = entry
    }
    writePayload(payload)
  }

  deleteCardCover(id: string): void {
    const payload = readPayload()
    payload.entries = payload.entries.filter(e => e.id !== id)
    writePayload(payload)
  }

  deleteLoan(id: string): void {
    const payload = readPayload()
    payload.entries = payload.entries
      .filter(e => e.id !== id)
      .map(e => {
        if (e.type === 'loan' && (e as LoanEntry).repaysLoanId === id) {
          const { repaysLoanId: _removed, ...rest } = e as LoanEntry
          return rest as LoanEntry
        }
        return e
      })
    writePayload(payload)
  }

  updateLoanStatus(id: string, status: LoanEntry['status']): void {
    const payload = readPayload()
    payload.entries = payload.entries.map(e => {
      if (e.id === id && e.type === 'loan') return { ...(e as LoanEntry), status }
      return e
    })
    writePayload(payload)
  }

  loadDraft(): Entry | null {
    try {
      const raw = localStorage.getItem(KEY_DRAFT)
      if (!raw) return null
      return JSON.parse(raw) as Entry
    } catch {
      return null
    }
  }

  saveDraft(entry: Entry): void {
    localStorage.setItem(KEY_DRAFT, JSON.stringify(entry))
  }

  clearDraft(): void {
    localStorage.removeItem(KEY_DRAFT)
  }

  deleteAll(): void {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('pause:')) toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)
  }
}
