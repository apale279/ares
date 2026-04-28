import { LABEL_STATO_MISSIONE } from '../constants'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'

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
  const terminaMissione = useAresStore((s) => s.terminaMissione)
  const avanzaMissione = useAresStore((s) => s.avanzaMissione)

  if (!missioneId || !missione) return null

  const mezzo = mezzi.find((m) => m.id === missione.mezzoId)
  const evento = eventi.find((e) => e.id === missione.eventoId)
  const eq = missione.equipaggio

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
          <p className="ares-muted">
            Mezzo: {mezzo?.sigla ?? missione.mezzoId} ({mezzo?.tipo ?? '—'})
          </p>
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

          <h3>Tempi degli stati</h3>
          <ol className="ares-timeline">
            {missione.statoHistory.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <strong>{LABEL_STATO_MISSIONE[h.stato]}</strong>
                <span className="ares-muted"> — {formatDataOra(h.at)}</span>
              </li>
            ))}
          </ol>

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
