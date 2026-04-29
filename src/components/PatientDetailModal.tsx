import { useMemo, useState } from 'react'
import type {
  CodiceEvento,
  EsitoPaziente,
  Paziente,
  ValutazioneMSA,
  ValutazioneMSB,
  ValutazionePMA,
} from '../types'
import { LABEL_ESITO_PAZIENTE } from '../constants/valutazioneOptions'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'
import {
  ValutazioneMSAEditor,
  ValutazioneMSBEditor,
  ValutazionePMAEditor,
} from './ValutazioniForms'

const ESITI_ORDER: EsitoPaziente[] = [
  '',
  'TRASPORTATO',
  'RIFIUTA_TRASPORTO',
  'SI_ALLONTANA',
  'DECEDUTO',
]

function riassuntoMsb(v: ValutazioneMSB): string {
  const t = v.breveDescrizione.trim()
  if (t) return t.length > 42 ? `${t.slice(0, 42)}…` : t
  if (v.arrestoCardiaco) return 'ARRESTO CARDIACO'
  return 'MSB'
}

function riassuntoMsa(v: ValutazioneMSA): string {
  const t = v.breveDescrizione.trim()
  if (t) return t.length > 42 ? `${t.slice(0, 42)}…` : t
  return 'MSA'
}

export function PatientDetailModal({
  onClose,
  compactForPma,
  pazienteIdOverride,
  embedded,
}: {
  onClose: () => void
  compactForPma?: boolean
  pazienteIdOverride?: string | null
  embedded?: boolean
}) {
  const pazienteId = useAresStore((s) => pazienteIdOverride ?? s.modalPazienteId)
  const paziente = useAresStore((s) =>
    (pazienteIdOverride ?? s.modalPazienteId)
      ? s.pazienti.find((p) => p.id === (pazienteIdOverride ?? s.modalPazienteId)) ?? null
      : null,
  )
  const impostazioni = useAresStore((s) => s.impostazioni)
  const modalMode = useAresStore((s) => s.modalPazienteMode)
  const eventi = useAresStore((s) => s.eventi)
  const missioni = useAresStore((s) => s.missioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const valutazioni = useAresStore((s) => s.valutazioni)

  const updatePaziente = useAresStore((s) => s.updatePaziente)
  const deletePaziente = useAresStore((s) => s.deletePaziente)
  const addValutazioneMSB = useAresStore((s) => s.addValutazioneMSB)
  const addValutazioneMSA = useAresStore((s) => s.addValutazioneMSA)
  const addValutazionePMA = useAresStore((s) => s.addValutazionePMA)
  const updateValutazione = useAresStore((s) => s.updateValutazione)
  const deleteValutazione = useAresStore((s) => s.deleteValutazione)

  const [expandedValId, setExpandedValId] = useState<string | null>(null)
  const [confirmClosePma, setConfirmClosePma] = useState(false)
  const [medicoDimettente, setMedicoDimettente] = useState('')

  const mezziTrasportoIds = useMemo(() => {
    if (!paziente) return [] as string[]
    const set = new Set<string>()
    for (const m of missioni) {
      if (m.eventoId === paziente.eventoId) set.add(m.mezzoId)
    }
    return [...set]
  }, [missioni, paziente])

  const missioniScelta = useMemo(() => {
    if (!paziente) return []
    return missioni
      .filter((m) => m.eventoId === paziente.eventoId)
      .map((m) => {
        const mz = mezzi.find((x) => x.id === m.mezzoId)
        return {
          missione: m,
          label: `${m.id} — ${mz?.sigla ?? m.mezzoId}`,
        }
      })
  }, [missioni, mezzi, paziente])

  if (!pazienteId || !paziente) return null
  const pmaCompactMode = compactForPma ?? modalMode === 'pma'
  const mediciPma = impostazioni.mediciPma ?? []
  const medicoDefault = mediciPma[0] ?? ''

  const evento = eventi.find((e) => e.id === paziente.eventoId)
  const trasportato = paziente.esito === 'TRASPORTATO'
  const versoPma =
    trasportato && paziente.tipoDestinazioneTrasporto === 'PMA' && !!paziente.pmaDestinazione

  const valPaz = valutazioni.filter((v) => v.pazienteId === paziente.id)
  const valMsb = valPaz.filter((v): v is ValutazioneMSB => v.tipo === 'MSB')
  const valMsa = valPaz.filter((v): v is ValutazioneMSA => v.tipo === 'MSA')
  const valPma = valPaz.filter((v): v is ValutazionePMA => v.tipo === 'PMA')

  const patchVal = (id: string, patch: Record<string, unknown>) => {
    updateValutazione(id, patch)
  }

  const expanded = valPaz.find((v) => v.id === expandedValId) ?? null

  return (
    <div
      className={embedded ? 'ares-pma-patient-view' : 'ares-modal-backdrop ares-modal-stack'}
      role="presentation"
      onClick={embedded ? undefined : onClose}
    >
      <div
        className={`${embedded ? 'ares-pma-patient-shell' : 'ares-modal'}${pmaCompactMode ? ' ares-modal--pma' : ''}`}
        role="dialog"
        aria-modal={embedded ? undefined : 'true'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>
            Paziente {paziente.cognome || paziente.nome || paziente.id}
          </h2>
          {!embedded && (
            <button type="button" className="ares-btn ghost" onClick={onClose}>
              Chiudi
            </button>
          )}
        </header>
        <div className="ares-modal-scroll">
          <p className="ares-muted">
            {paziente.id} · Evento {paziente.eventoId}
            {evento && ` · ${evento.indirizzo || '—'}`}
          </p>

          {!pmaCompactMode && <div className="ares-form-grid">
            <label>
              Nome
              <input
                value={paziente.nome}
                onChange={(e) =>
                  updatePaziente(paziente.id, { nome: e.target.value })
                }
              />
            </label>
            <label>
              Cognome
              <input
                value={paziente.cognome}
                onChange={(e) =>
                  updatePaziente(paziente.id, { cognome: e.target.value })
                }
              />
            </label>
            <label>
              Data di nascita
              <input
                type="date"
                value={paziente.dataNascita}
                onChange={(e) =>
                  updatePaziente(paziente.id, { dataNascita: e.target.value })
                }
              />
            </label>
            <label className="full">
              Note
              <textarea
                rows={2}
                value={paziente.note}
                onChange={(e) =>
                  updatePaziente(paziente.id, { note: e.target.value })
                }
              />
            </label>
            <label className="full">
              Esito
              <select
                value={paziente.esito}
                onChange={(e) =>
                  updatePaziente(paziente.id, {
                    esito: e.target.value as EsitoPaziente,
                  })
                }
              >
                {ESITI_ORDER.map((k) => (
                  <option key={k || 'empty'} value={k}>
                    {LABEL_ESITO_PAZIENTE[k]}
                  </option>
                ))}
              </select>
            </label>
            {trasportato && (
              <>
                <label className="full">
                  Destinazione trasporto
                  <select
                    value={paziente.tipoDestinazioneTrasporto}
                    onChange={(e) => {
                      const t = e.target.value as Paziente['tipoDestinazioneTrasporto']
                      updatePaziente(paziente.id, {
                        tipoDestinazioneTrasporto: t,
                        ...(t === 'OSPEDALE'
                          ? { pmaDestinazione: '' }
                          : { ospedaleDestinazione: '' }),
                      })
                    }}
                  >
                    <option value="OSPEDALE">Ospedale (PS)</option>
                    <option value="PMA">PMA</option>
                  </select>
                </label>
                {paziente.tipoDestinazioneTrasporto === 'OSPEDALE' && (
                  <label>
                    Ospedale di destinazione
                    <select
                      value={paziente.ospedaleDestinazione}
                      onChange={(e) =>
                        updatePaziente(paziente.id, {
                          ospedaleDestinazione: e.target.value,
                        })
                      }
                    >
                      <option value="">—</option>
                      {impostazioni.ospedali.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {paziente.tipoDestinazioneTrasporto === 'PMA' && (
                  <label>
                    PMA di destinazione
                    <select
                      value={paziente.pmaDestinazione}
                      onChange={(e) =>
                        updatePaziente(paziente.id, {
                          pmaDestinazione: e.target.value,
                        })
                      }
                    >
                      <option value="">—</option>
                      {(impostazioni.pma.length > 0
                        ? impostazioni.pma
                        : []
                      ).map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Mezzo di trasporto
                  <select
                    value={paziente.mezzoTrasportoId ?? ''}
                    onChange={(e) =>
                      updatePaziente(paziente.id, {
                        mezzoTrasportoId:
                          e.target.value === '' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="">—</option>
                    {mezziTrasportoIds.map((mid) => {
                      const mz = mezzi.find((x) => x.id === mid)
                      return (
                        <option key={mid} value={mid}>
                          {mz?.sigla ?? mid}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label>
                  Codice colore trasporto
                  <select
                    value={paziente.codiceTrasporto}
                    onChange={(e) =>
                      updatePaziente(paziente.id, {
                        codiceTrasporto: e.target.value as CodiceEvento,
                      })
                    }
                  >
                    <option value="VERDE">VERDE</option>
                    <option value="GIALLO">GIALLO</option>
                    <option value="ROSSO">ROSSO</option>
                  </select>
                </label>
                <div className="full">
                  <button
                    type="button"
                    className="ares-btn primary"
                    onClick={() => {
                      updatePaziente(paziente.id, {
                        codiceTrasporto: paziente.codiceTrasporto,
                      })
                    }}
                  >
                    Salva
                  </button>
                </div>
              </>
            )}
            {paziente.arrivoInOspedaleAt &&
              paziente.tipoDestinazioneTrasporto === 'OSPEDALE' && (
                <p className="ares-muted full">
                  Arrivo in ospedale:{' '}
                  {formatDataOra(paziente.arrivoInOspedaleAt)}
                </p>
              )}
            {paziente.pmaArrivoAt &&
              paziente.tipoDestinazioneTrasporto === 'PMA' && (
                <p className="ares-muted full">
                  Arrivo PMA (da missione): {formatDataOra(paziente.pmaArrivoAt)}
                </p>
              )}
            {paziente.trasportoCompletatoAt && (
              <p className="ares-muted full">
                Trasporto / percorso chiuso:{' '}
                {formatDataOra(paziente.trasportoCompletatoAt)}
              </p>
            )}
          </div>}

          <hr className="ares-hr" />

          <div className="ares-inline space-between">
            <h3>Valutazioni</h3>
            <div className="ares-inline ares-val-actions">
              <button
                type="button"
                className="ares-btn small secondary"
                onClick={() => {
                  addValutazioneMSB(paziente.id)
                  setExpandedValId(null)
                }}
              >
                + valutazione MSB
              </button>
              <button
                type="button"
                className="ares-btn small secondary"
                onClick={() => {
                  addValutazioneMSA(paziente.id)
                  setExpandedValId(null)
                }}
              >
                + valutazione MSA
              </button>
              {versoPma && (
                <button
                  type="button"
                  className="ares-btn small secondary"
                  onClick={() => {
                    const id = addValutazionePMA(paziente.id)
                    setExpandedValId(id)
                  }}
                >
                  + valutazione PMA
                </button>
              )}
            </div>
          </div>

          <div className="ares-val-dual">
            <div className="ares-val-col">
              <div className="ares-val-col-title">MSB</div>
              {valMsb.length === 0 && (
                <p className="ares-muted ares-val-empty">Nessuna</p>
              )}
              {valMsb.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={
                    expandedValId === v.id
                      ? 'ares-val-chip active'
                      : 'ares-val-chip'
                  }
                  onClick={() =>
                    setExpandedValId(expandedValId === v.id ? null : v.id)
                  }
                >
                  <span className="ares-val-chip-ts">
                    {formatDataOra(v.timestamp)}
                  </span>
                  <span className="ares-val-chip-txt">{riassuntoMsb(v)}</span>
                </button>
              ))}
            </div>
            <div className="ares-val-col">
              <div className="ares-val-col-title">MSA</div>
              {valMsa.length === 0 && (
                <p className="ares-muted ares-val-empty">Nessuna</p>
              )}
              {valMsa.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={
                    expandedValId === v.id
                      ? 'ares-val-chip active'
                      : 'ares-val-chip'
                  }
                  onClick={() =>
                    setExpandedValId(expandedValId === v.id ? null : v.id)
                  }
                >
                  <span className="ares-val-chip-ts">
                    {formatDataOra(v.timestamp)}
                  </span>
                  <span className="ares-val-chip-txt">{riassuntoMsa(v)}</span>
                </button>
              ))}
            </div>
          </div>

          {versoPma && valPma.length > 0 && (
            <div className="ares-val-pma-block">
              <div className="ares-val-col-title">PMA</div>
              <div className="ares-val-pma-chips">
                {valPma.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={
                      expandedValId === v.id
                        ? 'ares-val-chip active'
                        : 'ares-val-chip'
                    }
                    onClick={() =>
                      setExpandedValId(expandedValId === v.id ? null : v.id)
                    }
                  >
                    <span className="ares-val-chip-ts">
                      {formatDataOra(v.dataOraArrivo)}
                    </span>
                    <span className="ares-val-chip-txt">
                      {v.esito || 'In corso'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {expanded && expanded.tipo === 'MSB' && (
            <ValutazioneMSBEditor
              v={expanded}
              missioniScelta={missioniScelta}
              manovreOpts={impostazioni.manovreMSB}
              onChange={(patch) => patchVal(expanded.id, patch)}
              onDelete={() => {
                deleteValutazione(expanded.id)
                setExpandedValId(null)
              }}
            />
          )}
          {expanded && expanded.tipo === 'MSA' && (
            <ValutazioneMSAEditor
              v={expanded}
              missioniScelta={missioniScelta}
              manovreOpts={impostazioni.manovreMSA}
              onChange={(patch) => patchVal(expanded.id, patch)}
              onDelete={() => {
                deleteValutazione(expanded.id)
                setExpandedValId(null)
              }}
            />
          )}
          {expanded && expanded.tipo === 'PMA' && (
            <ValutazionePMAEditor
              v={expanded}
              presetDimissione={impostazioni.presetDimissione ?? []}
              manovreOpts={impostazioni.manovrePMA ?? []}
              onChange={(patch) => patchVal(expanded.id, patch)}
              onDelete={() => {
                deleteValutazione(expanded.id)
                setExpandedValId(null)
              }}
            />
          )}

          <div className="ares-danger-zone">
            {paziente.tipoDestinazioneTrasporto === 'PMA' && (
              <button
                type="button"
                className="ares-btn warning"
                onClick={() =>
                  setConfirmClosePma(true)
                }
                disabled={!!paziente.trasportoCompletatoAt}
              >
                Chiudi paziente PMA
              </button>
            )}
            {confirmClosePma && (
              <div className="ares-card">
                <label>
                  Medico dimettente
                  <select
                    value={medicoDimettente || medicoDefault}
                    onChange={(e) => setMedicoDimettente(e.target.value)}
                  >
                    {(mediciPma.length > 0 ? mediciPma : ['']).map((m) => (
                      <option key={m || 'vuoto'} value={m}>
                        {m || '—'}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ares-inline">
                  <button
                    type="button"
                    className="ares-btn primary"
                    onClick={() => {
                      updatePaziente(paziente.id, {
                        trasportoCompletatoAt: new Date().toISOString(),
                        medicoDimissionePma: medicoDimettente || medicoDefault,
                      })
                      setConfirmClosePma(false)
                    }}
                  >
                    Conferma chiusura
                  </button>
                  <button
                    type="button"
                    className="ares-btn ghost"
                    onClick={() => setConfirmClosePma(false)}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
            {valPma.length > 0 && (
              <button
                type="button"
                className="ares-btn secondary"
                onClick={() => {
                  const latest = [...valPma].sort((a, b) =>
                    b.dataOraArrivo.localeCompare(a.dataOraArrivo),
                  )[0]
                  const html = `
                    <html><body>
                    <h1>Scheda PMA ${paziente.id}</h1>
                    <h2>Anagrafica</h2>
                    <p>${[paziente.nome, paziente.cognome].filter(Boolean).join(' ') || '-'}</p>
                    <p>Nascita: ${paziente.dataNascita || '-'}</p>
                    <h2>Valutazione PMA</h2>
                    <p>Arrivo: ${formatDataOra(latest.dataOraArrivo)}</p>
                    <p>APR: ${latest.apr || '-'}</p>
                    <p>Allergie: ${latest.allergie || '-'}</p>
                    <p>APP: ${latest.app || '-'}</p>
                    <p>EO: ${latest.eo || '-'}</p>
                    <p>Esito: ${latest.esito || '-'}</p>
                    <p>Note dimissione: ${latest.noteDimissione || '-'}</p>
                    <p>Medico dimettente: ${paziente.medicoDimissionePma || '-'}</p>
                    </body></html>
                  `
                  const w = window.open('', '_blank')
                  if (!w) return
                  w.document.write(html)
                  w.document.close()
                  w.focus()
                  w.print()
                }}
              >
                Genera scheda PDF
              </button>
            )}
            <button
              type="button"
              className="ares-btn danger"
              onClick={() => {
                if (confirm('Eliminare questo paziente?')) {
                  deletePaziente(paziente.id)
                  onClose()
                }
              }}
            >
              Elimina paziente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
