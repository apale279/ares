import { LABEL_STATO_MISSIONE } from '../constants'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'
import { useState } from 'react'

function RowEq({
  label,
  p,
}: {
  label: string
  p: { nome: string; cognome: string; telefono: string }
}) {
  const s = [p.nome, p.cognome].filter(Boolean).join(' ')
  const t = [s, p.telefono].filter(Boolean).join(' · ')
  return (
    <tr>
      <td>{label}</td>
      <td>{t || '—'}</td>
    </tr>
  )
}

export function MissionDetailModal({
  onClose,
}: {
  onClose: () => void
}) {
  const missioneId = useAresStore((s) => s.modalMissioneId)
  const openModalEvento = useAresStore((s) => s.openModalEvento)
  const openModalMissione = useAresStore((s) => s.openModalMissione)
  const missione = useAresStore((s) =>
    s.modalMissioneId
      ? s.missioni.find((m) => m.id === s.modalMissioneId) ?? null
      : null,
  )
  const mezzi = useAresStore((s) => s.mezzi)
  const eventi = useAresStore((s) => s.eventi)
  const pazienti = useAresStore((s) => s.pazienti)
  const terminaMissione = useAresStore((s) => s.terminaMissione)
  const avanzaMissione = useAresStore((s) => s.avanzaMissione)
  const addTrattaMissione = useAresStore((s) => s.addTrattaMissione)
  const updateTrattaMissione = useAresStore((s) => s.updateTrattaMissione)
  const deleteTrattaMissione = useAresStore((s) => s.deleteTrattaMissione)
  const [trattaOpen, setTrattaOpen] = useState<string | null>(null)

  if (!missioneId || !missione) return null

  const mezzo = mezzi.find((m) => m.id === missione.mezzoId)
  const evento = eventi.find((e) => e.id === missione.eventoId)
  const eq = missione.equipaggio
  const pazientiTrasportati = pazienti.filter(
    (p) => p.eventoId === missione.eventoId && p.mezzoTrasportoId === missione.mezzoId,
  )
  const timeline = [
    ...missione.statoHistory.map((h) => ({
      kind: 'state' as const,
      at: h.at,
      key: `${h.at}-${h.stato}`,
      label: LABEL_STATO_MISSIONE[h.stato],
    })),
    ...(missione.tratte ?? []).map((t) => ({
      kind: 'tratta' as const,
      at: t.timestamp,
      key: t.id,
      label: t.titolo || 'Tratta',
      trattaId: t.id,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <div
      className="ares-modal-backdrop ares-modal-stack"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="ares-modal ares-modal--narrow"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>Missione {missione.id}</h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="ares-modal-scroll">
          <p className="ares-muted">
            Evento:{' '}
            <button
              type="button"
              className="ares-link-mission"
              onClick={() => {
                openModalMissione(null)
                openModalEvento(missione.eventoId)
              }}
            >
              {missione.eventoId}
            </button>
            {evento && ` · ${evento.indirizzo || '—'}`}
          </p>
          <p className="ares-muted">Codice missione: {missione.codice}</p>
          <p className="ares-muted">
            Mezzo: {mezzo?.sigla ?? missione.mezzoId} ({mezzo?.tipo ?? '—'})
          </p>
          <h3>Pazienti trasportati da questo mezzo sull'evento</h3>
          {pazientiTrasportati.length === 0 ? (
            <p className="ares-muted">Nessun paziente assegnato.</p>
          ) : (
            <ul className="ares-list-compact">
              {pazientiTrasportati.map((p) => (
                <li key={p.id}>
                  {p.id} · {[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza anagrafica'}
                </li>
              ))}
            </ul>
          )}
          <p>
            Stato attuale: <strong>{LABEL_STATO_MISSIONE[missione.stato]}</strong>
          </p>

          <h3>Equipaggio (alla creazione missione)</h3>
          <table className="ares-table ares-table-compact">
            <tbody>
              <RowEq label="Autista" p={eq.autista} />
              <RowEq label="Capo equipaggio / medico" p={eq.capoEquipaggio} />
              <RowEq label="Soccorritore 1" p={eq.soccorritore1} />
              <RowEq label="Soccorritore 2" p={eq.soccorritore2} />
            </tbody>
          </table>

          <h3>Tempi degli stati e tratte</h3>
          <ol className="ares-timeline">
            {timeline.map((item) => (
              <li key={item.key}>
                {item.kind === 'state' ? (
                  <strong>{item.label}</strong>
                ) : (
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() =>
                      setTrattaOpen((id) =>
                        id === item.trattaId ? null : (item.trattaId ?? null),
                      )
                    }
                  >
                    {item.label}
                  </button>
                )}
                <span className="ares-muted"> — {formatDataOra(item.at)}</span>
              </li>
            ))}
          </ol>

          <h3>Tratte</h3>
          <button
            type="button"
            className="ares-btn small secondary"
            onClick={() => addTrattaMissione(missione.id)}
          >
            Aggiungi tratta
          </button>
          <ul className="ares-list">
            {(missione.tratte ?? []).map((t) => (
              <li key={t.id} className="ares-card">
                <button
                  type="button"
                  className="ares-link-mission"
                  onClick={() => setTrattaOpen((id) => (id === t.id ? null : t.id))}
                >
                  {t.titolo || 'Tratta'} · {formatDataOra(t.timestamp)}
                </button>
                {trattaOpen === t.id && (
                  <div className="ares-form-grid tight">
                    <label className="full">
                      Data/ora
                      <input
                        type="datetime-local"
                        value={t.timestamp.slice(0, 16)}
                        onChange={(e) =>
                          updateTrattaMissione(missione.id, t.id, {
                            timestamp: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </label>
                    <label className="full">
                      Titolo
                      <input
                        value={t.titolo}
                        onChange={(e) =>
                          updateTrattaMissione(missione.id, t.id, {
                            titolo: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="full">
                      Destinazione
                      <input
                        value={t.destinazione}
                        onChange={(e) =>
                          updateTrattaMissione(missione.id, t.id, {
                            destinazione: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="full">
                      Descrizione
                      <textarea
                        rows={2}
                        value={t.descrizione}
                        onChange={(e) =>
                          updateTrattaMissione(missione.id, t.id, {
                            descrizione: e.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="ares-btn small danger"
                      onClick={() => {
                        deleteTrattaMissione(missione.id, t.id)
                        setTrattaOpen((id) => (id === t.id ? null : id))
                      }}
                    >
                      Elimina tratta
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="ares-inline ares-modal-actions">
            {missione.stato !== 'FINE_MISSIONE' && (
              <>
                <button
                  type="button"
                  className="ares-btn secondary"
                  onClick={() => avanzaMissione(missione.id)}
                >
                  Avanza stato
                </button>
                <button
                  type="button"
                  className="ares-btn warning"
                  onClick={() => {
                    if (
                      confirm(
                        'Terminare la missione? Il mezzo verrà liberato.',
                      )
                    )
                      terminaMissione(missione.id)
                  }}
                >
                  Termina missione
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
