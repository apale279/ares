import {
  LABEL_STATO_MISSIONE,
  MISSION_STATE_ORDER,
  prossimoStatoMissione,
} from '../constants'
import type { StatoMissione } from '../types'
import { useAresStore } from '../store/aresStore'
import { shortAddress } from '../utils/address'
import { formatDataOra } from '../utils/format'
import { useMemo, useState } from 'react'

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
  const updateMissioneStato = useAresStore((s) => s.updateMissioneStato)
  const patchMissioneStatoHistoryAt = useAresStore((s) => s.patchMissioneStatoHistoryAt)
  const updateMissione = useAresStore((s) => s.updateMissione)
  const impostazioni = useAresStore((s) => s.impostazioni)
  const addTrattaMissione = useAresStore((s) => s.addTrattaMissione)
  const updateTrattaMissione = useAresStore((s) => s.updateTrattaMissione)
  const deleteTrattaMissione = useAresStore((s) => s.deleteTrattaMissione)
  const [trattaOpen, setTrattaOpen] = useState<string | null>(null)
  const [forzaTarget, setForzaTarget] = useState<StatoMissione | ''>('')

  const timelineUnified = useMemo(() => {
    if (!missione) return []
    const states = missione.statoHistory.map((h, histIndex) => ({
      kind: 'state' as const,
      key: `st-${histIndex}-${h.at}-${h.stato}`,
      histIndex,
      stato: h.stato,
      at: h.at,
    }))
    const tratte = (missione.tratte ?? []).map((t) => ({
      kind: 'tratta' as const,
      key: `tr-${t.id}`,
      trattaId: t.id,
      titolo: t.titolo || 'Tratta',
      at: t.timestamp,
    }))
    return [...states, ...tratte].sort((a, b) => a.at.localeCompare(b.at))
  }, [missione])

  if (!missioneId || !missione) return null

  const mezzo = mezzi.find((m) => m.id === missione.mezzoId)
  const evento = eventi.find((e) => e.id === missione.eventoId)
  const eq = missione.equipaggio
  const pazientiTrasportati = pazienti.filter(
    (p) => p.eventoId === missione.eventoId && p.mezzoTrasportoId === missione.mezzoId,
  )
  const currentStateIndex = MISSION_STATE_ORDER.indexOf(missione.stato)
  const nextState = prossimoStatoMissione(missione.stato)
  const canAdvance = nextState !== missione.stato

  const statiForcabili = MISSION_STATE_ORDER.filter((s) => {
    if (s === missione.stato) return false
    const i = MISSION_STATE_ORDER.indexOf(s)
    if (s === 'FINE_MISSIONE') return missione.stato !== 'FINE_MISSIONE'
    if (currentStateIndex < 0) return true
    return i > currentStateIndex
  })

  const trattaById = new Map((missione.tratte ?? []).map((t) => [t.id, t]))

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
            {evento && ` · ${shortAddress(evento.indirizzo) || '—'}`}
          </p>
          <p className="ares-muted">Codice missione: {missione.codice}</p>
          <p className="ares-muted">
            Mezzo: {mezzo?.sigla ?? missione.mezzoId} ({mezzo?.tipo ?? '—'})
          </p>
          <h3>Pazienti trasportati da questo mezzo sull&apos;evento</h3>
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
            Stato attuale:{' '}
            <strong>{LABEL_STATO_MISSIONE[missione.stato]}</strong>
          </p>

          <label className="full">
            Esito missione
            <select
              value={missione.esitoMissione}
              onChange={(e) =>
                updateMissione(missione.id, { esitoMissione: e.target.value })
              }
            >
              <option value="">—</option>
              {impostazioni.esitiMissione.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Note missione
            <textarea
              rows={4}
              value={missione.noteMissione}
              onChange={(e) =>
                updateMissione(missione.id, { noteMissione: e.target.value })
              }
            />
          </label>

          <details className="ares-mission-collapsible">
            <summary>Equipaggio (alla creazione missione)</summary>
            <table className="ares-table ares-table-compact">
              <tbody>
                <RowEq label="Autista" p={eq.autista} />
                <RowEq label="Capo equipaggio / medico" p={eq.capoEquipaggio} />
                <RowEq label="Soccorritore 1" p={eq.soccorritore1} />
                <RowEq label="Soccorritore 2" p={eq.soccorritore2} />
              </tbody>
            </table>
          </details>

          <h3>Cronologia stati e tratte</h3>
          <p className="ares-muted">
            Elenco unico ordinato per data/ora. Puoi correggere gli orari degli stati; per
            saltare passaggi intermedi usa «Forza stato» sotto.
          </p>
          <ol className="ares-timeline">
            {timelineUnified.map((item) =>
              item.kind === 'state' ? (
                <li key={item.key}>
                  <div className="ares-form-grid tight" style={{ marginTop: 4 }}>
                    <strong className="full">{LABEL_STATO_MISSIONE[item.stato]}</strong>
                    <label className="full">
                      Data/ora
                      <input
                        type="datetime-local"
                        value={item.at.slice(0, 16)}
                        onChange={(e) =>
                          patchMissioneStatoHistoryAt(
                            missione.id,
                            item.histIndex,
                            new Date(e.target.value).toISOString(),
                          )
                        }
                      />
                    </label>
                  </div>
                </li>
              ) : (
                <li key={item.key}>
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() =>
                      setTrattaOpen((id) =>
                        id === item.trattaId ? null : item.trattaId,
                      )
                    }
                  >
                    {item.titolo}
                  </button>
                  <span className="ares-muted">
                    {' '}
                    — {formatDataOra(item.at)}
                  </span>
                  {item.trattaId && trattaOpen === item.trattaId ? (
                    (() => {
                      const t = trattaById.get(item.trattaId)
                      if (!t) return null
                      return (
                        <div className="ares-form-grid tight" style={{ marginTop: 8 }}>
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
                      )
                    })()
                  ) : null}
                </li>
              ),
            )}
          </ol>

          <button
            type="button"
            className="ares-btn secondary"
            style={{ marginTop: 8 }}
            onClick={() => addTrattaMissione(missione.id)}
          >
            Aggiungi tratta
          </button>

          <div className="ares-form-grid tight" style={{ marginTop: 16 }}>
            <label className="full">
              Forza stato (salta stati intermedi)
              <select
                value={forzaTarget}
                onChange={(e) =>
                  setForzaTarget(e.target.value as StatoMissione | '')
                }
              >
                <option value="">— Scegli stato —</option>
                {statiForcabili.map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATO_MISSIONE[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ares-inline ares-modal-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="ares-btn secondary"
              disabled={!forzaTarget}
              onClick={() => {
                if (!forzaTarget) return
                updateMissioneStato(missione.id, forzaTarget)
                setForzaTarget('')
              }}
            >
              Applica stato
            </button>
            {missione.stato !== 'FINE_MISSIONE' && (
              <>
                <button
                  type="button"
                  className="ares-btn secondary"
                  onClick={() => avanzaMissione(missione.id)}
                  disabled={!canAdvance}
                >
                  {canAdvance ? `Avanza: ${LABEL_STATO_MISSIONE[nextState]}` : 'Completata'}
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
