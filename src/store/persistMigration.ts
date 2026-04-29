import { DEFAULT_IMPOSTAZIONI } from '../constants'
import type { Impostazioni, Paziente, Valutazione } from '../types'
import { nuovaValutazioneMSB } from './valutazioneFactories'

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
}

export function migrateImpostazioni(
  raw: Partial<Impostazioni> | undefined,
): Impostazioni {
  const rankUtente = Array.isArray(raw?.rankUtente)
    ? raw.rankUtente
        .filter((r) => !!r && typeof r === 'object')
        .map((r) => ({
          id: String(r.id ?? '').trim(),
          nome: String(r.nome ?? '').trim(),
          routeKeys: Array.isArray(r.routeKeys)
            ? r.routeKeys.filter(Boolean)
            : [],
        }))
        .filter((r) => r.id && r.nome && r.routeKeys.length > 0)
    : DEFAULT_IMPOSTAZIONI.rankUtente

  const utenti = Array.isArray(raw?.utenti)
    ? raw.utenti
        .filter((u) => !!u && typeof u === 'object')
        .map((u) => ({
          id: String(u.id ?? '').trim(),
          nomeUtente: String(u.nomeUtente ?? '').trim(),
          password: String(u.password ?? ''),
          rankId: String(u.rankId ?? '').trim(),
        }))
        .filter((u) => u.id && u.nomeUtente && u.rankId)
    : DEFAULT_IMPOSTAZIONI.utenti

  return {
    ...DEFAULT_IMPOSTAZIONI,
    ...raw,
    dettagliMedico: asStringArray(raw?.dettagliMedico, DEFAULT_IMPOSTAZIONI.dettagliMedico),
    dettagliTrauma: asStringArray(raw?.dettagliTrauma, DEFAULT_IMPOSTAZIONI.dettagliTrauma),
    dettagliNonNoto: asStringArray(raw?.dettagliNonNoto, DEFAULT_IMPOSTAZIONI.dettagliNonNoto),
    tipiMezzo: asStringArray(raw?.tipiMezzo, DEFAULT_IMPOSTAZIONI.tipiMezzo),
    ospedali: asStringArray(raw?.ospedali, DEFAULT_IMPOSTAZIONI.ospedali),
    pma: asStringArray(raw?.pma, DEFAULT_IMPOSTAZIONI.pma),
    manovreMSB: asStringArray(raw?.manovreMSB, DEFAULT_IMPOSTAZIONI.manovreMSB),
    manovreMSA: asStringArray(raw?.manovreMSA, DEFAULT_IMPOSTAZIONI.manovreMSA),
    manovrePMA: asStringArray(raw?.manovrePMA, DEFAULT_IMPOSTAZIONI.manovrePMA),
    presetDimissione: asStringArray(raw?.presetDimissione, DEFAULT_IMPOSTAZIONI.presetDimissione),
    mediciPma: asStringArray(raw?.mediciPma, DEFAULT_IMPOSTAZIONI.mediciPma),
    rankUtente,
    utenti,
  }
}

export function migratePazienti(list: Paziente[]): Paziente[] {
  return list.map((p) => ({
    ...p,
    esito: p.esito ?? ('' as Paziente['esito']),
    tipoDestinazioneTrasporto:
      p.tipoDestinazioneTrasporto ?? ('OSPEDALE' as Paziente['tipoDestinazioneTrasporto']),
    pmaDestinazione: p.pmaDestinazione ?? '',
    codiceTrasporto: p.codiceTrasporto ?? ('VERDE' as Paziente['codiceTrasporto']),
    pmaArrivoAt: p.pmaArrivoAt ?? null,
    trasportoCompletatoAt: p.trasportoCompletatoAt ?? null,
    medicoDimissionePma: p.medicoDimissionePma ?? '',
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
