import { supabase } from '../lib/supabaseClient'

/** Intero stato ARES (payload.state) in un’unica riga JSON: niente campi “solo locale” oltre a quanto escluso dal partialize dello store. */
const ROW_ID = 'default'
const LEGACY_STORAGE_KEY = 'ares-local-storage'
const BACKUP_STORAGE_KEY = 'ares-supabase-backup'

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingValue: string | null = null
let savePromiseChain: Promise<void> = Promise.resolve()
let ignoreRealtimeUntil = 0
let lastSyncAt: string | null = null
const syncListeners = new Set<(iso: string) => void>()

/** True mentre è in coda o in corso un flush verso Supabase. */
let pendingRemoteFlush = false
/** Ultimo errore di scrittura su Supabase (null = ok). */
let lastRemoteError: string | null = null
const persistHealthListeners = new Set<() => void>()

function bumpPersistHealthListeners() {
  for (const cb of persistHealthListeners) cb()
}

export type PersistenceHealthStatus =
  | 'cloud_ok'
  | 'cloud_pending'
  | 'cloud_error'
  | 'local_only'

export function getPersistenceHealth(): {
  status: PersistenceHealthStatus
  title: string
  detail: string
  lastSyncAt: string | null
} {
  if (!isSupabaseConfigured()) {
    return {
      status: 'local_only',
      title: 'Dati solo in locale',
      detail:
        'Mancano VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY: lo stato ARES viene salvato solo nel browser (localStorage), non su database Supabase.',
      lastSyncAt: null,
    }
  }
  if (lastRemoteError) {
    return {
      status: 'cloud_error',
      title: 'Errore salvataggio cloud',
      detail: `L’ultimo invio a Supabase non è riuscito: ${lastRemoteError}. I dati restano comunque copiati in localStorage nel browser.`,
      lastSyncAt,
    }
  }
  if (pendingRemoteFlush || pendingValue !== null || saveTimer !== null) {
    return {
      status: 'cloud_pending',
      title: 'Sincronizzazione in corso',
      detail:
        'Le ultime modifiche sono in invio verso Supabase (di solito entro pochi secondi). Nel frattempo sono già salvate in localStorage sul tuo PC.',
      lastSyncAt,
    }
  }
  return {
    status: 'cloud_ok',
    title: 'Salvato su Supabase',
    detail:
      'Le variabili Supabase sono configurate e l’ultimo salvataggio cloud è andato a buon fine. È mantenuta anche una copia in localStorage come backup.',
    lastSyncAt,
  }
}

export function onPersistHealthChange(cb: () => void): () => void {
  persistHealthListeners.add(cb)
  return () => {
    persistHealthListeners.delete(cb)
  }
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

async function upsertPayloadString(raw: string): Promise<void> {
  const payload = JSON.parse(raw) as unknown
  const syncIso = new Date().toISOString()
  ignoreRealtimeUntil = Date.now() + 1200
  const { error } = await supabase.from('ares_state').upsert(
    {
      id: ROW_ID,
      payload,
      updated_at: syncIso,
    },
    { onConflict: 'id' },
  )
  if (error) throw error
  lastSyncAt = syncIso
  lastRemoteError = null
  for (const cb of syncListeners) cb(syncIso)
  bumpPersistHealthListeners()
}

export function createSupabaseJsonStorage(): StateStorageLike {
  return {
    getItem: async (name: string): Promise<string | null> => {
      if (!isSupabaseConfigured()) return null

      const { data, error } = await supabase
        .from('ares_state')
        .select('payload')
        .eq('id', ROW_ID)
        .maybeSingle()

      if (error) {
        console.error('[Ares] Supabase getItem:', error.message)
        return null
      }

      if (data?.payload != null) {
        const p = data.payload as unknown
        if (typeof p === 'string') return p
        return JSON.stringify(p)
      }

      try {
        const current = localStorage.getItem(name)
        if (current) return current
        const backup = localStorage.getItem(BACKUP_STORAGE_KEY)
        if (backup) return backup
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) return legacy
      } catch {
        /* ignore */
      }
      return null
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (!isSupabaseConfigured()) return

      pendingValue = value
      pendingRemoteFlush = true
      bumpPersistHealthListeners()
      try {
        localStorage.setItem(name, value)
        localStorage.setItem(BACKUP_STORAGE_KEY, value)
      } catch {
        /* ignore */
      }
      if (saveTimer) clearTimeout(saveTimer)

      savePromiseChain = savePromiseChain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            saveTimer = setTimeout(async () => {
              saveTimer = null
              const toWrite = pendingValue
              pendingValue = null
              if (toWrite == null) {
                pendingRemoteFlush = false
                bumpPersistHealthListeners()
                resolve()
                return
              }
              try {
                await upsertPayloadString(toWrite)
                pendingRemoteFlush = false
                bumpPersistHealthListeners()
                resolve()
              } catch (e) {
                console.error('[Ares] Supabase setItem:', e)
                lastRemoteError =
                  e instanceof Error ? e.message : String(e)
                pendingRemoteFlush = false
                bumpPersistHealthListeners()
                reject(e)
              }
            }, 0)
          }),
      )

      try {
        await savePromiseChain
      } catch {
        /* errore già tracciato in lastRemoteError */
      }
    },

    removeItem: async (_name: string): Promise<void> => {
      if (!isSupabaseConfigured()) return
      await supabase
        .from('ares_state')
        .update({
          payload: { version: 0, state: {} },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ROW_ID)
    },
  }
}

/** Storage minimale compatibile con `createJSONStorage` di zustand */
interface StateStorageLike {
  getItem: (name: string) => string | null | Promise<string | null>
  setItem: (name: string, value: string) => void | Promise<void>
  removeItem: (name: string) => void | Promise<void>
}

/** Evita rehydrate subito dopo un salvataggio locale (debounce + echo Realtime). */
export function shouldSkipRemoteRehydrate(): boolean {
  return Date.now() < ignoreRealtimeUntil
}

export async function forceSupabaseSync(storageKey: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const candidate =
    localStorage.getItem(storageKey) ??
    localStorage.getItem(BACKUP_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!candidate) return
  try {
    await upsertPayloadString(candidate)
  } catch (e) {
    lastRemoteError = e instanceof Error ? e.message : String(e)
    bumpPersistHealthListeners()
    throw e
  }
}

export function getLastSyncAt(): string | null {
  return lastSyncAt
}

export function onSyncUpdate(cb: (iso: string) => void): () => void {
  syncListeners.add(cb)
  return () => {
    syncListeners.delete(cb)
  }
}

export { isSupabaseConfigured }
