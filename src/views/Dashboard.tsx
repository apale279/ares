import { Fragment, useMemo, useState } from 'react'
import {
  adjustFontStep,
  FONT_STEP_MAX,
  FONT_STEP_MIN,
  getFontStep,
} from '../utils/fontScale'
import { DraggablePanel } from '../components/DraggablePanel'
import { EventsMap } from '../components/EventsMap'
import { CreateEventModal } from '../components/CreateEventModal'
import { CODICE_EVENTO_COLOR, LABEL_STATO_MISSIONE } from '../constants'
import { useAresStore } from '../store/aresStore'
import type { Mezzo } from '../types'

export function Dashboard() {
  const eventi = useAresStore((s) => s.eventi)
  const missioni = useAresStore((s) => s.missioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const avanzaMissione = useAresStore((s) => s.avanzaMissione)
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
  const [fontStep, setFontStep] = useState(() => getFontStep())

  const eventiAperti = useMemo(
    () => eventi.filter((e) => e.stato !== 'CHIUSO'),
    [eventi],
  )

  const missioniInCorso = useMemo(
    () => missioni.filter((m) => m.stato !== 'FINE_MISSIONE'),
    [missioni],
  )

  const missioniGrouped = useMemo(() => {
    const map = new Map<string, typeof missioniInCorso>()
    const order: string[] = []
    for (const m of missioniInCorso) {
      if (!map.has(m.eventoId)) {
        order.push(m.eventoId)
        map.set(m.eventoId, [])
      }
      map.get(m.eventoId)!.push(m)
    }
    return order.map((eventoId) => ({
      eventoId,
      rows: map.get(eventoId)!,
      /** Raggruppa visivamente solo se più missioni sullo stesso evento */
      showGroupHeader: (map.get(eventoId)!.length ?? 0) > 1,
    }))
  }, [missioniInCorso])

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
    return groups
  }, [mezzi])

  const missionCountByEvent = useMemo(() => {
    const m = new Map<string, number>()
    for (const mi of missioni) {
      m.set(mi.eventoId, (m.get(mi.eventoId) ?? 0) + 1)
    }
    return m
  }, [missioni])

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

  return (
    <div className="ares-dashboard">
      <header className="ares-topbar">
        <div className="ares-brand">ARES</div>
        <div className="ares-topbar-actions">
          <button
            type="button"
            className="ares-btn ghost"
            onClick={() => resetLayoutVista()}
          >
            Reset vista
          </button>
          <span className="ares-font-zoom" aria-label="Dimensione testo">
            <button
              type="button"
              className="ares-btn ghost ares-btn-icon"
              title="Aumenta testo"
              aria-label="Aumenta testo"
              disabled={fontStep >= FONT_STEP_MAX}
              onClick={() => setFontStep(adjustFontStep(1))}
            >
              +
            </button>
            <button
              type="button"
              className="ares-btn ghost ares-btn-icon"
              title="Riduci testo"
              aria-label="Riduci testo"
              disabled={fontStep <= FONT_STEP_MIN}
              onClick={() => setFontStep(adjustFontStep(-1))}
            >
              −
            </button>
          </span>
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

      <div className="ares-workspace">
        <DraggablePanel panelKey="eventi" title="Eventi (non chiusi)" zIndex={20}>
          <div className="ares-table-wrap">
            <table className="ares-table">
              <thead>
                <tr>
                  <th />
                  <th>ID</th>
                  <th>Luogo</th>
                </tr>
              </thead>
              <tbody>
                {eventiAperti.map((e) => {
                  const n = missionCountByEvent.get(e.id) ?? 0
                  const color = CODICE_EVENTO_COLOR[e.codice] ?? '#64748b'
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
                        <span
                          className="ares-dot"
                          style={{ background: color }}
                          title={e.codice}
                        />
                        {n === 0 && (
                          <span className="ares-warn" title="Nessuna missione">
                            ▲
                          </span>
                        )}
                      </td>
                      <td>{e.id}</td>
                      <td>{e.indirizzo || '—'}</td>
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
                  <th>Luogo evento</th>
                  <th>Mezzo</th>
                  <th>Stato</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {missioniGrouped.map(({ eventoId, rows, showGroupHeader }) => (
                  <Fragment key={eventoId}>
                    {showGroupHeader && (
                      <tr className="ares-mission-group-row">
                        <td colSpan={5}>Evento {eventoId}</td>
                      </tr>
                    )}
                    {rows.map((m) => {
                      const mz = mezzi.find((x) => x.id === m.mezzoId)
                      const ev = eventi.find((x) => x.id === m.eventoId)
                      const warn = m.stato === 'ALLERTARE'
                      return (
                        <tr key={m.id}>
                          <td>
                            {warn && (
                              <span className="ares-warn" title="Da allertare">
                                ▲
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ares-link-mission"
                              onClick={() => openModalEvento(m.eventoId)}
                            >
                              {ev?.indirizzo?.trim() || `Evento ${m.eventoId}`}
                            </button>
                          </td>
                          <td>{mz?.sigla ?? '—'}</td>
                          <td>{LABEL_STATO_MISSIONE[m.stato]}</td>
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
                  </Fragment>
                ))}
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
                      return (
                        <tr
                          key={m.id}
                          className={`ares-mezzo-row ares-mezzo-row--${m.stato.toLowerCase()}`}
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
    </div>
  )
}
