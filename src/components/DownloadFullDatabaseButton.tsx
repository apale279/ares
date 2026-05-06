import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAresStore } from '../store/aresStore'
import { buildAresDatabaseExportZip } from '../utils/aresFullExportZip'
import { hasFullAppPrivileges } from '../utils/isAdminUser'

export function DownloadFullDatabaseButton() {
  const { session } = useAuth()
  const impostazioni = useAresStore((s) => s.impostazioni)
  const [busy, setBusy] = useState(false)

  if (!hasFullAppPrivileges(impostazioni, session?.userId)) return null

  const run = async () => {
    setBusy(true)
    try {
      const s = useAresStore.getState()
      const blob = await buildAresDatabaseExportZip({
        impostazioni: s.impostazioni,
        eventi: s.eventi,
        missioni: s.missioni,
        mezzi: s.mezzi,
        pazienti: s.pazienti,
        note: s.note,
        valutazioni: s.valutazioni,
        idSeqSalt: s.idSeqSalt,
        idSaltMezzo: s.idSaltMezzo,
        idSaltEvento: s.idSaltEvento,
        idSaltPaziente: s.idSaltPaziente,
        idSaltMissione: s.idSaltMissione,
        nextIdMezzo: s.nextIdMezzo,
        nextIdEvento: s.nextIdEvento,
        nextIdMissione: s.nextIdMissione,
        nextIdPaziente: s.nextIdPaziente,
        layout: s.layout,
        layoutVersion: s.layoutVersion,
      })
      const name = `ares_db_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      window.alert(
        `Esportazione fallita: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ares-settings-entity-panel ares-admin-export">
      <h2>Export database (solo ADMIN)</h2>
      <p className="ares-muted">
        Scarica uno ZIP con un file Excel per entità: eventi, missioni, mezzi, pazienti,
        note, valutazioni, impostazioni (chiave + JSON), più meta (sequenze ID e layout
        dashboard). Campi complessi (equipaggio, tratte, ecc.) sono in JSON nella cella.
      </p>
      <button
        type="button"
        className="ares-btn secondary"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Preparazione…' : 'Scarica tutto'}
      </button>
    </section>
  )
}
