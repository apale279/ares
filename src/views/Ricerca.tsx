import { useCallback, useMemo, useState } from 'react'
import { equipaggioToPlainText } from '../utils/equipaggioPrint'
import type { EsitoPaziente } from '../types'
import { useAuth } from '../auth/AuthContext'
import { useAresStore } from '../store/aresStore'
import { LABEL_STATO_MISSIONE } from '../constants'
import { isAdminUser } from '../utils/isAdminUser'

function norm(s: string): string {
  return s.toLowerCase().trim()
}

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const n = new Set(prev)
  if (n.has(id)) n.delete(id)
  else n.add(id)
  return n
}

export function Ricerca({
  onOpenDetail,
}: {
  /** Es. passa a Dashboard così le schede modali restano visibili sopra. */
  onOpenDetail?: () => void
}) {
  const { session } = useAuth()
  const impostazioni = useAresStore((s) => s.impostazioni)
  const isAdmin = useMemo(
    () => isAdminUser(impostazioni, session?.userId),
    [impostazioni, session?.userId],
  )

  const eventi = useAresStore((s) => s.eventi)
  const missioni = useAresStore((s) => s.missioni)
  const pazienti = useAresStore((s) => s.pazienti)
  const mezzi = useAresStore((s) => s.mezzi)
  const openModalEvento = useAresStore((s) => s.openModalEvento)
  const openModalMissione = useAresStore((s) => s.openModalMissione)
  const openModalPaziente = useAresStore((s) => s.openModalPaziente)
  const openModalMezzo = useAresStore((s) => s.openModalMezzo)
  const apri = (fn: () => void) => {
    fn()
    onOpenDetail?.()
  }

  const [q, setQ] = useState('')
  const [ev, setEv] = useState(true)
  const [mi, setMi] = useState(true)
  const [pa, setPa] = useState(true)
  const [eq, setEq] = useState(true)
  const [didSearch, setDidSearch] = useState(false)

  /** Solo rank Admin: attiva checkbox e cancellazione multipla. */
  const [cancellaMode, setCancellaMode] = useState(false)

  const [selEv, setSelEv] = useState<Set<string>>(() => new Set())
  const [selMi, setSelMi] = useState<Set<string>>(() => new Set())
  const [selPa, setSelPa] = useState<Set<string>>(() => new Set())

  const nq = norm(q)

  const risEventi = useMemo(() => {
    if (!didSearch || !nq || !ev) return []
    return eventi.filter(
      (e) =>
        norm(e.id).includes(nq) ||
        norm(e.indirizzo).includes(nq) ||
        norm(e.descrizione).includes(nq) ||
        norm(e.segnalatoDa).includes(nq),
    )
  }, [eventi, nq, ev, didSearch])

  const risMissioni = useMemo(() => {
    if (!didSearch || !nq || !mi) return []
    return missioni.filter(
      (m) =>
        norm(m.id).includes(nq) ||
        norm(m.eventoId).includes(nq) ||
        norm(m.esitoMissione ?? '').includes(nq) ||
        norm(m.noteMissione ?? '').includes(nq),
    )
  }, [missioni, nq, mi, didSearch])

  const risPazienti = useMemo(() => {
    if (!didSearch || !nq || !pa) return []
    return pazienti.filter(
      (p) =>
        norm(p.id).includes(nq) ||
        norm(p.nome).includes(nq) ||
        norm(p.cognome).includes(nq) ||
        norm(p.note).includes(nq) ||
        norm(String(p.esito as EsitoPaziente)).includes(nq),
    )
  }, [pazienti, nq, pa, didSearch])

  const risEquip = useMemo(() => {
    if (!didSearch || !nq || !eq) return []
    return mezzi.filter((m) =>
      norm(equipaggioToPlainText(m.equipaggio)).includes(nq),
    )
  }, [mezzi, nq, eq, didSearch])

  const ultimiEventiChiusi = useMemo(
    () =>
      eventi
        .filter((e) => e.stato === 'CHIUSO')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
    [eventi],
  )
  const ultimeMissioniChiuse = useMemo(
    () =>
      missioni
        .filter((m) => m.stato === 'FINE_MISSIONE')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
    [missioni],
  )
  const ultimiPazientiChiusi = useMemo(
    () =>
      pazienti
        .filter((p) => p.trasportoCompletatoAt != null)
        .sort((a, b) =>
          (b.trasportoCompletatoAt ?? '').localeCompare(a.trasportoCompletatoAt ?? ''),
        )
        .slice(0, 20),
    [pazienti],
  )

  const totalSel = selEv.size + selMi.size + selPa.size
  const showBulkUi = isAdmin && cancellaMode

  const clearSelection = useCallback(() => {
    setSelEv(new Set())
    setSelMi(new Set())
    setSelPa(new Set())
  }, [])

  const exitCancellaMode = useCallback(() => {
    setCancellaMode(false)
    clearSelection()
  }, [clearSelection])

  const runSearch = () => {
    clearSelection()
    setDidSearch(true)
  }

  const confermaCancella = () => {
    if (!showBulkUi || totalSel === 0) return
    const lines: string[] = []
    if (selEv.size) lines.push(`• ${selEv.size} evento/i`)
    if (selMi.size) lines.push(`• ${selMi.size} missione/i`)
    if (selPa.size) lines.push(`• ${selPa.size} paziente/i`)
    const msg = [
      'Eliminare definitivamente i record selezionati?',
      '',
      ...lines,
      '',
      'Le missioni e i pazienti collegati a un evento eliminato verranno rimossi automaticamente.',
    ].join('\n')
    if (!window.confirm(msg)) return

    const evIds = [...selEv]
    const miIds = [...selMi]
    const paIds = [...selPa]
    const get = useAresStore.getState

    for (const id of evIds) get().deleteEvento(id)
    for (const id of miIds) get().deleteMissione(id)
    for (const id of paIds) get().deletePaziente(id)

    clearSelection()
  }

  return (
    <div className="ares-settings">
      <div className="ares-inline space-between" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Ricerca</h1>
        {isAdmin && (
          <div className="ares-inline">
            {!cancellaMode ? (
              <button
                type="button"
                className="ares-btn warning"
                title="Attiva checkbox su eventi, missioni e pazienti per una cancellazione multipla"
                onClick={() => setCancellaMode(true)}
              >
                Cancella
              </button>
            ) : (
              <button
                type="button"
                className="ares-btn ghost"
                onClick={() => exitCancellaMode()}
              >
                Esci da cancellazione
              </button>
            )}
          </div>
        )}
      </div>
      <p className="ares-muted">
        Filtra per testo libero e seleziona le categorie da includere.
        {isAdmin
          ? cancellaMode
            ? ' Modalità cancellazione: usa le checkbox, poi «Cancella» nel riepilogo per confermare.'
            : ' Come amministratore puoi usare il pulsante «Cancella» per selezionare ed eliminare più record.'
          : ''}
      </p>

      {showBulkUi && totalSel > 0 && (
        <section className="ares-settings-entity-panel ares-search-bulk-bar">
          <div className="ares-inline space-between">
            <span>
              Selezionati: <strong>{selEv.size}</strong> eventi,{' '}
              <strong>{selMi.size}</strong> missioni, <strong>{selPa.size}</strong> pazienti
            </span>
            <div className="ares-inline">
              <button type="button" className="ares-btn ghost" onClick={clearSelection}>
                Deseleziona tutto
              </button>
              <button type="button" className="ares-btn danger" onClick={confermaCancella}>
                Cancella
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="ares-settings-entity-panel">
        <h2>Ultimi 20 chiusi</h2>
        {showBulkUi ? (
          <p className="ares-muted">
            Seleziona le righe con le checkbox; quando hai una selezione compare il riepilogo
            con «Cancella» per confermare.
          </p>
        ) : (
          <p className="ares-muted">Clicca su un elemento per aprire il dettaglio.</p>
        )}
        <div className="ares-search-last-grid">
          <div>
            <h3>Eventi</h3>
            <ul className="ares-search-list">
              {ultimiEventiChiusi.map((e) => (
                <li key={e.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                  {showBulkUi && (
                    <label className="ares-search-check">
                      <input
                        type="checkbox"
                        checked={selEv.has(e.id)}
                        onChange={() => setSelEv((p) => toggleInSet(p, e.id))}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() => apri(() => openModalEvento(e.id))}
                  >
                    {e.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Missioni</h3>
            <ul className="ares-search-list">
              {ultimeMissioniChiuse.map((m) => (
                <li key={m.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                  {showBulkUi && (
                    <label className="ares-search-check">
                      <input
                        type="checkbox"
                        checked={selMi.has(m.id)}
                        onChange={() => setSelMi((p) => toggleInSet(p, m.id))}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() => apri(() => openModalMissione(m.id))}
                  >
                    {m.id} · {LABEL_STATO_MISSIONE[m.stato]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Pazienti</h3>
            <ul className="ares-search-list">
              {ultimiPazientiChiusi.map((p) => (
                <li key={p.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                  {showBulkUi && (
                    <label className="ares-search-check">
                      <input
                        type="checkbox"
                        checked={selPa.has(p.id)}
                        onChange={() => setSelPa((s) => toggleInSet(s, p.id))}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="ares-link-mission"
                    onClick={() => apri(() => openModalPaziente(p.id))}
                  >
                    {p.id} · {[p.nome, p.cognome].filter(Boolean).join(' ') || '—'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <div className="ares-form-grid tight">
        <label className="full">
          Testo
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, indirizzo, nome, …"
          />
        </label>
        <div className="ares-inline">
          <button type="button" className="ares-btn primary" onClick={runSearch}>
            Cerca
          </button>
        </div>
        <label className="ares-check">
          <input type="checkbox" checked={ev} onChange={(e) => setEv(e.target.checked)} />
          Eventi
        </label>
        <label className="ares-check">
          <input type="checkbox" checked={mi} onChange={(e) => setMi(e.target.checked)} />
          Missioni
        </label>
        <label className="ares-check">
          <input type="checkbox" checked={pa} onChange={(e) => setPa(e.target.checked)} />
          Pazienti
        </label>
        <label className="ares-check">
          <input type="checkbox" checked={eq} onChange={(e) => setEq(e.target.checked)} />
          Equipaggi (testo mezzi)
        </label>
      </div>

      {ev && risEventi.length > 0 && (
        <section className="ares-settings-entity-panel">
          <div className="ares-inline space-between">
            <h2>Eventi ({risEventi.length})</h2>
            {showBulkUi && (
              <button
                type="button"
                className="ares-btn small secondary"
                onClick={() =>
                  setSelEv((p) => {
                    const n = new Set(p)
                    for (const e of risEventi) n.add(e.id)
                    return n
                  })
                }
              >
                Seleziona tutti (questa lista)
              </button>
            )}
          </div>
          <ul className="ares-search-list">
            {risEventi.map((e) => (
              <li key={e.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                {showBulkUi && (
                  <label className="ares-search-check">
                    <input
                      type="checkbox"
                      checked={selEv.has(e.id)}
                      onChange={() => setSelEv((p) => toggleInSet(p, e.id))}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="ares-link-mission"
                  onClick={() => apri(() => openModalEvento(e.id))}
                >
                  {e.id}
                </button>
                <span className="ares-muted"> — {e.indirizzo || '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mi && risMissioni.length > 0 && (
        <section className="ares-settings-entity-panel">
          <div className="ares-inline space-between">
            <h2>Missioni ({risMissioni.length})</h2>
            {showBulkUi && (
              <button
                type="button"
                className="ares-btn small secondary"
                onClick={() =>
                  setSelMi((p) => {
                    const n = new Set(p)
                    for (const m of risMissioni) n.add(m.id)
                    return n
                  })
                }
              >
                Seleziona tutti (questa lista)
              </button>
            )}
          </div>
          <ul className="ares-search-list">
            {risMissioni.map((m) => (
              <li key={m.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                {showBulkUi && (
                  <label className="ares-search-check">
                    <input
                      type="checkbox"
                      checked={selMi.has(m.id)}
                      onChange={() => setSelMi((p) => toggleInSet(p, m.id))}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="ares-link-mission"
                  onClick={() => apri(() => openModalMissione(m.id))}
                >
                  {m.id}
                </button>
                <span className="ares-muted"> · evento {m.eventoId}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pa && risPazienti.length > 0 && (
        <section className="ares-settings-entity-panel">
          <div className="ares-inline space-between">
            <h2>Pazienti ({risPazienti.length})</h2>
            {showBulkUi && (
              <button
                type="button"
                className="ares-btn small secondary"
                onClick={() =>
                  setSelPa((p) => {
                    const n = new Set(p)
                    for (const x of risPazienti) n.add(x.id)
                    return n
                  })
                }
              >
                Seleziona tutti (questa lista)
              </button>
            )}
          </div>
          <ul className="ares-search-list">
            {risPazienti.map((p) => (
              <li key={p.id} className={showBulkUi ? 'ares-search-row' : undefined}>
                {showBulkUi && (
                  <label className="ares-search-check">
                    <input
                      type="checkbox"
                      checked={selPa.has(p.id)}
                      onChange={() => setSelPa((s) => toggleInSet(s, p.id))}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="ares-link-mission"
                  onClick={() => apri(() => openModalPaziente(p.id))}
                >
                  {p.id}
                </button>
                <span className="ares-muted">
                  {' '}
                  — {[p.nome, p.cognome].filter(Boolean).join(' ') || '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {eq && risEquip.length > 0 && (
        <section className="ares-settings-entity-panel">
          <h2>Mezzi con equipaggio corrispondente ({risEquip.length})</h2>
          <ul className="ares-search-list">
            {risEquip.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="ares-link-mission"
                  onClick={() => apri(() => openModalMezzo(m.id))}
                >
                  {m.sigla}
                </button>
                <pre className="ares-pre-small">{equipaggioToPlainText(m.equipaggio)}</pre>
              </li>
            ))}
          </ul>
        </section>
      )}

      {didSearch &&
        nq &&
        risEventi.length === 0 &&
        risMissioni.length === 0 &&
        risPazienti.length === 0 &&
        risEquip.length === 0 && (
          <p className="ares-muted">Nessun risultato.</p>
        )}
    </div>
  )
}
