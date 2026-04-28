import { useMemo, useState } from 'react'
import { LABEL_STATO_MISSIONE } from '../constants'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'

export function MezzoVista() {
  const mezzi = useAresStore((s) => s.mezzi)
  const missioni = useAresStore((s) => s.missioni)
  const eventi = useAresStore((s) => s.eventi)
  const [mezzoId, setMezzoId] = useState('')

  const mezziOrdinati = useMemo(
    () => [...mezzi].sort((a, b) => a.sigla.localeCompare(b.sigla, 'it')),
    [mezzi],
  )

  const active = useMemo(() => {
    if (!mezzoId) return null
    const mezzo = mezzi.find((m) => m.id === mezzoId) ?? null
    if (!mezzo) return null

    const missioniMezzo = missioni
      .filter((m) => m.mezzoId === mezzo.id && m.stato !== 'FINE_MISSIONE')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    for (const missione of missioniMezzo) {
      const evento = eventi.find((e) => e.id === missione.eventoId)
      if (!evento || evento.stato === 'CHIUSO') continue
      return { mezzo, missione, evento }
    }
    return { mezzo, missione: null, evento: null }
  }, [mezzoId, mezzi, missioni, eventi])

  return (
    <div className="ares-mezzo-vista">
      <h1>Vista mezzo</h1>
      <p className="ares-muted">
        Vista rapida per telefono: seleziona una sigla e vedi solo evento e
        missione attivi del mezzo.
      </p>

      <div className="ares-mezzo-card">
        <label>
          Sigla mezzo
          <select value={mezzoId} onChange={(e) => setMezzoId(e.target.value)}>
            <option value="">— Seleziona mezzo —</option>
            {mezziOrdinati.map((m) => (
              <option key={m.id} value={m.id}>
                {m.sigla} ({m.tipo})
              </option>
            ))}
          </select>
        </label>
      </div>

      {mezzoId && active?.missione && active.evento ? (
        <div className="ares-mezzo-card">
          <h2>
            {active.mezzo.sigla} · {active.mezzo.stato}
          </h2>
          <div className="ares-mezzo-block">
            <h3>Evento attivo {active.evento.id}</h3>
            <p>
              <strong>Codice:</strong> {active.evento.codice}
            </p>
            <p>
              <strong>Tipo:</strong>{' '}
              {active.evento.tipoEvento === 'NON_NOTO'
                ? 'NON NOTO'
                : active.evento.tipoEvento}
            </p>
            <p>
              <strong>Dettaglio:</strong> {active.evento.dettaglioEvento || '—'}
            </p>
            <p>
              <strong>Indirizzo:</strong> {active.evento.indirizzo || '—'}
            </p>
            <p>
              <strong>Segnalato da:</strong> {active.evento.segnalatoDa || '—'}
            </p>
            {active.evento.descrizione && (
              <p>
                <strong>Descrizione:</strong> {active.evento.descrizione}
              </p>
            )}
          </div>

          <div className="ares-mezzo-block">
            <h3>Missione attiva {active.missione.id}</h3>
            <p>
              <strong>Stato:</strong> {LABEL_STATO_MISSIONE[active.missione.stato]}
            </p>
            <p>
              <strong>Aperta:</strong> {formatDataOra(active.missione.createdAt)}
            </p>
          </div>
        </div>
      ) : mezzoId && active?.mezzo ? (
        <div className="ares-mezzo-card">
          <h2>{active.mezzo.sigla}</h2>
          <p className="ares-muted">
            Nessuna missione attiva visibile per questo mezzo.
          </p>
          <p className="ares-muted">
            Gli eventi chiusi non vengono mostrati in questa vista.
          </p>
        </div>
      ) : null}
    </div>
  )
}
