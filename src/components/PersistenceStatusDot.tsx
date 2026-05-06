import { useEffect, useState } from 'react'
import {
  getPersistenceHealth,
  listPersistAuditLogs,
  onPersistHealthChange,
  onSyncUpdate,
} from '../store/supabasePersistStorage'

export function PersistenceStatusDot() {
  const [tick, setTick] = useState(0)
  const [openLog, setOpenLog] = useState(false)
  const [logBusy, setLogBusy] = useState(false)
  const [logRows, setLogRows] = useState<
    { timestamp: string; userId: string; action: string; detail: string }[]
  >([])

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const u1 = onPersistHealthChange(bump)
    const u2 = onSyncUpdate(bump)
    const id = window.setInterval(bump, 2000)
    return () => {
      u1()
      u2()
      window.clearInterval(id)
    }
  }, [])

  void tick
  const h = getPersistenceHealth()
  const ok = h.status === 'cloud_ok'
  const label = ok ? 'Dati su Supabase' : 'Attenzione persistenza'

  return (
    <>
      <div className="ares-inline" style={{ gap: 8 }}>
        <button
          type="button"
          className={`ares-persist-dot${ok ? ' ares-persist-dot--ok' : ' ares-persist-dot--bad'}`}
          title={h.title}
          aria-label={label}
          onClick={() => {
            const sync = h.lastSyncAt
              ? `\n\nUltimo salvataggio cloud: ${new Date(h.lastSyncAt).toLocaleString('it-IT')}.`
              : ''
            window.alert(`${h.title}\n\n${h.detail}${sync}`)
          }}
        />
        <button
          type="button"
          className="ares-btn ghost"
          onClick={async () => {
            setOpenLog(true)
            setLogBusy(true)
            try {
              const logs = await listPersistAuditLogs(200)
              setLogRows(logs)
            } finally {
              setLogBusy(false)
            }
          }}
        >
          LOG
        </button>
      </div>
      {openLog && (
        <div className="ares-modal-backdrop" role="presentation" onClick={() => setOpenLog(false)}>
          <div
            className="ares-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ares-modal-head">
              <h2>Registro modifiche DB</h2>
              <button type="button" className="ares-btn ghost" onClick={() => setOpenLog(false)}>
                Chiudi
              </button>
            </header>
            <div className="ares-modal-scroll">
              {logBusy && <p className="ares-muted">Caricamento log...</p>}
              {!logBusy && logRows.length === 0 && (
                <p className="ares-muted">Nessuna voce di log disponibile.</p>
              )}
              {!logBusy && logRows.length > 0 && (
                <table className="ares-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Utente</th>
                      <th>Modifica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map((r, i) => (
                      <tr key={`${r.timestamp}_${i}`}>
                        <td>{r.timestamp ? new Date(r.timestamp).toLocaleString('it-IT') : '—'}</td>
                        <td>{r.userId || '—'}</td>
                        <td>{r.detail || r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
