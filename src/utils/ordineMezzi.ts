import type { Mezzo } from '../types'

/** Mezzo «CRI»: sigla che inizia con CRI oppure tipo esattamente CRI (case-insensitive). */
export function isMezzoCri(m: Mezzo): boolean {
  const sig = m.sigla.trim().toUpperCase()
  if (sig.startsWith('CRI')) return true
  if (m.tipo.trim().toUpperCase() === 'CRI') return true
  return false
}

/** MSB e MSA in cima tra i tipi «non speciali»; poi gli altri tipi in ordine alfabetico. */
function tipoRankDefault(tipo: string): number {
  const u = tipo.trim().toUpperCase()
  if (u === 'MSB') return 0
  if (u === 'MSA') return 1
  return 2
}

/** Ordine predefinito elenchi (Impostazioni / coda senza ordine salvato): CRI → MSB → MSA → altri tipi → sigla. */
export function compareMezziDefaultLista(a: Mezzo, b: Mezzo): number {
  const ca = isMezzoCri(a) ? 0 : 1
  const cb = isMezzoCri(b) ? 0 : 1
  if (ca !== cb) return ca - cb
  const ra = tipoRankDefault(a.tipo) - tipoRankDefault(b.tipo)
  if (ra !== 0) return ra
  const tipoCmp = a.tipo.localeCompare(b.tipo, 'it', { sensitivity: 'base' })
  if (tipoCmp !== 0) return tipoCmp
  return a.sigla.localeCompare(b.sigla, 'it', { sensitivity: 'base' })
}

function compareTipoNomeDefault(a: string, b: string): number {
  const ra = tipoRankDefault(a) - tipoRankDefault(b)
  if (ra !== 0) return ra
  return a.localeCompare(b, 'it', { sensitivity: 'base' })
}

/** Id in ordine salvato, più mezzi mancanti dall’elenco in coda (ordine predefinito CRI + tipi). */
export function ordineMezziCompleto(
  mezzi: Mezzo[],
  ordineSalvato: string[] | undefined,
): string[] {
  const byId = new Map(mezzi.map((m) => [m.id, m]))
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ordineSalvato ?? []) {
    const t = String(id ?? '').trim()
    if (!t || seen.has(t) || !byId.has(t)) continue
    out.push(t)
    seen.add(t)
  }
  const rest = mezzi
    .filter((m) => !seen.has(m.id))
    .sort(compareMezziDefaultLista)
    .map((m) => m.id)
  return [...out, ...rest]
}

export function mezziInOrdinePersistito(
  mezzi: Mezzo[],
  ordineSalvato: string[] | undefined,
): Mezzo[] {
  const byId = new Map(mezzi.map((m) => [m.id, m]))
  return ordineMezziCompleto(mezzi, ordineSalvato)
    .map((id) => byId.get(id))
    .filter((m): m is Mezzo => m != null)
}

/** Elenco raggruppato per tipo come in dashboard (sezioni in ordine di prima apparizione nel flat ordinato). */
export function raggruppaMezziPerTipoDashboard(mezziFlat: Mezzo[]): {
  tipo: string
  rows: Mezzo[]
}[] {
  const seenTipo = new Set<string>()
  const tipoOrder: string[] = []
  for (const m of mezziFlat) {
    if (!seenTipo.has(m.tipo)) {
      tipoOrder.push(m.tipo)
      seenTipo.add(m.tipo)
    }
  }
  return tipoOrder.map((tipo) => ({
    tipo,
    rows: mezziFlat.filter((m) => m.tipo === tipo),
  }))
}

/**
 * Senza ordine personalizzato: sezioni per tipo in ordine MSB → MSA → altri tipi (alfa);
 * in ogni sezione prima i mezzi CRI, poi gli altri; tra pari stato, disponibili in cima.
 */
export function raggruppaMezziLegacyDashboard(mezzi: Mezzo[]): {
  tipo: string
  rows: Mezzo[]
}[] {
  const tipiOrdinati = [...new Set(mezzi.map((m) => m.tipo))].sort(compareTipoNomeDefault)
  return tipiOrdinati.map((tipo) => {
    const rows = mezzi.filter((m) => m.tipo === tipo)
    rows.sort((a, b) => {
      const wa = a.stato === 'DISPONIBILE' ? 0 : 1
      const wb = b.stato === 'DISPONIBILE' ? 0 : 1
      if (wa !== wb) return wa - wb
      const ca = isMezzoCri(a) ? 0 : 1
      const cb = isMezzoCri(b) ? 0 : 1
      if (ca !== cb) return ca - cb
      return a.sigla.localeCompare(b.sigla, 'it', { sensitivity: 'base' })
    })
    return { tipo, rows }
  })
}
