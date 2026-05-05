import { useRef, useState } from 'react'
import { useAresStore } from '../store/aresStore'
import { importMezziFromExcelBuffer } from '../utils/mezziExcelImport'

export function ImportMezziExcelButton({
  tipiMezzo,
}: {
  tipiMezzo: string[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const addMezzo = useAresStore((s) => s.addMezzo)
  const updateMezzo = useAresStore((s) => s.updateMezzo)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            const buffer = await file.arrayBuffer()
            const sum = await importMezziFromExcelBuffer(buffer, {
              tipiMezzo,
              getMezzi: () => useAresStore.getState().mezzi,
              addMezzo,
              updateMezzo,
            })
            const w =
              sum.warnings.length > 0
                ? `\n\nAvvisi:\n${sum.warnings.slice(0, 15).join('\n')}${sum.warnings.length > 15 ? '\n…' : ''}`
                : ''
            window.alert(
              `Importazione completata.\nCreati: ${sum.created}\nAggiornati (stessa sigla): ${sum.updated}\nRighe saltate (vuote/intestazione): ${sum.skipped}.${w}`,
            )
          } catch (err) {
            console.error(err)
            window.alert(
              `Errore lettura file Excel: ${err instanceof Error ? err.message : String(err)}`,
            )
          } finally {
            setBusy(false)
          }
        }}
      />
      <button
        type="button"
        className="ares-btn secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Importazione…' : 'Importa da Excel'}
      </button>
    </>
  )
}
