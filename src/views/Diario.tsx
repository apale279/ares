import { useMemo, useState } from 'react'
import type { Nota, StatoNota } from '../types'
import { useAresStore } from '../store/aresStore'
import { formatDataOra } from '../utils/format'

const STATI_NOTA: StatoNota[] = ['APERTA', 'IN_CORSO', 'CHIUSA']

export function Diario() {
  const note = useAresStore((s) => s.note)
  const addNota = useAresStore((s) => s.addNota)
  const updateNota = useAresStore((s) => s.updateNota)
  const deleteNota = useAresStore((s) => s.deleteNota)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({
    titolo: '',
    testo: '',
    stato: 'APERTA' as StatoNota,
    importante: false,
  })

  const noteOrdinate = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...note]
      .filter((n) =>
        q ? `${n.titolo}\n${n.testo}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [note, search])

  const resetDraft = () => {
    setEditingId(null)
    setShowEditor(false)
    setDraft({ titolo: '', testo: '', stato: 'APERTA', importante: false })
  }

  const startEdit = (n: Nota) => {
    setEditingId(n.id)
    setShowEditor(true)
    setDraft({
      titolo: n.titolo,
      testo: n.testo,
      stato: n.stato,
      importante: n.importante,
    })
  }

  const salva = () => {
    if (!draft.titolo.trim()) return
    if (editingId) {
      updateNota(editingId, {
        titolo: draft.titolo.trim(),
        testo: draft.testo.trim(),
        stato: draft.stato,
        importante: draft.importante,
      })
      resetDraft()
      return
    }
    addNota(draft)
    resetDraft()
  }

  const noteAperte = noteOrdinate.filter((n) => n.stato !== 'CHIUSA')
  const noteChiuse = noteOrdinate.filter((n) => n.stato === 'CHIUSA')

  return (
    <div className="ares-settings">
      <h1>Diario</h1>
      <p className="ares-muted">Note operative con stato e priorita.</p>

      <div className="ares-inline space-between">
        <input
          value={search}
          placeholder="Cerca..."
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="ares-btn primary"
          onClick={() => {
            setEditingId(null)
            setShowEditor(true)
            setDraft({ titolo: '', testo: '', stato: 'APERTA', importante: false })
          }}
        >
          Aggiungi nota
        </button>
      </div>

      {showEditor && (
        <section className="ares-settings-entity-panel">
          <h2>{editingId ? 'Modifica nota' : 'Nuova nota'}</h2>
          <div className="ares-form-grid">
            <label className="full">
              Titolo
              <input
                value={draft.titolo}
                onChange={(e) => setDraft((d) => ({ ...d, titolo: e.target.value }))}
              />
            </label>
            <label className="full">
              Testo
              <textarea
                rows={4}
                value={draft.testo}
                onChange={(e) => setDraft((d) => ({ ...d, testo: e.target.value }))}
              />
            </label>
            <label>
              Stato
              <select
                value={draft.stato}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, stato: e.target.value as StatoNota }))
                }
              >
                {STATI_NOTA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="ares-check">
              <input
                type="checkbox"
                checked={draft.importante}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, importante: e.target.checked }))
                }
              />
              Importante
            </label>
          </div>
          <div className="ares-inline">
            <button type="button" className="ares-btn primary" onClick={salva}>
              {editingId ? 'Salva modifiche' : 'Aggiungi nota'}
            </button>
            <button type="button" className="ares-btn ghost" onClick={resetDraft}>
              Chiudi editor
            </button>
            {editingId && (
              <button
                type="button"
                className="ares-btn danger"
                onClick={() => {
                  deleteNota(editingId)
                  resetDraft()
                }}
              >
                Elimina nota
              </button>
            )}
          </div>
        </section>
      )}

      <section className="ares-settings-entity-panel">
        <h2>Note aperte</h2>
        <div className="ares-table-wrap">
          <table className="ares-table">
            <thead>
              <tr>
                <th>Data/ora</th>
                <th>Titolo</th>
                <th>Testo</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {noteAperte.map((n) => (
                <tr key={n.id} className="ares-click" onClick={() => startEdit(n)}>
                  <td>{formatDataOra(n.createdAt)}</td>
                  <td>{n.titolo || '(senza titolo)'}</td>
                  <td>{n.testo || '—'}</td>
                  <td>{n.stato}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ares-settings-entity-panel">
        <h2>Note chiuse</h2>
        <div className="ares-table-wrap">
          <table className="ares-table">
            <thead>
              <tr>
                <th>Data/ora</th>
                <th>Titolo</th>
                <th>Testo</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {noteChiuse.map((n) => (
                <tr key={n.id} className="ares-click" onClick={() => startEdit(n)}>
                  <td>{formatDataOra(n.createdAt)}</td>
                  <td>{n.titolo || '(senza titolo)'}</td>
                  <td>{n.testo || '—'}</td>
                  <td>{n.stato}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
