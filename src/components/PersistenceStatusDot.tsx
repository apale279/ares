import { useEffect, useState } from 'react'
import {
  getPersistenceHealth,
  onPersistHealthChange,
  onSyncUpdate,
} from '../store/supabasePersistStorage'

export function PersistenceStatusDot() {
  const [tick, setTick] = useState(0)

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
  )
}
