import { DEFAULT_IMPOSTAZIONI } from '../constants'
import type {
  AppRouteKey,
  Evento,
  Impostazioni,
  Missione,
  Paziente,
  PMAPostazione,
  PersonaContatto,
  RankUtente,
  StazionamentoMezzoPreset,
  Valutazione,
  VociPerGenitore,
} from '../types'

const APP_ROUTE_KEYS: AppRouteKey[] = [
  'dashboard',
  'diario',
  'ricerca',
  'impostazioni',
  'pma_modulo',
  'mezzo',
]

function asAppRouteKeys(keys: unknown[]): AppRouteKey[] {
  const allowed = new Set<string>(APP_ROUTE_KEYS)
  const out: AppRouteKey[] = []
  const seen = new Set<string>()
  for (const k of keys) {
    let s = String(k ?? '').trim()
    if (s === 'pma') s = 'pma_modulo'
    if (!allowed.has(s) || seen.has(s)) continue
    seen.add(s)
    out.push(s as AppRouteKey)
  }
  return out
}
import { nuovaValutazioneMSB } from './valutazioneFactories'

function asPersona(raw: unknown): PersonaContatto {
  if (!raw || typeof raw !== 'object') return { nome: '', cognome: '', telefono: '' }
  const o = raw as Record<string, unknown>
  return {
    nome: String(o.nome ?? '').trim(),
    cognome: String(o.cognome ?? '').trim(),
    telefono: String(o.telefono ?? '').trim(),
  }
}

function asPMAPostazione(value: unknown, fallbackNome: string): PMAPostazione {
  if (!value || typeof value !== 'object') {
    return {
      id: `pma_${crypto.randomUUID()}`,
      nome: fallbackNome,
      indirizzo: '',
      lat: null,
      lng: null,
      postiLetto: null,
      medici: [],
      infermieri: [],
      soccorritori: [],
      inventarioFarmaci: '',
    }
  }
  const o = value as Record<string, unknown>
  const postiRaw = o.postiLetto
  let postiLetto: number | null = null
  if (typeof postiRaw === 'number' && Number.isFinite(postiRaw)) postiLetto = postiRaw
  else if (typeof postiRaw === 'string' && postiRaw.trim()) {
    const n = Number.parseInt(postiRaw, 10)
    if (Number.isFinite(n)) postiLetto = n
  }

  return {
    id: String(o.id ?? `pma_${crypto.randomUUID()}`).trim() || `pma_${crypto.randomUUID()}`,
    nome: String(o.nome ?? fallbackNome).trim() || fallbackNome,
    indirizzo: String(o.indirizzo ?? '').trim(),
    lat: typeof o.lat === 'number' && Number.isFinite(o.lat) ? o.lat : null,
    lng: typeof o.lng === 'number' && Number.isFinite(o.lng) ? o.lng : null,
    postiLetto,
    medici: Array.isArray(o.medici) ? o.medici.map((x) => asPersona(x)) : [],
    infermieri: Array.isArray(o.infermieri) ? o.infermieri.map((x) => asPersona(x)) : [],
    soccorritori: Array.isArray(o.soccorritori)
      ? o.soccorritori.map((x) => asPersona(x))
      : [],
    inventarioFarmaci: String(o.inventarioFarmaci ?? '').trim(),
  }
}

function asVociPerGenitore(raw: unknown, fallback: VociPerGenitore): VociPerGenitore {
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Record<string, unknown>
  const out: VociPerGenitore = { ...fallback }
  for (const [k, v] of Object.entries(src)) {
    const key = k.trim()
    if (!key) continue
    if (!Array.isArray(v)) continue
    out[key] = v.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  return out
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
}

function asStazionamentiMezzoPreset(raw: unknown): StazionamentoMezzoPreset[] {
  if (!Array.isArray(raw)) return []
  const out: StazionamentoMezzoPreset[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const nome = String(o.nome ?? '').trim()
    if (!nome) continue
    out.push({
      id: String(o.id ?? '').trim() || `staz_${crypto.randomUUID()}`,
      nome,
      indirizzo: String(o.indirizzo ?? '').trim(),
      lat: typeof o.lat === 'number' && Number.isFinite(o.lat) ? o.lat : null,
      lng: typeof o.lng === 'number' && Number.isFinite(o.lng) ? o.lng : null,
    })
  }
  return out
}

function migratePostazioniPmaBloc(raw: Partial<Impostazioni> | undefined): PMAPostazione[] {
  const arr = raw?.postazioniPma
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.map((item, idx) =>
      asPMAPostazione(item, `PMA_${idx + 1}`),
    )
  }
  const legacyNames = asStringArray(raw?.pma, DEFAULT_IMPOSTAZIONI.pma)
  return legacyNames.map((nome) => asPMAPostazione(undefined, nome))
}

export function migrateImpostazioni(
  raw: Partial<Impostazioni> | undefined,
): Impostazioni {
  const rankUtente: RankUtente[] = Array.isArray(raw?.rankUtente)
    ? raw.rankUtente
        .filter((r) => !!r && typeof r === 'object')
        .map((r) => ({
          id: String(r.id ?? '').trim(),
          nome: String(r.nome ?? '').trim(),
          routeKeys: Array.isArray(r.routeKeys)
            ? asAppRouteKeys(r.routeKeys)
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

  const postazioniPma = migratePostazioniPmaBloc(raw)

  const pmaSynced = [...new Set(postazioniPma.map((p) => p.nome.trim()).filter(Boolean))]
  const pmaList =
    pmaSynced.length > 0
      ? pmaSynced
      : asStringArray(raw?.pma, DEFAULT_IMPOSTAZIONI.pma)

  const rawClean: Record<string, unknown> = { ...(raw as object) }
  delete rawClean.dettagliMedico
  delete rawClean.dettagliTrauma
  delete rawClean.dettagliNonNoto

  return {
    ...DEFAULT_IMPOSTAZIONI,
    ...rawClean,
    tipiMezzo: asStringArray(raw?.tipiMezzo, DEFAULT_IMPOSTAZIONI.tipiMezzo),
    ospedali: asStringArray(raw?.ospedali, DEFAULT_IMPOSTAZIONI.ospedali),
    pma: pmaList,
    postazioniPma: postazioniPma.length ? postazioniPma : DEFAULT_IMPOSTAZIONI.postazioniPma,
    classificazioniSoccorso: asStringArray(
      raw?.classificazioniSoccorso,
      DEFAULT_IMPOSTAZIONI.classificazioniSoccorso,
    ),
    dettaglioClassificazioneSoccorso: asVociPerGenitore(
      raw?.dettaglioClassificazioneSoccorso,
      DEFAULT_IMPOSTAZIONI.dettaglioClassificazioneSoccorso,
    ),
    motiviSoccorso: asStringArray(raw?.motiviSoccorso, DEFAULT_IMPOSTAZIONI.motiviSoccorso),
    dettaglioMotivoSoccorso: asVociPerGenitore(
      raw?.dettaglioMotivoSoccorso,
      DEFAULT_IMPOSTAZIONI.dettaglioMotivoSoccorso,
    ),
    meteoEvento: asStringArray(raw?.meteoEvento, DEFAULT_IMPOSTAZIONI.meteoEvento),
    luoghiEvento: asStringArray(raw?.luoghiEvento, DEFAULT_IMPOSTAZIONI.luoghiEvento),
    dettaglioLuogoEvento: asVociPerGenitore(
      raw?.dettaglioLuogoEvento,
      DEFAULT_IMPOSTAZIONI.dettaglioLuogoEvento,
    ),
    segnalatoDaOpzioni: asStringArray(
      raw?.segnalatoDaOpzioni,
      DEFAULT_IMPOSTAZIONI.segnalatoDaOpzioni,
    ),
    esitiMissione: asStringArray(raw?.esitiMissione, DEFAULT_IMPOSTAZIONI.esitiMissione),
    manovreMSB: asStringArray(raw?.manovreMSB, DEFAULT_IMPOSTAZIONI.manovreMSB),
    manovreMSA: asStringArray(raw?.manovreMSA, DEFAULT_IMPOSTAZIONI.manovreMSA),
    manovrePMA: asStringArray(raw?.manovrePMA, DEFAULT_IMPOSTAZIONI.manovrePMA),
    presetDimissione: asStringArray(raw?.presetDimissione, DEFAULT_IMPOSTAZIONI.presetDimissione),
    mediciPma: asStringArray(raw?.mediciPma, DEFAULT_IMPOSTAZIONI.mediciPma),
    rankUtente,
    utenti,
    modalitaSviluppo: raw?.modalitaSviluppo === true,
    ordineMezziIds: asStringArray(raw?.ordineMezziIds, []),
    stazionamentiMezzo: Array.isArray(raw?.stazionamentiMezzo)
      ? asStazionamentiMezzoPreset(raw.stazionamentiMezzo)
      : DEFAULT_IMPOSTAZIONI.stazionamentiMezzo,
  }
}

export function migrateEvento(e: Evento): Evento {
  const legacy = e as Evento & { tipoEvento?: unknown; dettaglioEvento?: unknown }
  const { tipoEvento: _t, dettaglioEvento: _d, ...rest } = legacy
  void _t
  void _d
  return {
    ...rest,
    eventoInAttesa: e.eventoInAttesa ?? false,
    classificazioneSoccorso: e.classificazioneSoccorso ?? '',
    dettaglioClassificazioneSoccorso: e.dettaglioClassificazioneSoccorso ?? '',
    motivoSoccorso: e.motivoSoccorso ?? '',
    dettaglioMotivoSoccorso: e.dettaglioMotivoSoccorso ?? '',
    meteo: e.meteo ?? '',
    luogoTipo: e.luogoTipo ?? '',
    dettaglioLuogo: e.dettaglioLuogo ?? '',
    segnalatoDa: e.segnalatoDa ?? '',
  }
}

export function migrateMissione(m: Missione): Missione {
  return {
    ...m,
    esitoMissione: m.esitoMissione ?? '',
    noteMissione: m.noteMissione ?? '',
    statoRevision: typeof m.statoRevision === 'number' ? m.statoRevision : 0,
    telegramLastPosition: m.telegramLastPosition ?? undefined,
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
