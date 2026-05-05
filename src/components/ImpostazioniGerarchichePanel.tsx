import { testoMultirigaDaVoci, vociDaTestoMultiriga } from '../utils/textLists'
import type { VociPerGenitore } from '../types'
import { useEffect, useState } from 'react'

/** Per ogni riga dell’elenco genitore, una textarea con i dettagli possibili (una per riga). */
export function ImpostazioniGerarchichePanel({
  title,
  description,
  genitori,
  gerarchia,
  onSave,
  showHeading = true,
}: {
  title: string
  description: string
  genitori: string[]
  gerarchia: VociPerGenitore
  onSave: (next: VociPerGenitore) => void
  /** Se false, non mostra il titolo (es. quando il titolo è nel summary esterno). */
  showHeading?: boolean
}) {
  const [local, setLocal] = useState<Record<string, string>>({})
  const genitoriKey = genitori.slice().sort().join('\n')
  const gerarchiaKey = JSON.stringify(gerarchia)
  useEffect(() => {
    const out: Record<string, string> = {}
    const keys =
      genitori.length > 0
        ? genitori
        : Object.keys(gerarchia ?? {}).sort((a, b) =>
            a.localeCompare(b, 'it'),
          )
    for (const g of keys) {
      const voci = gerarchia[g] ?? []
      out[g] = testoMultirigaDaVoci(voci)
    }
    setLocal(out)
  }, [gerarchiaKey, genitoriKey, genitori, gerarchia])

  const effectiveParents =
    genitori.length > 0
      ? genitori
      : Object.keys(gerarchia ?? {}).sort((a, b) => a.localeCompare(b, 'it'))

  const saveNow = () => {
    const next: VociPerGenitore = {}
    for (const g of effectiveParents) {
      const txt = local[g] ?? ''
      next[g] = vociDaTestoMultiriga(txt)
    }
    onSave(next)
  }

  return (
    <section className="ares-settings-entity-panel">
      {showHeading && title ? <h2>{title}</h2> : null}
      <p className="ares-muted">{description}</p>
      {effectiveParents.length === 0 ? (
        <p className="ares-muted">
          Aggiungi prima le voci del menu principale (elenco sopra).
        </p>
      ) : (
        <>
          <div className="ares-form-grid tight">
            {effectiveParents.map((g) => (
              <label key={g} className="full">
                Dettaglio per «{g}» (uno per riga)
                <textarea
                  className="ares-settings-textarea"
                  rows={4}
                  value={local[g] ?? ''}
                  spellCheck={false}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, [g]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" className="ares-btn primary" onClick={saveNow}>
            Salva dettaglio per classificazione
          </button>
        </>
      )}
    </section>
  )
}
