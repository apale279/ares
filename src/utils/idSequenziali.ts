import type { Evento, Mezzo, Missione, Paziente } from '../types'

/** 6 caratteri alfanumerici (senza I/O/Z per leggibilità) */
export function generaSalt6(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  return Array.from(arr, (x) => chars[x % chars.length]).join('')
}

/** Legacy 4 caratteri (migrate) */
export function generaSalt4(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, (x) => chars[x % chars.length]).join('')
}

/** Formato: PREFIX_SALT_SEQUENTIAL (es. M_AB12CD_42, MS_XY34ZW_7, E_…) */
export function formatoIdEntita(prefix: string, salt: string, seq: number): string {
  return `${prefix}_${salt}_${seq}`
}

const RE_MISSION_LEGACY = /^M_([A-Za-z0-9]{4})_(\d+)$/
const RE_MEZZO_NEW = /^M_([A-Za-z0-9]{6})_(\d+)$/
const RE_EVENT_NEW = /^E_([A-Za-z0-9]{6})_(\d+)$/
const RE_PAZ_NEW = /^P_([A-Za-z0-9]{6})_(\d+)$/
const RE_MISSION_MS = /^MS_([A-Za-z0-9]{6})_(\d+)$/
const RE_EVENT_OLD = /^E_([A-Za-z0-9]{4})_(\d+)$/
const RE_PAZ_OLD = /^P_([A-Za-z0-9]{4})_(\d+)$/

function maxSeqMatched(ids: string[], regex: RegExp): number {
  let m = 0
  for (const id of ids) {
    const x = regex.exec(id)
    if (x) m = Math.max(m, parseInt(x[2]!, 10))
  }
  return m
}

function seqLaneOk(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9]{6}$/.test(s)
}

export type MigrIdSeqResult = {
  /** Mantenuto per compatibilità export/import vecchi fogli meta */
  idSeqSalt: string
  idSaltMezzo: string
  idSaltEvento: string
  idSaltPaziente: string
  idSaltMissione: string
  nextIdMezzo: number
  nextIdEvento: number
  nextIdMissione: number
  nextIdPaziente: number
}

/** Allinea salt 6 caratteri e contatori dopo load persistenza */
export function migrateIdSequencer(
  eventi: Evento[],
  missioni: Missione[],
  pazienti: Paziente[],
  mezzi: Mezzo[],
  prev: Partial<{
    idSeqSalt: string
    idSaltMezzo: string
    idSaltEvento: string
    idSaltPaziente: string
    idSaltMissione: string
    nextIdMezzo: number
    nextIdEvento: number
    nextIdMissione: number
    nextIdPaziente: number
  }>,
): MigrIdSeqResult {
  const saltEvento =
    seqLaneOk(prev.idSaltEvento) ? prev.idSaltEvento : generaSalt6()
  const saltPaz =
    seqLaneOk(prev.idSaltPaziente) ? prev.idSaltPaziente : generaSalt6()
  const saltMissione =
    seqLaneOk(prev.idSaltMissione) ? prev.idSaltMissione : generaSalt6()
  const saltMezzo =
    seqLaneOk(prev.idSaltMezzo) ? prev.idSaltMezzo : generaSalt6()

  let maxE = Math.max(
    maxSeqMatched(eventi.map((e) => e.id), RE_EVENT_OLD),
    maxSeqMatched(eventi.map((e) => e.id), RE_EVENT_NEW),
  )

  let maxP = Math.max(
    maxSeqMatched(pazienti.map((p) => p.id), RE_PAZ_OLD),
    maxSeqMatched(pazienti.map((p) => p.id), RE_PAZ_NEW),
  )

  const missionIds = missioni.map((m) => m.id)
  const maxMLegacy = maxSeqMatched(missionIds, RE_MISSION_LEGACY)
  const maxMNew = maxSeqMatched(missionIds, RE_MISSION_MS)
  let maxM = Math.max(maxMLegacy, maxMNew)

  const maxMZ = Math.max(
    maxSeqMatched(
      mezzi.map((m) => m.id).filter((id) => !id.startsWith('mezzo_')),
      RE_MEZZO_NEW,
    ),
    0,
  )

  const nextIdMezzo = Math.max(prev.nextIdMezzo ?? 1, maxMZ + 1)
  const nextIdEvento = Math.max(prev.nextIdEvento ?? 1, maxE + 1)
  const nextIdMissione = Math.max(prev.nextIdMissione ?? 1, maxM + 1)
  const nextIdPaziente = Math.max(prev.nextIdPaziente ?? 1, maxP + 1)

  const legacySalt =
    prev.idSeqSalt && /^[A-Za-z0-9]{4}$/.test(prev.idSeqSalt)
      ? prev.idSeqSalt
      : ''

  return {
    idSeqSalt: legacySalt || saltMissione.slice(0, 4),
    idSaltMezzo: saltMezzo,
    idSaltEvento: saltEvento,
    idSaltPaziente: saltPaz,
    idSaltMissione: saltMissione,
    nextIdMezzo,
    nextIdEvento,
    nextIdMissione,
    nextIdPaziente,
  }
}

/** True se tutti i salt a 6 caratteri sono presenti (serve prima di nuovi ID). */
export function sequencerNeedsPatch(state: Partial<MigrIdSeqResult>): boolean {
  const lanes = [
    state.idSaltMezzo,
    state.idSaltEvento,
    state.idSaltPaziente,
    state.idSaltMissione,
  ]
  if (!lanes.every(seqLaneOk)) return true
  if (typeof state.nextIdMezzo !== 'number' || state.nextIdMezzo < 1) return true
  return false
}
