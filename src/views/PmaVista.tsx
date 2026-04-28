import { useMemo, useState } from 'react'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'

export function PmaVista() {
  const impostazioni = useAresStore((s) => s.impostazioni)
  const pazienti = useAresStore((s) => s.pazienti)
  const openModalPaziente = useAresStore((s) => s.openModalPaziente)

  const [pmaSel, setPmaSel] = useState('')

  const listaPma = impostazioni.pma.length > 0 ? impostazioni.pma : []

  const inPma = useMemo(() => {
    if (!pmaSel) return []
    return pazienti.filter(
      (p) =>
        p.esito === 'TRASPORTATO' &&
        p.tipoDestinazioneTrasporto === 'PMA' &&
        p.pmaDestinazione === pmaSel &&
        !p.trasportoCompletatoAt,
    )
  }, [pazienti, pmaSel])

  return (
    <div className="ares-settings">
      <h1>PMA</h1>
      <p className="ares-muted">
        Seleziona una postazione PMA. Compaiono i pazienti in destinazione PMA
        dopo l’arrivo in H (non ancora chiusi con esito valutazione PMA).
      </p>
      <div className="ares-form-grid tight" style={{ maxWidth: 480 }}>
        <label className="full">
          Postazione PMA
          <select
            value={pmaSel}
            onChange={(e) => setPmaSel(e.target.value)}
          >
            <option value="">— Seleziona un PMA —</option>
            {listaPma.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!listaPma.length && (
        <p className="ares-muted">
          Nessun PMA in elenco. Aggiungine in Impostazioni (sezione destinazioni).
        </p>
      )}
      {pmaSel && (
        <section className="ares-settings-entity-panel" style={{ marginTop: 20 }}>
          <h2>Pazienti in {pmaSel} ({inPma.length})</h2>
          {inPma.length === 0 ? (
            <p className="ares-muted">Nessun paziente assegnato a questo PMA.</p>
          ) : (
            <ul className="ares-search-list">
              {inPma.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() => openModalPaziente(p.id)}
                  >
                    {p.id}
                  </button>
                  <span className="ares-muted">
                    {' '}
                    — {[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza anagrafica'}
                    {p.pmaArrivoAt && (
                      <> · Arrivo {formatDataOra(p.pmaArrivoAt)}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
