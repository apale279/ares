import { useMemo, useState } from 'react'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'
import { PatientDetailModal } from '../components/PatientDetailModal'

export function PmaVista() {
  const impostazioni = useAresStore((s) => s.impostazioni)
  const pazienti = useAresStore((s) => s.pazienti)

  const [pmaSel, setPmaSel] = useState('')
  const [showDimessi, setShowDimessi] = useState(false)
  const [selectedPazienteId, setSelectedPazienteId] = useState<string | null>(null)

  const listaPma = impostazioni.pma.length > 0 ? impostazioni.pma : []

  const inPma = useMemo(() => {
    if (!pmaSel) return []
    return pazienti.filter(
      (p) =>
        p.esito === 'TRASPORTATO' &&
        p.tipoDestinazioneTrasporto === 'PMA' &&
        p.pmaDestinazione === pmaSel &&
        (showDimessi ? true : !p.trasportoCompletatoAt),
    )
  }, [pazienti, pmaSel, showDimessi])

  const inArrivo = useMemo(
    () => inPma.filter((p) => !p.pmaArrivoAt && !p.trasportoCompletatoAt),
    [inPma],
  )
  const inCarico = useMemo(
    () => inPma.filter((p) => !!p.pmaArrivoAt && !p.trasportoCompletatoAt),
    [inPma],
  )

  return (
    <div className="ares-settings ares-pma-page">
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
      <label className="ares-check">
        <input
          type="checkbox"
          checked={showDimessi}
          onChange={(e) => setShowDimessi(e.target.checked)}
        />
        Mostra anche dimessi / chiusi
      </label>
      {!listaPma.length && (
        <p className="ares-muted">
          Nessun PMA in elenco. Aggiungine in Impostazioni (sezione destinazioni).
        </p>
      )}
      {pmaSel && (
        <section className="ares-pma-layout">
          <aside className="ares-pma-left">
            <h2>{pmaSel}</h2>
            <p className="ares-muted">Arrivo: {inArrivo.length} · In carico: {inCarico.length}</p>
            <ul className="ares-list-compact">
              {inPma.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`ares-diario-side-item ares-pma-patient-chip ares-codice-${p.codiceTrasporto.toLowerCase()}`}
                    onClick={() => setSelectedPazienteId(p.id)}
                  >
                    <strong>{p.id}</strong> — {[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza anagrafica'}
                    {p.pmaArrivoAt ? ` · Arrivo ${formatDataOra(p.pmaArrivoAt)}` : ' · In arrivo'}
                    {p.trasportoCompletatoAt ? ` · Chiuso ${formatDataOra(p.trasportoCompletatoAt)}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="ares-pma-main">
            {selectedPazienteId ? (
              <PatientDetailModal
                onClose={() => setSelectedPazienteId(null)}
                compactForPma
                pazienteIdOverride={selectedPazienteId}
                embedded
              />
            ) : (
              <>
                <h2>Vista clinica a schermo pieno</h2>
                <p className="ares-muted">
                  Seleziona un paziente dalla colonna sinistra per aprire la scheda completa direttamente qui.
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
