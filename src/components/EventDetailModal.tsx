import { useMemo, useState } from 'react'
import type { CodiceEvento, TipoEvento } from '../types'
import { CODICE_EVENTO_COLOR, LABEL_STATO_MISSIONE } from '../constants'
import { dettagliPerTipo, useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'
import { geocodeIndirizzo } from '../utils/geocode'
import { distanzaKm } from '../utils/geoDistance'
import { PhotonAddressField } from './PhotonAddressField'

export function EventDetailModal({ onClose }: { onClose: () => void }) {
  const eventoId = useAresStore((s) => s.modalEventoId)
  const openModalMissione = useAresStore((s) => s.openModalMissione)
  const openModalPaziente = useAresStore((s) => s.openModalPaziente)
  const evento = useAresStore((s) =>
    s.modalEventoId ? s.eventi.find((e) => e.id === s.modalEventoId) ?? null : null,
  )
  const impostazioni = useAresStore((s) => s.impostazioni)
  const missioni = useAresStore((s) => s.missioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const eventi = useAresStore((s) => s.eventi)
  const pazienti = useAresStore((s) => s.pazienti)

  const updateEvento = useAresStore((s) => s.updateEvento)
  const chiudiEvento = useAresStore((s) => s.chiudiEvento)
  const deleteEvento = useAresStore((s) => s.deleteEvento)
  const addMissione = useAresStore((s) => s.addMissione)
  const deleteMissione = useAresStore((s) => s.deleteMissione)
  const avanzaMissione = useAresStore((s) => s.avanzaMissione)
  const terminaMissione = useAresStore((s) => s.terminaMissione)
  const addPaziente = useAresStore((s) => s.addPaziente)
  const requestMapFocus = useAresStore((s) => s.requestMapFocus)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [mezzoMissione, setMezzoMissione] = useState('')
  const [geoBusy, setGeoBusy] = useState(false)

  const missioniEv = useMemo(
    () => missioni.filter((m) => m.eventoId === eventoId),
    [missioni, eventoId],
  )

  const pazientiEv = useMemo(
    () => pazienti.filter((p) => p.eventoId === eventoId),
    [pazienti, eventoId],
  )

  const mezziDisponibiliOrdinati = useMemo(() => {
    const disp = mezzi.filter((m) => m.stato === 'DISPONIBILE')
    const ev = eventi.find((e) => e.id === eventoId)
    if (!ev?.lat || !ev?.lng) return disp
    const { lat, lng } = ev
    return [...disp].sort((a, b) => {
      const da =
        a.stazionamentoLat != null && a.stazionamentoLng != null
          ? distanzaKm(lat, lng, a.stazionamentoLat, a.stazionamentoLng)
          : Number.POSITIVE_INFINITY
      const db =
        b.stazionamentoLat != null && b.stazionamentoLng != null
          ? distanzaKm(lat, lng, b.stazionamentoLat, b.stazionamentoLng)
          : Number.POSITIVE_INFINITY
      return da - db
    })
  }, [mezzi, eventi, eventoId])

  if (!eventoId || !evento) return null

  const dettagli = dettagliPerTipo(impostazioni, evento.tipoEvento)

  const cercaCoordinateOra = async () => {
    if (evento.indirizzoLimitato) return
    const addr = evento.indirizzo.trim()
    if (addr.length < 3) return
    setGeoBusy(true)
    try {
      const hit = await geocodeIndirizzo(addr)
      if (hit) updateEvento(evento.id, { lat: hit.lat, lng: hit.lng })
      else alert('Indirizzo non trovato.')
    } finally {
      setGeoBusy(false)
    }
  }

  return (
    <div className="ares-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ares-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ares-event-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2 id="ares-event-title">Evento {evento.id}</h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>

        <div className="ares-modal-scroll">
          <p className="ares-muted">
            Creato: {formatDataOra(evento.createdAt)} · Stato:{' '}
            <strong>{evento.stato}</strong>
          </p>

          <section className="ares-section">
            <h3 className="ares-section-title">Info logistiche</h3>
            <label className="ares-check">
              <input
                type="checkbox"
                checked={evento.indirizzoLimitato}
                onChange={(e) =>
                  updateEvento(evento.id, {
                    indirizzoLimitato: e.target.checked,
                  })
                }
              />
              Evento limitato (testo libero, senza indirizzo stradale)
            </label>
            {evento.indirizzoLimitato ? (
              <label>
                Luogo / settore
                <input
                  value={evento.indirizzo}
                  onChange={(e) =>
                    updateEvento(evento.id, { indirizzo: e.target.value })
                  }
                />
              </label>
            ) : (
              <label>
                Indirizzo (Photon)
                <PhotonAddressField
                  value={
                    evento.lat != null && evento.lng != null
                      ? {
                          display_name: evento.indirizzo,
                          lat: evento.lat,
                          lon: evento.lng,
                        }
                      : null
                  }
                  previewText={
                    evento.lat != null && evento.lng != null ? '' : evento.indirizzo
                  }
                  placeholder="Cerca un indirizzo in Italia (via, piazza, comune…)"
                  onDraftCommit={(text) =>
                    updateEvento(evento.id, {
                      indirizzo: text,
                    })
                  }
                  onChange={(hit) => {
                    if (!hit) {
                      updateEvento(evento.id, {
                        indirizzo: '',
                        lat: null,
                        lng: null,
                      })
                      return
                    }
                    updateEvento(evento.id, {
                      indirizzo: hit.display_name,
                      lat: hit.lat,
                      lng: hit.lon,
                    })
                  }}
                />
              </label>
            )}
            {!evento.indirizzoLimitato && (
              <>
                <div className="ares-form-grid tight">
                  <label>
                    Lat
                    <input
                      type="number"
                      step="any"
                      value={evento.lat ?? ''}
                      onChange={(e) =>
                        updateEvento(evento.id, {
                          lat:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Lng
                    <input
                      type="number"
                      step="any"
                      value={evento.lng ?? ''}
                      onChange={(e) =>
                        updateEvento(evento.id, {
                          lng:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="ares-btn-row-2">
                  <button
                    type="button"
                    className="ares-btn secondary"
                    disabled={geoBusy}
                    onClick={() => cercaCoordinateOra()}
                  >
                    Aggiorna punto da indirizzo
                  </button>
                  <button
                    type="button"
                    className="ares-btn secondary"
                    disabled={evento.lat == null || evento.lng == null}
                    onClick={() =>
                      requestMapFocus(evento.lat!, evento.lng!)
                    }
                  >
                    Mostra sulla mappa
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="ares-section">
            <h3 className="ares-section-title">Info evento</h3>
            <div className="ares-stack-fields">
              <div>
                <span className="ares-label">Tipo evento</span>
                <div className="ares-seg">
                  {(['MEDICO', 'TRAUMA', 'NON_NOTO'] as TipoEvento[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        className={
                          evento.tipoEvento === t
                            ? 'ares-seg-btn active'
                            : 'ares-seg-btn'
                        }
                        onClick={() => updateEvento(evento.id, { tipoEvento: t })}
                      >
                        {t === 'NON_NOTO' ? 'NON NOTO' : t}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <label>
                Dettaglio evento
                <select
                  value={evento.dettaglioEvento}
                  onChange={(e) =>
                    updateEvento(evento.id, { dettaglioEvento: e.target.value })
                  }
                >
                  <option value="">—</option>
                  {dettagli.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descrizione
                <textarea
                  rows={3}
                  value={evento.descrizione}
                  onChange={(e) =>
                    updateEvento(evento.id, { descrizione: e.target.value })
                  }
                />
              </label>
              <label>
                Codice evento
                <select
                  value={evento.codice}
                  onChange={(e) =>
                    updateEvento(evento.id, {
                      codice: e.target.value as CodiceEvento,
                    })
                  }
                >
                  {(['VERDE', 'GIALLO', 'ROSSO'] as CodiceEvento[]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="ares-codice-bar"
                style={{
                  background: CODICE_EVENTO_COLOR[evento.codice],
                }}
              />
              <label>
                Segnalato da
                <input
                  value={evento.segnalatoDa}
                  onChange={(e) =>
                    updateEvento(evento.id, { segnalatoDa: e.target.value })
                  }
                />
              </label>
            </div>
          </section>

          <section className="ares-section">
            <h3 className="ares-section-title">Missioni</h3>
            {evento.stato === 'CHIUSO' ? (
              <p className="ares-muted">
                Evento chiuso. Le missioni restano in archivio (stati e tempi
                consultabili dalla scheda missione).
              </p>
            ) : (
              <div className="ares-inline">
                <select
                  value={mezzoMissione}
                  onChange={(e) => setMezzoMissione(e.target.value)}
                >
                  <option value="">
                    Seleziona mezzo disponibile…
                    {evento.lat != null && evento.lng != null
                      ? ' (ordinati per distanza)'
                      : ''}
                  </option>
                  {mezziDisponibiliOrdinati.map((m) => {
                    let kmLabel = ''
                    if (
                      evento.lat != null &&
                      evento.lng != null &&
                      m.stazionamentoLat != null &&
                      m.stazionamentoLng != null
                    ) {
                      const km = distanzaKm(
                        evento.lat,
                        evento.lng,
                        m.stazionamentoLat,
                        m.stazionamentoLng,
                      )
                      kmLabel = ` · ${km.toFixed(1)} km`
                    }
                    return (
                      <option key={m.id} value={m.id}>
                        {m.sigla} ({m.tipo})
                        {kmLabel}
                      </option>
                    )
                  })}
                </select>
                <button
                  type="button"
                  className="ares-btn primary"
                  disabled={!mezzoMissione}
                  onClick={() => {
                    const r = addMissione(evento.id, mezzoMissione)
                    if (!r.ok) alert(r.reason)
                    else setMezzoMissione('')
                  }}
                >
                  Aggiungi missione
                </button>
              </div>
            )}
            <ul className="ares-list">
              {missioniEv.map((m) => {
                const mz = mezzi.find((x) => x.id === m.mezzoId)
                return (
                  <li key={m.id} className="ares-card">
                    <div className="ares-card-row">
                      <button
                        type="button"
                        className="ares-link-mission"
                        onClick={() => openModalMissione(m.id)}
                      >
                        {m.id}
                      </button>
                      <span>{mz?.sigla ?? m.mezzoId}</span>
                      <span>{LABEL_STATO_MISSIONE[m.stato]}</span>
                      {evento.stato !== 'CHIUSO' && (
                        <>
                          <button
                            type="button"
                            className="ares-btn small"
                            onClick={() => avanzaMissione(m.id)}
                          >
                            Avanza stato
                          </button>
                          {m.stato !== 'FINE_MISSIONE' && (
                            <button
                              type="button"
                              className="ares-btn small warning"
                              onClick={() => {
                                if (
                                  confirm(
                                    'Terminare la missione? Il mezzo verrà liberato.',
                                  )
                                )
                                  terminaMissione(m.id)
                              }}
                            >
                              Termina missione
                            </button>
                          )}
                          <button
                            type="button"
                            className="ares-btn small danger"
                            onClick={() => deleteMissione(m.id)}
                          >
                            Rimuovi
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="ares-section">
            <div className="ares-inline space-between">
              <h3 className="ares-section-title">Pazienti</h3>
              <button
                type="button"
                className="ares-btn secondary"
                onClick={() => addPaziente(evento.id)}
              >
                + Paziente
              </button>
            </div>
            <ul className="ares-list-compact">
              {pazientiEv.map((p) => {
                const hasAnag =
                  !!(p.nome?.trim() || p.cognome?.trim() || p.dataNascita)
                const main = hasAnag
                  ? [p.nome, p.cognome, p.dataNascita].filter(Boolean).join(' · ')
                  : p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="ares-patient-compact"
                      onClick={() => openModalPaziente(p.id)}
                    >
                      {hasAnag ? (
                        <>
                          <span className="ares-patient-compact-id">{p.id}</span>
                          <span>{main}</span>
                        </>
                      ) : (
                        <span>{p.id}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="ares-section ares-section--danger">
            <h3 className="ares-section-title">Azioni</h3>
            <div className="ares-danger-zone">
              {evento.stato !== 'CHIUSO' && (
                <>
                  {!confirmClose ? (
                    <button
                      type="button"
                      className="ares-btn warning"
                      onClick={() => setConfirmClose(true)}
                    >
                      Chiudi evento
                    </button>
                  ) : (
                    <div className="ares-inline">
                      <span>
                        Le missioni ancora aperte verranno terminate e i mezzi
                        liberati. Confermi?
                      </span>
                      <button
                        type="button"
                        className="ares-btn danger"
                        onClick={() => {
                          chiudiEvento(evento.id)
                          setConfirmClose(false)
                          onClose()
                        }}
                      >
                        Conferma chiusura
                      </button>
                      <button
                        type="button"
                        className="ares-btn ghost"
                        onClick={() => setConfirmClose(false)}
                      >
                        Annulla
                      </button>
                    </div>
                  )}
                </>
              )}

              {!confirmDelete ? (
                <button
                  type="button"
                  className="ares-btn danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Elimina evento
                </button>
              ) : (
                <div className="ares-inline">
                  <span>
                    Eliminare definitivamente evento, missioni e pazienti?
                  </span>
                  <button
                    type="button"
                    className="ares-btn danger"
                    onClick={() => {
                      deleteEvento(evento.id)
                      setConfirmDelete(false)
                      onClose()
                    }}
                  >
                    Sì, elimina
                  </button>
                  <button
                    type="button"
                    className="ares-btn ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
