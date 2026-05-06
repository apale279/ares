import { supabase } from '../lib/supabaseClient'

/**
 * Intero stato ARES (`payload` in `ares_state`) in un’unica riga JSON.
 * Con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` lo store persistito (inclusi
 * `mezzi`, `impostazioni`, eventi, ecc.) viene letto/scritto qui; altrimenti solo locale.
 */
const ROW_ID = 'default'
const BACKUP_STORAGE_KEY = 'ares-supabase-backup'
const SNAPSHOT_PREFIX = 'snapshot_'
const SNAPSHOT_KEEP_COUNT = 50
const SESSION_KEY = 'ares_session_v1'

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

async function readRemoteStateRow(): Promise<{
  payload: unknown
  updated_at: string | null
} | null> {
  const { data, error } = await supabase
    .from('ares_state')
    .select('payload, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    payload: data.payload as unknown,
    updated_at: data.updated_at ?? null,
  }
}

function getCurrentUserIdForSnapshot(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return 'anonymous'
    const parsed = JSON.parse(raw) as { userId?: unknown }
    const userId = String(parsed?.userId ?? '').trim()
    return userId || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

function buildSnapshotId(syncIso: string, userId: string): string {
  const compact = syncIso.replace(/[-:.TZ]/g, '').slice(0, 17)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${SNAPSHOT_PREFIX}${userId}_${compact}_${suffix}`
}

async function createSnapshotRow(
  payload: unknown,
  syncIso: string,
  userId: string,
): Promise<void> {
  const snapshotId = buildSnapshotId(syncIso, userId)
  const { error } = await supabase.from('ares_state').insert({
    id: snapshotId,
    payload,
    updated_at: syncIso,
  })
  if (error) throw error
}

async function pruneSnapshots(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('ares_state')
    .select('id, updated_at')
    .like('id', `${SNAPSHOT_PREFIX}${userId}_%`)
    .order('updated_at', { ascending: false })
    .range(SNAPSHOT_KEEP_COUNT, SNAPSHOT_KEEP_COUNT + 500)

  if (error || !data?.length) return
  const ids = data.map((row) => row.id).filter(Boolean)
  if (!ids.length) return
  await supabase.from('ares_state').delete().in('id', ids)
}

async function archiveSnapshot(payload: unknown, syncIso: string): Promise<void> {
  try {
    const userId = getCurrentUserIdForSnapshot()
    await createSnapshotRow(payload, syncIso, userId)
    await pruneSnapshots(userId)
  } catch (error) {
    console.warn('[Ares] Snapshot archive failed:', error)
  }
}

class RemoteConflictError extends Error {
  constructor() {
    super(
      'Stato cloud aggiornato da un altro device. Ricarica la pagina per ottenere l’ultima versione prima di continuare.',
    )
    this.name = 'RemoteConflictError'
  }
}

async function upsertPayloadString(raw: string): Promise<void> {
  const payload = JSON.parse(raw) as unknown
  const syncIso = new Date().toISOString()
  const remote = await readRemoteStateRow()
  const remoteUpdatedAt = remote?.updated_at ?? null

  if (remoteUpdatedAt && (!lastSyncAt || remoteUpdatedAt !== lastSyncAt)) {
    lastSyncAt = remoteUpdatedAt
    for (const cb of syncListeners) cb(remoteUpdatedAt)
    throw new RemoteConflictError()
  }

  ignoreRealtimeUntil = Date.now() + 1200
  if (!remoteUpdatedAt) {
    const { error } = await supabase.from('ares_state').upsert(
      {
        id: ROW_ID,
        payload,
        updated_at: syncIso,
      },
      { onConflict: 'id' },
    )
    if (error) throw error
    await archiveSnapshot(payload, syncIso)
    markSynced(syncIso)
    return
  }

  const { data, error } = await supabase
    .from('ares_state')
    .update({
      payload,
      updated_at: syncIso,
    })
    .eq('id', ROW_ID)
    .eq('updated_at', remoteUpdatedAt)
    .select('updated_at')
    .maybeSingle()

  if (error) throw error
  if (!data?.updated_at) {
    const latest = await readRemoteStateRow()
    if (latest?.updated_at) {
      lastSyncAt = latest.updated_at
      for (const cb of syncListeners) cb(latest.updated_at)
    }
    throw new RemoteConflictError()
  }
  await archiveSnapshot(payload, data.updated_at)
  markSynced(data.updated_at)
}

function markSynced(syncIso: string) {
  lastSyncAt = syncIso
  lastRemoteError = null
  for (const cb of syncListeners) cb(syncIso)
  bumpPersistHealthListeners()
}

export function createSupabaseJsonStorage(): StateStorageLike {
  return {
    getItem: async (_name: string): Promise<string | null> => {
      if (!isSupabaseConfigured()) return null

      const data = await readRemoteStateRow().catch((error) => {
        console.error('[Ares] Supabase getItem:', error instanceof Error ? error.message : String(error))
        return null
      })

      if (data?.payload != null) {
        if (data.updated_at) {
          lastSyncAt = data.updated_at
          lastRemoteError = null
          bumpPersistHealthListeners()
        }
        const p = data.payload as unknown
        if (typeof p === 'string') return p
        return JSON.stringify(p)
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
  void storageKey
  if (!isSupabaseConfigured()) return
  const candidate = pendingValue
  if (!candidate) return
  try {
    // Cloud-first strict: allow forced sync only after at least one known cloud state in this session.
    if (!lastSyncAt) return
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
