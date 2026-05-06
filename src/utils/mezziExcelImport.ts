import type { Equipaggio, Mezzo, StatoMezzo } from '../types'
import { searchPhoton } from './photon'

export type MezziImportSummary = {
  /** Righe lette dal foglio (inclusa riga 1 titoli). */
  foglioRigheTotali: number
  /** Righe da trattare come dati = totale − 1 (riga 1 solo titoli). */
  righeDatiSenzaTitolo: number
  created: number
  updated: number
  /** Righe dati vuote o senza sigla (non importate). */
  skipped: number
  warnings: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function cell(row: unknown[], i: number): string {
  const v = row[i]
  if (v == null || v === '') return ''
  return String(v).trim()
}

/** Riga colonne F–Q (indici 5–16) da sheet EQUIPAGGI */
function buildEquipaggio(row: unknown[]): Equipaggio {
  return {
    autista: {
      nome: cell(row, 5),
      cognome: cell(row, 6),
      telefono: cell(row, 7),
    },
    capoEquipaggio: {
      nome: cell(row, 8),
      cognome: cell(row, 9),
      telefono: cell(row, 10),
    },
    soccorritore1: {
      nome: cell(row, 11),
      cognome: cell(row, 12),
      telefono: cell(row, 13),
    },
    soccorritore2: {
      nome: cell(row, 14),
      cognome: cell(row, 15),
      telefono: cell(row, 16),
    },
  }
}

/** Colonna R (indice 17): stato mezzo. Vuoto = nessun override in update / default in create. */
function parseStatoMezzoExcel(raw: string): StatoMezzo | null {
  const s = raw.trim()
  if (!s) return null
  const u = s.toUpperCase().replace(/\s+/g, '_')
  if (u === 'DISPONIBILE' || u === 'DISP' || u === 'LIBERO') return 'DISPONIBILE'
  if (u === 'OCCUPATO' || u === 'OCC' || u === 'IN_MISSIONE') return 'OCCUPATO'
  if (
    u === 'NON_DISPONIBILE' ||
    u === 'INDISPONIBILE' ||
    u === 'NOT_AVAILABLE' ||
    /^NON[\s_]*DISPON/i.test(s)
  ) {
    return 'NON_DISPONIBILE'
  }
  return null
}

function normalizeTipo(raw: string, tipiMezzo: string[]): string {
  const list = tipiMezzo.length ? tipiMezzo : ['MSB']
  const t = raw.trim()
  if (!t) return list[0]!
  const hit = list.find((x) => x.toLowerCase() === t.toLowerCase())
  return hit ?? list[0]!
}

async function resolveStazionamentoPhoton(
  text: string,
): Promise<{ stazionamento: string; lat: number | null; lng: number | null }> {
  const t = text.trim()
  if (t.length < 3) {
    return { stazionamento: t, lat: null, lng: null }
  }
  try {
    const hits = await searchPhoton(t, { limit: 1 })
    const h = hits[0]
    if (!h)
      return {
        stazionamento: t,
        lat: null,
        lng: null,
      }
    return {
      stazionamento: h.display_name || t,
      lat: h.lat,
      lng: h.lon,
    }
  } catch {
    return { stazionamento: t, lat: null, lng: null }
  }
}

function pickEquipaggiSheet(
  wb: import('xlsx').WorkBook,
): import('xlsx').WorkSheet | null {
  const upper = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'EQUIPAGGI')
  const name = upper ?? wb.SheetNames[0]
  if (!name) return null
  return wb.Sheets[name] ?? null
}

/**
 * Importa righe dal foglio EQUIPAGGI (primo foglio se manca il nome).
 * La **riga 1** del foglio è solo intestazione colonne e non viene importata.
 * Colonne A–Q come da specifica; colonna R = stato (DISPONIBILE / OCCUPATO / NON DISPONIBILE).
 * Tipo non in elenco → primo tipo in impostazioni.
 * Stazionamento col. E geocodificato (Photon/Mapbox+Nominatim). Sigla duplicata → update.
 */
export async function importMezziFromExcelBuffer(
  buffer: ArrayBuffer,
  deps: {
    tipiMezzo: string[]
    getMezzi: () => Mezzo[]
    addMezzo: (
      partial: Omit<Mezzo, 'id' | 'equipaggio' | 'stato'> & {
        equipaggio?: Mezzo['equipaggio']
        stato?: Mezzo['stato']
      },
    ) => string
    updateMezzo: (id: string, patch: Partial<Mezzo>) => void
    geoDelayMs?: number
  },
): Promise<MezziImportSummary> {
  const XLSX = await import('xlsx')
  const geoDelay = deps.geoDelayMs ?? 450
  const summary: MezziImportSummary = {
    foglioRigheTotali: 0,
    righeDatiSenzaTitolo: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
  }

  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = pickEquipaggiSheet(wb)
  if (!sheet) {
    summary.warnings.push('File senza fogli leggibili.')
    return summary
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][]

  summary.foglioRigheTotali = rows.length
  summary.righeDatiSenzaTitolo = Math.max(0, rows.length - 1)

  let geocodeCallCount = 0
  /** Riga 1 (indice 0) = titoli colonne, mai importata. */
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!Array.isArray(row) || row.every((c) => String(c ?? '').trim() === '')) {
      summary.skipped++
      continue
    }

    const sigla = cell(row, 1)
    if (!sigla) {
      summary.skipped++
      continue
    }

    const tipo = normalizeTipo(cell(row, 0), deps.tipiMezzo)
    if (cell(row, 0) && tipo !== cell(row, 0).trim()) {
      const orig = cell(row, 0)
      if (!deps.tipiMezzo.some((x) => x.toLowerCase() === orig.toLowerCase())) {
        summary.warnings.push(
          `Riga ${i + 1} (${sigla}): tipo «${orig}» non in elenco, usato «${tipo}».`,
        )
      }
    }

    const siglaRadio = cell(row, 2)
    const targa = cell(row, 3)
    const equipaggio = buildEquipaggio(row)

    const stazText = cell(row, 4)
    const statoRaw = cell(row, 17)
    const statoParsed = parseStatoMezzoExcel(statoRaw)

    let geo: { stazionamento: string; lat: number | null; lng: number | null }
    if (stazText.length >= 3) {
      if (geocodeCallCount > 0) await sleep(geoDelay)
      geocodeCallCount++
      geo = await resolveStazionamentoPhoton(stazText)
    } else {
      geo = { stazionamento: stazText, lat: null, lng: null }
    }
    if (stazText.length >= 3 && geo.lat == null) {
      summary.warnings.push(
        `Riga ${i + 1} (${sigla}): stazionamento non geocodificato, salvato solo testo.`,
      )
    }

    const existing = deps
      .getMezzi()
      .find((m) => m.sigla.trim().toLowerCase() === sigla.toLowerCase())

    if (existing) {
      const patch: Partial<Mezzo> = {
        tipo,
        sigla,
        siglaRadio,
        targa,
        stazionamento: geo.stazionamento,
        stazionamentoLat: geo.lat,
        stazionamentoLng: geo.lng,
        equipaggio,
      }
      if (statoRaw) {
        if (statoParsed) patch.stato = statoParsed
        else {
          summary.warnings.push(
            `Riga ${i + 1} (${sigla}): stato «${statoRaw}» non riconosciuto, lasciato invariato.`,
          )
        }
      }
      deps.updateMezzo(existing.id, patch)
      summary.updated++
    } else {
      if (statoRaw && !statoParsed) {
        summary.warnings.push(
          `Riga ${i + 1} (${sigla}): stato «${statoRaw}» non riconosciuto, usato DISPONIBILE.`,
        )
      }
      deps.addMezzo({
        tipo,
        sigla,
        siglaRadio,
        targa,
        stazionamento: geo.stazionamento,
        stazionamentoLat: geo.lat,
        stazionamentoLng: geo.lng,
        posizioneRealeLat: null,
        posizioneRealeLng: null,
        posizioneRealeAt: null,
        equipaggio,
        stato: statoParsed ?? 'DISPONIBILE',
      })
      summary.created++
    }
  }

  return summary
}
