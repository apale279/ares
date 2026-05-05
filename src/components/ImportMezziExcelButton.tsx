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
            const elaborati = sum.created + sum.updated + sum.skipped
            const conteggioOk =
              sum.righeDatiSenzaTitolo === 0 ||
              elaborati === sum.righeDatiSenzaTitolo
            const righeMsg = [
              `Righe nel foglio (totale): ${sum.foglioRigheTotali}.`,
              `Righe dati (totale − 1, esclusa riga 1 titoli): ${sum.righeDatiSenzaTitolo}.`,
              `Creati: ${sum.created} · Aggiornati (stessa sigla): ${sum.updated} · Saltate (vuote o senza sigla): ${sum.skipped}.`,
              conteggioOk
                ? `Verifica conteggio: ${elaborati} = ${sum.righeDatiSenzaTitolo} righe dati elaborate.`
                : `Attenzione: somma ${elaborati} diversa da righe dati attese (${sum.righeDatiSenzaTitolo}).`,
            ].join('\n')
            window.alert(`Importazione completata.\n\n${righeMsg}${w}`)
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
