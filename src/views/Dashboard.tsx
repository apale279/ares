import { Fragment, useEffect, useMemo, useState } from 'react'
import { DraggablePanel } from '../components/DraggablePanel'
import { EventsMap } from '../components/EventsMap'
import { CreateEventModal } from '../components/CreateEventModal'
import { CODICE_EVENTO_COLOR, LABEL_STATO_MISSIONE } from '../constants'
import { useAresStore } from '../store/aresStore'
import type { Mezzo, Nota } from '../types'
import { shortAddress } from '../utils/address'
import { formatDataOra } from '../utils/format'
import logoAres from '../../logo.png'

export function Dashboard() {
  const eventi = useAresStore((s) => s.eventi)
  const missioni = useAresStore((s) => s.missioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const pazienti = useAresStore((s) => s.pazienti)
  const note = useAresStore((s) => s.note)
  const avanzaMissione = useAresStore((s) => s.avanzaMissione)
  const requestMissionTelegramDispatch = useAresStore(
    (s) => s.requestMissionTelegramDispatch,
  )
  const openModalEvento = useAresStore((s) => s.openModalEvento)
  const openModalMissione = useAresStore((s) => s.openModalMissione)
  const openModalMezzo = useAresStore((s) => s.openModalMezzo)
  const resetLayoutVista = useAresStore((s) => s.resetLayoutVista)

  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [mapCreateMode, setMapCreateMode] = useState(false)
  const [notaPopup, setNotaPopup] = useState<Nota | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const eventiAperti = useMemo(
    () => eventi.filter((e) => e.stato !== 'CHIUSO'),
    [eventi],
  )

  const missioniInCorso = useMemo(
    () => missioni.filter((m) => m.stato !== 'FINE_MISSIONE'),
    [missioni],
  )

  const noteImportanti = useMemo(
    () =>
      note
        .filter((n) => n.importante && (n.stato === 'APERTA' || n.stato === 'IN_CORSO'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [note],
  )
  const updateNota = useAresStore((s) => s.updateNota)

  const conteggioEventiPerCodice = useMemo(() => {
    const out = { VERDE: 0, GIALLO: 0, ROSSO: 0 }
    for (const e of eventiAperti) out[e.codice] += 1
    return out
  }, [eventiAperti])

  const mezziOccupati = useMemo(
    () => mezzi.filter((m) => m.stato === 'OCCUPATO').length,
    [mezzi],
  )

  const pazientiInCarico = useMemo(
    () =>
      pazienti.filter(
        (p) => p.esito === 'TRASPORTATO' && p.trasportoCompletatoAt == null,
      ).length,
    [pazienti],
  )

  const pmaInCarico = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of pazienti) {
      if (
        p.esito === 'TRASPORTATO' &&
        p.tipoDestinazioneTrasporto === 'PMA' &&
        p.pmaDestinazione &&
        !p.trasportoCompletatoAt
      ) {
        map.set(p.pmaDestinazione, (map.get(p.pmaDestinazione) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it'))
  }, [pazienti])

  const eventiApertiOrdinati = useMemo(() => {
    const byParent = new Map<string, typeof eventiAperti>()
    const roots: typeof eventiAperti = []
    for (const e of eventiAperti) {
      if (e.parentEventoId) {
        const arr = byParent.get(e.parentEventoId) ?? []
        arr.push(e)
        byParent.set(e.parentEventoId, arr)
      } else {
        roots.push(e)
      }
    }
    const out: Array<{ ev: (typeof eventiAperti)[number]; child: boolean }> = []
    for (const r of roots) {
      out.push({ ev: r, child: false })
      const kids = (byParent.get(r.id) ?? []).sort((a, b) => a.id.localeCompare(b.id))
      for (const k of kids) out.push({ ev: k, child: true })
    }
    for (const e of eventiAperti) {
      if (e.parentEventoId && !out.some((x) => x.ev.id === e.id)) {
        out.push({ ev: e, child: true })
      }
    }
    return out
  }, [eventiAperti])

  const missioniList = useMemo(
    () => [...missioniInCorso].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [missioniInCorso],
  )

  const mezziPerTipo = useMemo(() => {
    const sorted = [...mezzi].sort(
      (a, b) =>
        a.tipo.localeCompare(b.tipo, 'it') || a.sigla.localeCompare(b.sigla, 'it'),
    )
    const groups: { tipo: string; rows: Mezzo[] }[] = []
    for (const m of sorted) {
      const last = groups[groups.length - 1]
      if (!last || last.tipo !== m.tipo) {
        groups.push({ tipo: m.tipo, rows: [m] })
      } else {
        last.rows.push(m)
      }
    }
    for (const g of groups) {
      g.rows.sort((a, b) => {
        const wa = a.stato === 'DISPONIBILE' ? 0 : 1
        const wb = b.stato === 'DISPONIBILE' ? 0 : 1
        return wa - wb || a.sigla.localeCompare(b.sigla, 'it')
      })
    }
    return groups
  }, [mezzi])

  const missionCountByEvent = useMemo(() => {
    const m = new Map<string, number>()
    for (const mi of missioni) {
      m.set(mi.eventoId, (m.get(mi.eventoId) ?? 0) + 1)
    }
    return m
  }, [missioni])

  const pazientiByEvent = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pazienti) m.set(p.eventoId, (m.get(p.eventoId) ?? 0) + 1)
    return m
  }, [pazienti])

  const eventiPronti = useMemo(
    () => eventiApertiOrdinati.filter((x) => !x.ev.eventoInAttesa),
    [eventiApertiOrdinati],
  )
  const eventiInAttesa = useMemo(
    () => eventiApertiOrdinati.filter((x) => x.ev.eventoInAttesa),
    [eventiApertiOrdinati],
  )

  const activeMissionByMezzo = useMemo(() => {
    const map = new Map<string, string>()
    for (const mi of missioniInCorso) {
      map.set(mi.mezzoId, mi.id)
    }
    return map
  }, [missioniInCorso])

  const puntiMezziMap = useMemo(
    () =>
      mezzi
        .filter(
          (m) =>
            m.stazionamentoLat != null &&
            m.stazionamentoLng != null &&
            Number.isFinite(m.stazionamentoLat) &&
            Number.isFinite(m.stazionamentoLng),
        )
        .map((m) => ({
          id: m.id,
          lat: m.stazionamentoLat!,
          lng: m.stazionamentoLng!,
          label: m.sigla,
        })),
    [mezzi],
  )

  const openEventFromMap = (lat: number, lng: number) => {
    setCreateDraft({ lat, lng })
    setCreateOpen(true)
    setMapCreateMode(false)
  }

  const formatTimer = (iso: string): string => {
    const sec = Math.max(0, Math.floor((nowTick - new Date(iso).getTime()) / 1000))
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="ares-dashboard">
      <header className="ares-topbar">
        <div className="ares-brand">
          <img src={logoAres} alt="Logo ARES" className="ares-brand-logo" />
          <div className="ares-brand-text">
            <span className="ares-brand-main">ARES</span>
            <span className="ares-brand-sub">Advanced Response Emergency System</span>
          </div>
        </div>
        <div className="ares-topbar-actions">
          <button
            type="button"
            className="ares-btn ghost"
            onClick={() => resetLayoutVista()}
          >
            Reset vista
          </button>
          <button
            type="button"
            className={`ares-btn secondary${mapCreateMode ? ' active' : ''}`}
            onClick={() => setMapCreateMode((v) => !v)}
          >
            {mapCreateMode
              ? 'Annulla creazione da mappa'
              : 'Crea evento cliccando la mappa'}
          </button>
          <button
            type="button"
            className="ares-btn primary"
            onClick={() => {
              setCreateDraft(null)
              setCreateOpen(true)
            }}
          >
            Nuovo evento
          </button>
        </div>
      </header>

      <div className="ares-dashboard-counters">
        <span>Eventi VERDE: {conteggioEventiPerCodice.VERDE}</span>
        <span>Eventi GIALLO: {conteggioEventiPerCodice.GIALLO}</span>
        <span>Eventi ROSSO: {conteggioEventiPerCodice.ROSSO}</span>
        <span>Missioni attive: {missioniInCorso.length}</span>
        <span>Mezzi occupati: {mezziOccupati}</span>
        <span>Pazienti in carico: {pazientiInCarico}</span>
        {pmaInCarico.map(([pma, count]) => (
          <span key={pma}>
            {pma}: {count}
          </span>
        ))}
      </div>

      <div className="ares-workspace">
        <aside className="ares-diario-side">
          <h3 className="ares-diario-side-title">Note importanti</h3>
          <ul className="ares-list-compact">
            {noteImportanti.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="ares-diario-side-item"
                  title={n.titolo}
                  onClick={() => setNotaPopup(n)}
                >
                  {n.titolo || '(senza titolo)'}
                </button>
              </li>
            ))}
            {noteImportanti.length === 0 && (
              <li className="ares-muted">Nessuna nota prioritaria.</li>
            )}
          </ul>
        </aside>
        <div className="ares-workspace-panels">
          <DraggablePanel panelKey="eventi" title="Eventi" zIndex={20}>
          <div className="ares-table-wrap">
            <table className="ares-table">
              <thead>
                <tr>
                  <th />
                  <th>Timer</th>
                  <th>ID</th>
                  <th>Luogo</th>
                  <th>PZ</th>
                </tr>
              </thead>
              <tbody>
                {eventiPronti.map(({ ev: e, child }) => {
                  const n = missionCountByEvent.get(e.id) ?? 0
                  const color = CODICE_EVENTO_COLOR[e.codice] ?? '#64748b'
                  const pzCount = pazientiByEvent.get(e.id) ?? 0
                  return (
                    <tr
                      key={e.id}
                      className="ares-click ares-row-evento"
                      style={{
                        borderLeft: `5px solid ${color}`,
                        backgroundColor: `${color}24`,
                      }}
                      onClick={() => openModalEvento(e.id)}
                    >
                      <td>
                        {n === 0 && (
                          <span
                            className="ares-alert-badge ares-alert-badge--event"
                            title="Nessuna missione legata"
                          >
                            !
                          </span>
                        )}
                      </td>
                      <td>{formatTimer(e.createdAt)}</td>
                      <td>{child ? `↳ ${e.id}` : e.id}</td>
                      <td>{shortAddress(e.indirizzo) || '—'}</td>
                      <td>{pzCount > 0 ? `🧑 ${pzCount}` : '—'}</td>
                    </tr>
                  )
                })}
                {eventiInAttesa.length > 0 && (
                  <tr className="ares-mission-group-row">
                    <td colSpan={5}>Eventi in attesa</td>
                  </tr>
                )}
                {eventiInAttesa.map(({ ev: e, child }) => {
                  const n = missionCountByEvent.get(e.id) ?? 0
                  const color = CODICE_EVENTO_COLOR[e.codice] ?? '#64748b'
                  const pzCount = pazientiByEvent.get(e.id) ?? 0
                  return (
                    <tr
                      key={e.id}
                      className="ares-click ares-row-evento"
                      style={{
                        borderLeft: `5px dashed ${color}`,
                        backgroundColor: `${color}18`,
                      }}
                      onClick={() => openModalEvento(e.id)}
                    >
                      <td>
                        {n === 0 && (
                          <span
                            className="ares-alert-badge ares-alert-badge--event"
                            title="Nessuna missione legata"
                          >
                            !
                          </span>
                        )}
                      </td>
                      <td>{formatTimer(e.createdAt)}</td>
                      <td>{child ? `↳ ${e.id}` : e.id}</td>
                      <td>{shortAddress(e.indirizzo) || '—'}</td>
                      <td>{pzCount > 0 ? `🧑 ${pzCount}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {eventiAperti.length === 0 && (
              <p className="ares-muted pad">Nessun evento aperto.</p>
            )}
          </div>
          </DraggablePanel>

          <DraggablePanel panelKey="missioni" title="Missioni in corso" zIndex={21}>
          <div className="ares-table-wrap">
            <table className="ares-table">
              <thead>
                <tr>
                  <th />
                  <th>Sigla mezzo</th>
                  <th>Codice</th>
                  <th>Indirizzo</th>
                  <th>ID evento</th>
                  <th>ID missione</th>
                  <th>Stato</th>
                  <th>Timer</th>
                  <th>Telegram</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {missioniList.map((m) => {
                  const mz = mezzi.find((x) => x.id === m.mezzoId)
                  const ev = eventi.find((x) => x.id === m.eventoId)
                  const warn = m.stato === 'ALLERTARE'
                  const codeColor = CODICE_EVENTO_COLOR[m.codice] ?? '#64748b'
                  const lastUpdate = m.statoHistory[m.statoHistory.length - 1]?.at ?? m.createdAt
                  return (
                    <tr
                      key={m.id}
                      className={warn ? 'ares-mission-alert-row' : undefined}
                      style={{
                        backgroundColor: `${codeColor}26`,
                        borderLeft: `4px solid ${codeColor}`,
                      }}
                    >
                      <td>
                        <span
                          className="ares-dot"
                          style={{ background: CODICE_EVENTO_COLOR[m.codice] ?? '#64748b' }}
                          title={m.codice}
                        />
                      </td>
                      <td>{mz?.sigla ?? '—'}</td>
                      <td>{m.codice}</td>
                      <td>
                        <button
                          type="button"
                          className="ares-link-mission"
                          onClick={() => openModalEvento(m.eventoId)}
                        >
                          {shortAddress(ev?.indirizzo) || `Evento ${m.eventoId}`}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ares-link-mission"
                          onClick={() => openModalEvento(m.eventoId)}
                        >
                          {m.eventoId}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ares-link-mission"
                          onClick={() => openModalMissione(m.id)}
                        >
                          {m.id}
                        </button>
                      </td>
                      <td>
                        <span className="ares-link-mission-status">
                          {LABEL_STATO_MISSIONE[m.stato]}
                        </span>
                        {warn && (
                          <span
                            className="ares-alert-badge ares-alert-badge--mission"
                            title="Missione da allertare"
                            style={{ marginLeft: 6 }}
                          >
                            !
                          </span>
                        )}
                      </td>
                      <td>{formatTimer(lastUpdate)}</td>
                      <td>
                        <button
                          type="button"
                          className="ares-btn small secondary"
                          title="Invia missione su Telegram"
                          onClick={() => requestMissionTelegramDispatch(m.id)}
                        >
                          ➡️
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ares-btn small primary"
                          onClick={() => avanzaMissione(m.id)}
                        >
                          Avanza
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {missioniInCorso.length === 0 && (
              <p className="ares-muted pad">Nessuna missione in corso.</p>
            )}
          </div>
          </DraggablePanel>

          <DraggablePanel panelKey="mezzi" title="Mezzi" zIndex={22}>
          <div className="ares-table-wrap">
            <table className="ares-table">
              <thead>
                <tr>
                  <th>Sigla</th>
                  <th>Tipo</th>
                  <th>Stato</th>
                  <th>Missione</th>
                </tr>
              </thead>
              <tbody>
                {mezziPerTipo.map(({ tipo, rows }) => (
                  <Fragment key={tipo}>
                    <tr className="ares-mezzo-group-row">
                      <td colSpan={4}>{tipo}</td>
                    </tr>
                    {rows.map((m) => {
                      const mid =
                        m.stato === 'OCCUPATO'
                          ? activeMissionByMezzo.get(m.id) ?? null
                          : null
                      const missioneAttiva = mid
                        ? missioni.find((x) => x.id === mid) ?? null
                        : null
                      const codColor = missioneAttiva
                        ? (CODICE_EVENTO_COLOR[missioneAttiva.codice] ?? '#64748b')
                        : null
                      return (
                        <tr
                          key={m.id}
                          className={`ares-mezzo-row ares-mezzo-row--${m.stato.toLowerCase()}`}
                          style={codColor ? { borderLeft: `4px solid ${codColor}` } : undefined}
                        >
                          <td>
                            <button
                              type="button"
                              className="ares-link-mission"
                              onClick={() => openModalMezzo(m.id)}
                            >
                              {m.sigla}
                            </button>
                          </td>
                          <td>{m.tipo}</td>
                          <td>{m.stato}</td>
                          <td>
                            {mid ? (
                              <button
                                type="button"
                                className="ares-link-mission"
                                onClick={() => openModalMissione(mid)}
                              >
                                {mid}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {mezzi.length === 0 && (
              <p className="ares-muted pad">
                Nessun mezzo. Aggiungine da Impostazioni.
              </p>
            )}
          </div>
          </DraggablePanel>

          <DraggablePanel panelKey="mappa" title="Mappa eventi" zIndex={15}>
          {mapCreateMode && (
            <p className="ares-map-hint">
              Clicca sulla mappa per impostare le coordinate del nuovo evento.
            </p>
          )}
          <EventsMap
            eventi={eventiAperti}
            puntiMezzi={puntiMezziMap}
            onMarkerClick={(e) => openModalEvento(e.id)}
            onMezzoClick={(id) => openModalMezzo(id)}
            createMode={mapCreateMode}
            onMapCreateClick={openEventFromMap}
          />
          </DraggablePanel>
        </div>
      </div>

      {createOpen && (
        <CreateEventModal
          initialLat={createDraft?.lat ?? null}
          initialLng={createDraft?.lng ?? null}
          onClose={() => {
            setCreateOpen(false)
            setCreateDraft(null)
          }}
        />
      )}
      {notaPopup && (
        <div className="ares-modal-backdrop" onClick={() => setNotaPopup(null)}>
          <div className="ares-modal ares-modal--narrow" onClick={(e) => e.stopPropagation()}>
            <header className="ares-modal-head">
              <h2>Nota {notaPopup.id}</h2>
              <button type="button" className="ares-btn ghost" onClick={() => setNotaPopup(null)}>
                Chiudi
              </button>
            </header>
            <div className="ares-modal-scroll">
              <p className="ares-muted">Creata: {formatDataOra(notaPopup.createdAt)}</p>
              <label>
                Titolo
                <input
                  value={notaPopup.titolo}
                  onChange={(e) =>
                    setNotaPopup((n) => (n ? { ...n, titolo: e.target.value } : null))
                  }
                />
              </label>
              <label>
                Testo
                <textarea
                  rows={5}
                  value={notaPopup.testo}
                  onChange={(e) =>
                    setNotaPopup((n) => (n ? { ...n, testo: e.target.value } : null))
                  }
                />
              </label>
              <div className="ares-inline">
                <button
                  type="button"
                  className="ares-btn primary"
                  onClick={() => {
                    updateNota(notaPopup.id, {
                      titolo: notaPopup.titolo,
                      testo: notaPopup.testo,
                    })
                    setNotaPopup(null)
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
