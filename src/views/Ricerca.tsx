import { useMemo, useState } from 'react'
import { equipaggioToPlainText } from '../utils/equipaggioPrint'
import type { EsitoPaziente } from '../types'
import { useAresStore } from '../store/aresStore'

function norm(s: string): string {
  return s.toLowerCase().trim()
}

export function Ricerca({
  onOpenDetail,
}: {
  /** Es. passa a Dashboard così le schede modali restano visibili sopra. */
  onOpenDetail?: () => void
}) {
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

  const nq = norm(q)

  const risEventi = useMemo(() => {
    if (!nq || !ev) return []
    return eventi.filter(
      (e) =>
        norm(e.id).includes(nq) ||
        norm(e.indirizzo).includes(nq) ||
        norm(e.descrizione).includes(nq) ||
        norm(e.segnalatoDa).includes(nq),
    )
  }, [eventi, nq, ev])

  const risMissioni = useMemo(() => {
    if (!nq || !mi) return []
    return missioni.filter(
      (m) => norm(m.id).includes(nq) || norm(m.eventoId).includes(nq),
    )
  }, [missioni, nq, mi])

  const risPazienti = useMemo(() => {
    if (!nq || !pa) return []
    return pazienti.filter(
      (p) =>
        norm(p.id).includes(nq) ||
        norm(p.nome).includes(nq) ||
        norm(p.cognome).includes(nq) ||
        norm(p.note).includes(nq) ||
        norm(String(p.esito as EsitoPaziente)).includes(nq),
    )
  }, [pazienti, nq, pa])

  const risEquip = useMemo(() => {
    if (!nq || !eq) return []
    return mezzi.filter((m) =>
      norm(equipaggioToPlainText(m.equipaggio)).includes(nq),
    )
  }, [mezzi, nq, eq])

  return (
    <div className="ares-settings">
      <h1>Ricerca</h1>
      <p className="ares-muted">
        Filtra per testo libero. Seleziona le categorie da includere.
      </p>
      <div className="ares-form-grid tight">
        <label className="full">
          Testo
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, indirizzo, nome, …"
          />
        </label>
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
          <h2>Eventi ({risEventi.length})</h2>
          <ul className="ares-search-list">
            {risEventi.map((e) => (
              <li key={e.id}>
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
          <h2>Missioni ({risMissioni.length})</h2>
          <ul className="ares-search-list">
            {risMissioni.map((m) => (
              <li key={m.id}>
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
          <h2>Pazienti ({risPazienti.length})</h2>
          <ul className="ares-search-list">
            {risPazienti.map((p) => (
              <li key={p.id}>
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

      {nq &&
        risEventi.length === 0 &&
        risMissioni.length === 0 &&
        risPazienti.length === 0 &&
        risEquip.length === 0 && (
          <p className="ares-muted">Nessun risultato.</p>
        )}
    </div>
  )
}
