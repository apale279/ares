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
const MANUAL_BACKUP_PREFIX = 'manual_backup_'
const MANUAL_BACKUP_KEEP_COUNT = 5
const AUDIT_PREFIX = 'audit_'
const AUDIT_KEEP_COUNT = 500
const SESSION_KEY = 'ares_session_v1'
const WRITE_DEBOUNCE_MS = 700

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingValue: string | null = null
let savePromiseChain: Promise<void> = Promise.resolve()
let ignoreRealtimeUntil = 0
let lastSyncAt: string | null = null
let lastWrittenNormalizedPayload = ''
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

function getCurrentActor(): { userId: string; nomeUtente: string } {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { userId: 'anonymous', nomeUtente: 'anonymous' }
    const parsed = JSON.parse(raw) as { userId?: unknown; nomeUtente?: unknown }
    const userId = String(parsed?.userId ?? '').trim()
    const nomeUtente = String(parsed?.nomeUtente ?? '').trim()
    return {
      userId: userId || 'anonymous',
      nomeUtente: nomeUtente || userId || 'anonymous',
    }
  } catch {
    return { userId: 'anonymous', nomeUtente: 'anonymous' }
  }
}

function compactTs(iso: string): string {
  return iso.replace(/[-:.TZ]/g, '').slice(0, 17)
}

function normalizePayloadRaw(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw))
  } catch {
    return raw
  }
}

function buildSnapshotId(syncIso: string, userId: string): string {
  const compact = compactTs(syncIso)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${SNAPSHOT_PREFIX}${userId}_${compact}_${suffix}`
}

function buildManualBackupId(syncIso: string): string {
  const compact = compactTs(syncIso)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${MANUAL_BACKUP_PREFIX}${compact}_${suffix}`
}

function buildAuditId(syncIso: string): string {
  const compact = compactTs(syncIso)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${AUDIT_PREFIX}${compact}_${suffix}`
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

async function pruneManualBackups(): Promise<void> {
  const { data, error } = await supabase
    .from('ares_state')
    .select('id, updated_at')
    .like('id', `${MANUAL_BACKUP_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .range(MANUAL_BACKUP_KEEP_COUNT, MANUAL_BACKUP_KEEP_COUNT + 500)
  if (error || !data?.length) return
  const ids = data.map((row) => row.id).filter(Boolean)
  if (!ids.length) return
  await supabase.from('ares_state').delete().in('id', ids)
}

async function pruneAuditLogs(): Promise<void> {
  const { data, error } = await supabase
    .from('ares_state')
    .select('id, updated_at')
    .like('id', `${AUDIT_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .range(AUDIT_KEEP_COUNT, AUDIT_KEEP_COUNT + 500)
  if (error || !data?.length) return
  const ids = data.map((row) => row.id).filter(Boolean)
  if (!ids.length) return
  await supabase.from('ares_state').delete().in('id', ids)
}

async function archiveSnapshot(payload: unknown, syncIso: string): Promise<void> {
  try {
    const { userId } = getCurrentActor()
    await createSnapshotRow(payload, syncIso, userId)
    await pruneSnapshots(userId)
  } catch (error) {
    console.warn('[Ares] Snapshot archive failed:', error)
  }
}

type ManualBackupPayload = {
  kind: 'manual_backup'
  name: string
  created_at: string
  source_user_id: string
  source_user_name?: string
  data: unknown
}

type AuditPayload = {
  kind: 'audit_log'
  at: string
  user_id: string
  user_name?: string
  action: string
  detail: string
}

async function createAuditLog(action: string, detail: string): Promise<void> {
  try {
    const at = new Date().toISOString()
    const actor = getCurrentActor()
    const payload: AuditPayload = {
      kind: 'audit_log',
      at,
      user_id: actor.userId,
      user_name: actor.nomeUtente,
      action,
      detail,
    }
    const { error } = await supabase.from('ares_state').insert({
      id: buildAuditId(at),
      payload,
      updated_at: at,
    })
    if (error) return
    await pruneAuditLogs()
  } catch {
    /* ignore */
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
  const normalizedIncoming = normalizePayloadRaw(raw)
  const syncIso = new Date().toISOString()
  const remote = await readRemoteStateRow()
  const remoteUpdatedAt = remote?.updated_at ?? null
  const remoteRaw = remote?.payload == null ? '' : JSON.stringify(remote.payload)
  const normalizedRemote = remoteRaw ? normalizePayloadRaw(remoteRaw) : ''

  // No-op write optimization: if cloud already has same content, only refresh local sync state.
  if (normalizedRemote && normalizedRemote === normalizedIncoming) {
    if (remoteUpdatedAt) {
      markSynced(remoteUpdatedAt)
    } else {
      markSynced(syncIso)
    }
    lastWrittenNormalizedPayload = normalizedIncoming
    return
  }

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
    await createAuditLog('state_update', 'Inizializzazione stato applicazione')
    markSynced(syncIso)
    lastWrittenNormalizedPayload = normalizedIncoming
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
  await createAuditLog('state_update', 'Aggiornamento dati applicazione')
  markSynced(data.updated_at)
  lastWrittenNormalizedPayload = normalizedIncoming
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
        if (typeof p === 'string') {
          lastWrittenNormalizedPayload = normalizePayloadRaw(p)
          return p
        }
        const raw = JSON.stringify(p)
        lastWrittenNormalizedPayload = normalizePayloadRaw(raw)
        return raw
      }
      return null
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (!isSupabaseConfigured()) return
      const normalized = normalizePayloadRaw(value)
      if (normalized === lastWrittenNormalizedPayload) return

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
                const normalizedToWrite = normalizePayloadRaw(toWrite)
                if (normalizedToWrite === lastWrittenNormalizedPayload) {
                  pendingRemoteFlush = false
                  bumpPersistHealthListeners()
                  resolve()
                  return
                }
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
            }, WRITE_DEBOUNCE_MS)
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

/**
 * Annulla l’upload cloud in coda (debounce senza aver ancora chiamato Supabase).
 * Usare prima di un “pull” manuale (es. pulsante SYNC) così uno snapshot locale
 * obsoleto non sovrascrive una modifica fatta da un altro PC dopo l’ultima lettura.
 */
export function discardDebouncedPendingRemoteWrite(): void {
  const hadQueued =
    pendingValue !== null || saveTimer !== null || pendingRemoteFlush
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  pendingValue = null
  pendingRemoteFlush = false
  if (hadQueued) bumpPersistHealthListeners()
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

export type ManualBackupRecord = {
  id: string
  name: string
  createdAt: string
  updatedAt: string | null
  userId: string
}

export type PersistAuditRecord = {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: string
  detail: string
}

export async function createManualBackup(name?: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const remote = await readRemoteStateRow()
  if (!remote?.payload) return
  const createdAt = new Date().toISOString()
  const trimmed = (name ?? '').trim()
  const payload: ManualBackupPayload = {
    kind: 'manual_backup',
    name: trimmed || `Backup ${new Date(createdAt).toLocaleString('it-IT')}`,
    created_at: createdAt,
    source_user_id: getCurrentActor().userId,
    source_user_name: getCurrentActor().nomeUtente,
    data: remote.payload,
  }
  const { error } = await supabase.from('ares_state').insert({
    id: buildManualBackupId(createdAt),
    payload,
    updated_at: createdAt,
  })
  if (error) throw error
  await pruneManualBackups()
  await createAuditLog('backup_create', `Creato backup manuale: ${payload.name}`)
}

export async function listManualBackups(): Promise<ManualBackupRecord[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('ares_state')
    .select('id, payload, updated_at')
    .like('id', `${MANUAL_BACKUP_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .range(0, MANUAL_BACKUP_KEEP_COUNT - 1)
  if (error || !data) return []
  return data
    .map((row) => {
      const payload = (row.payload ?? {}) as Partial<ManualBackupPayload>
      return {
        id: row.id as string,
        name: String(payload.name ?? row.id),
        createdAt: String(payload.created_at ?? row.updated_at ?? ''),
        updatedAt: (row.updated_at as string | null) ?? null,
        userId: String(payload.source_user_id ?? 'unknown'),
      }
    })
    .filter((x) => Boolean(x.id))
}

export async function renameManualBackup(
  backupId: string,
  nextName: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return
  const trimmed = nextName.trim()
  if (!trimmed) return
  const { data, error } = await supabase
    .from('ares_state')
    .select('payload')
    .eq('id', backupId)
    .maybeSingle()
  if (error) throw error
  const current = (data?.payload ?? {}) as Partial<ManualBackupPayload>
  const updated: ManualBackupPayload = {
    kind: 'manual_backup',
    name: trimmed,
    created_at: String(current.created_at ?? new Date().toISOString()),
    source_user_id: String(current.source_user_id ?? getCurrentActor().userId),
    source_user_name: String(current.source_user_name ?? getCurrentActor().nomeUtente),
    data: current.data ?? {},
  }
  const { error: upError } = await supabase
    .from('ares_state')
    .update({ payload: updated, updated_at: new Date().toISOString() })
    .eq('id', backupId)
  if (upError) throw upError
  await createAuditLog('backup_rename', `Rinominato backup ${backupId} in "${trimmed}"`)
}

export async function restoreManualBackup(backupId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { data, error } = await supabase
    .from('ares_state')
    .select('payload')
    .eq('id', backupId)
    .maybeSingle()
  if (error) throw error
  const backup = (data?.payload ?? {}) as Partial<ManualBackupPayload>
  const restoredPayload = backup.data
  if (restoredPayload == null) throw new Error('Backup non valido')
  const now = new Date().toISOString()
  const { error: upError } = await supabase
    .from('ares_state')
    .update({ payload: restoredPayload, updated_at: now })
    .eq('id', ROW_ID)
  if (upError) throw upError
  markSynced(now)
  await createAuditLog('backup_restore', `Ripristinato backup ${backupId}`)
}

export async function listPersistAuditLogs(limit = 150): Promise<PersistAuditRecord[]> {
  if (!isSupabaseConfigured()) return []
  const safeLimit = Math.max(1, Math.min(limit, 500))
  const { data, error } = await supabase
    .from('ares_state')
    .select('id, payload, updated_at')
    .like('id', `${AUDIT_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .range(0, safeLimit - 1)
  if (error || !data) return []
  return data.map((row) => {
    const payload = (row.payload ?? {}) as Partial<AuditPayload>
    return {
      id: String(row.id),
      timestamp: String(payload.at ?? row.updated_at ?? ''),
      userId: String(payload.user_id ?? 'unknown'),
      userName: String(payload.user_name ?? payload.user_id ?? 'unknown'),
      action: String(payload.action ?? 'unknown'),
      detail: String(payload.detail ?? ''),
    }
  })
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
