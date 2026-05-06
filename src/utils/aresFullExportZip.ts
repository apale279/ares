import type {
  Evento,
  Impostazioni,
  LayoutPannelli,
  Mezzo,
  Missione,
  Nota,
  Paziente,
  Valutazione,
} from '../types'

export type AresDatabaseExportSnapshot = {
  impostazioni: Impostazioni
  eventi: Evento[]
  missioni: Missione[]
  mezzi: Mezzo[]
  pazienti: Paziente[]
  note: Nota[]
  valutazioni: Valutazione[]
  idSeqSalt: string
  idSaltMezzo: string
  idSaltEvento: string
  idSaltPaziente: string
  idSaltMissione: string
  nextIdMezzo: number
  nextIdEvento: number
  nextIdMissione: number
  nextIdPaziente: number
  layout: LayoutPannelli
  layoutVersion: number
}

function cellValue(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function rowsFromObjects(items: unknown[]): Record<string, string>[] {
  if (items.length === 0) {
    return [{ _vuoto: '(nessun record)' }]
  }
  return items.map((item) => {
    const row: Record<string, string> = {}
    if (item && typeof item === 'object') {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        row[k] = cellValue(v)
      }
    } else {
      row.valore = cellValue(item)
    }
    return row
  })
}

function impostazioniRows(imp: Impostazioni): Record<string, string>[] {
  const raw = imp as unknown as Record<string, unknown>
  return Object.keys(raw).map((k) => ({
    chiave: k,
    valore_json: JSON.stringify(raw[k]),
  }))
}

function metaRows(s: AresDatabaseExportSnapshot): Record<string, string>[] {
  return [
    { chiave: 'idSeqSalt_legacy', valore: s.idSeqSalt },
    { chiave: 'idSaltMezzo', valore: s.idSaltMezzo },
    { chiave: 'idSaltEvento', valore: s.idSaltEvento },
    { chiave: 'idSaltPaziente', valore: s.idSaltPaziente },
    { chiave: 'idSaltMissione', valore: s.idSaltMissione },
    { chiave: 'nextIdMezzo', valore: String(s.nextIdMezzo) },
    { chiave: 'nextIdEvento', valore: String(s.nextIdEvento) },
    { chiave: 'nextIdMissione', valore: String(s.nextIdMissione) },
    { chiave: 'nextIdPaziente', valore: String(s.nextIdPaziente) },
    { chiave: 'layoutVersion', valore: String(s.layoutVersion) },
    { chiave: 'layout', valore: JSON.stringify(s.layout) },
  ]
}

function workbookFromRows(
  XLSX: typeof import('xlsx'),
  rows: Record<string, string>[],
  sheetName: string,
): import('xlsx').WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  const safeName = sheetName.slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, safeName)
  return wb
}

function xlsxUint8(
  XLSX: typeof import('xlsx'),
  wb: import('xlsx').WorkBook,
): Uint8Array {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Uint8Array(out)
}

/**
 * ZIP con un file .xlsx per entità (stato persistito ARES). Oggetti annidati in celle JSON.
 */
export async function buildAresDatabaseExportZip(
  data: AresDatabaseExportSnapshot,
): Promise<Blob> {
  const [XLSX, { default: JSZip }] = await Promise.all([
    import('xlsx'),
    import('jszip'),
  ])

  const zip = new JSZip()

  const add = (filename: string, rows: Record<string, string>[]) => {
    const wb = workbookFromRows(XLSX, rows, 'dati')
    zip.file(filename, xlsxUint8(XLSX, wb), { compression: 'DEFLATE' })
  }

  add('eventi.xlsx', rowsFromObjects(data.eventi as unknown[]))
  add('missioni.xlsx', rowsFromObjects(data.missioni as unknown[]))
  add('mezzi.xlsx', rowsFromObjects(data.mezzi as unknown[]))
  add('pazienti.xlsx', rowsFromObjects(data.pazienti as unknown[]))
  add('note.xlsx', rowsFromObjects(data.note as unknown[]))
  add('valutazioni.xlsx', rowsFromObjects(data.valutazioni as unknown[]))
  add('impostazioni.xlsx', impostazioniRows(data.impostazioni))
  add('meta_sequenze_layout.xlsx', metaRows(data))

  return zip.generateAsync({ type: 'blob' })
}
