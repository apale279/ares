import type { Mezzo } from '../types'

/** Id in ordine salvato, più mezzi mancanti dall’elenco in coda (per sigla). */
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
    .sort((a, b) => a.sigla.localeCompare(b.sigla, 'it', { sensitivity: 'base' }))
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

/** Comportamento pre-ordine personalizzato (tipo poi sigla, disponibili prima per tipo). */
export function raggruppaMezziLegacyDashboard(mezzi: Mezzo[]): {
  tipo: string
  rows: Mezzo[]
}[] {
  const sorted = [...mezzi].sort(
    (a, b) =>
      a.tipo.localeCompare(b.tipo, 'it') || a.sigla.localeCompare(b.sigla, 'it'),
  )
  const groups: { tipo: string; rows: Mezzo[] }[] = []
  for (const m of sorted) {
    const last = groups[groups.length - 1]
    if (!last || last.tipo !== m.tipo) {
      groups.push({ tipo: m.tipo, rows: [m] })
    } else {
      last.rows.push(m)
    }
  }
  for (const g of groups) {
    g.rows.sort((a, b) => {
      const wa = a.stato === 'DISPONIBILE' ? 0 : 1
      const wb = b.stato === 'DISPONIBILE' ? 0 : 1
      return wa - wb || a.sigla.localeCompare(b.sigla, 'it')
    })
  }
  return groups
}
