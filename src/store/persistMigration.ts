import { DEFAULT_IMPOSTAZIONI } from '../constants'
import type { Impostazioni, Paziente, Valutazione } from '../types'
import { nuovaValutazioneMSB } from './valutazioneFactories'

export function migrateImpostazioni(
  raw: Partial<Impostazioni> | undefined,
): Impostazioni {
  return {
    ...DEFAULT_IMPOSTAZIONI,
    ...raw,
    dettagliMedico: raw?.dettagliMedico ?? DEFAULT_IMPOSTAZIONI.dettagliMedico,
    dettagliTrauma: raw?.dettagliTrauma ?? DEFAULT_IMPOSTAZIONI.dettagliTrauma,
    dettagliNonNoto:
      raw?.dettagliNonNoto ?? DEFAULT_IMPOSTAZIONI.dettagliNonNoto,
    tipiMezzo: raw?.tipiMezzo ?? DEFAULT_IMPOSTAZIONI.tipiMezzo,
    ospedali: raw?.ospedali ?? DEFAULT_IMPOSTAZIONI.ospedali,
    pma: raw?.pma ?? DEFAULT_IMPOSTAZIONI.pma,
    manovreMSB: raw?.manovreMSB ?? DEFAULT_IMPOSTAZIONI.manovreMSB,
    manovreMSA: raw?.manovreMSA ?? DEFAULT_IMPOSTAZIONI.manovreMSA,
  }
}

export function migratePazienti(list: Paziente[]): Paziente[] {
  return list.map((p) => ({
    ...p,
    esito: p.esito ?? ('' as Paziente['esito']),
    tipoDestinazioneTrasporto:
      p.tipoDestinazioneTrasporto ?? ('OSPEDALE' as Paziente['tipoDestinazioneTrasporto']),
    pmaDestinazione: p.pmaDestinazione ?? '',
    pmaArrivoAt: p.pmaArrivoAt ?? null,
    trasportoCompletatoAt: p.trasportoCompletatoAt ?? null,
  }))
}

export function migrateValutazioni(raw: unknown): Valutazione[] {
  if (!Array.isArray(raw)) return []
  const out: Valutazione[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (o.tipo === 'MSB' || o.tipo === 'MSA' || o.tipo === 'PMA') {
      out.push(item as Valutazione)
      continue
    }
    if (
      'valutazioneMSB' in o ||
      'valutazioneMSA' in o ||
      'noteCentrale' in o
    ) {
      const id = String(o.id ?? '')
      const pid = String(o.pazienteId ?? '')
      const ts = String(o.createdAt ?? new Date().toISOString())
      const txt = [o.valutazioneMSB, o.valutazioneMSA, o.noteCentrale]
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
        .join('\n\n')
      const v = nuovaValutazioneMSB(pid, id || undefined)
      v.timestamp = ts
      v.breveDescrizione = txt
      out.push(v)
    }
  }
  return out
}
