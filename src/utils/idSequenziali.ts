import type { Evento, Missione, Paziente } from '../types'

/** Sal 4 caratteri alfanumerici (mai I/O/Z confusi con zero se serve, teniamo set semplice) */
export function generaSalt4(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, (x) => chars[x % chars.length]).join('')
}

export function formatoIdSeq(
  prefix: 'E' | 'M' | 'P',
  salt: string,
  seq: number,
): string {
  return `${prefix}_${salt}_${seq}`
}

function estraiSaltDaId(id: string): string | null {
  const m =
    /^E_([A-Za-z0-9]{4})_\d+$/.exec(id) ||
    /^M_([A-Za-z0-9]{4})_\d+$/.exec(id) ||
    /^P_([A-Za-z0-9]{4})_\d+$/.exec(id)
  return m ? m[1]! : null
}

function seqDaId(prefix: string, salt: string, id: string): number | null {
  const re = new RegExp(`^${prefix}_${salt}_(\\d+)$`)
  const m = re.exec(id)
  return m ? parseInt(m[1]!, 10) : null
}

/** Allinea salt e contatori prossimi ID dopo load da persistenza. */
export function migrateIdSequencer(
  eventi: Evento[],
  missioni: Missione[],
  pazienti: Paziente[],
  prev: Partial<{
    idSeqSalt: string
    nextIdEvento: number
    nextIdMissione: number
    nextIdPaziente: number
  }>,
): {
  idSeqSalt: string
  nextIdEvento: number
  nextIdMissione: number
  nextIdPaziente: number
} {
  let salt =
    prev.idSeqSalt && /^[A-Za-z0-9]{4}$/.test(prev.idSeqSalt)
      ? prev.idSeqSalt
      : ''

  if (!salt) {
    for (const id of [
      ...eventi.map((e) => e.id),
      ...missioni.map((m) => m.id),
      ...pazienti.map((p) => p.id),
    ]) {
      const detected = estraiSaltDaId(id)
      if (detected) {
        salt = detected
        break
      }
    }
  }

  if (!salt) salt = generaSalt4()

  let maxE = 0
  let maxM = 0
  let maxP = 0
  for (const e of eventi) {
    const n = seqDaId('E', salt, e.id)
    if (n != null) maxE = Math.max(maxE, n)
  }
  for (const m of missioni) {
    const n = seqDaId('M', salt, m.id)
    if (n != null) maxM = Math.max(maxM, n)
  }
  for (const p of pazienti) {
    const n = seqDaId('P', salt, p.id)
    if (n != null) maxP = Math.max(maxP, n)
  }

  const nextIdEvento = Math.max(prev.nextIdEvento ?? 1, maxE + 1)
  const nextIdMissione = Math.max(prev.nextIdMissione ?? 1, maxM + 1)
  const nextIdPaziente = Math.max(prev.nextIdPaziente ?? 1, maxP + 1)

  return { idSeqSalt: salt, nextIdEvento, nextIdMissione, nextIdPaziente }
}
