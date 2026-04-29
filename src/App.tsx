import { useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { Dashboard } from './views/Dashboard'
import { PmaVista } from './views/PmaVista'
import { Settings } from './views/Settings'
import { Ricerca } from './views/Ricerca'
import { MezzoVista } from './views/MezzoVista'
import { Diario } from './views/Diario'
import { EventDetailModal } from './components/EventDetailModal'
import { MissionDetailModal } from './components/MissionDetailModal'
import { PatientDetailModal } from './components/PatientDetailModal'
import { MezzoDetailModal } from './components/MezzoDetailModal'
import { useAresStore } from './store/aresStore'
import {
  forceSupabaseSync,
  getLastSyncAt,
  isSupabaseConfigured,
  onSyncUpdate,
} from './store/supabasePersistStorage'
import type { AppRouteKey } from './types'
import './ares.css'

const ROUTES: { key: AppRouteKey; label: string; to: string }[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'diario', label: 'Diario', to: '/diario' },
  { key: 'ricerca', label: 'Ricerca', to: '/ricerca' },
  { key: 'impostazioni', label: 'Impostazioni', to: '/impostazioni' },
  { key: 'pma', label: 'PMA', to: '/PMA' },
  { key: 'mezzo', label: 'Vista mezzo', to: '/mezzo' },
]

function GlobalModals() {
  const openModalEvento = useAresStore((s) => s.openModalEvento)
  const openModalMissione = useAresStore((s) => s.openModalMissione)
  const openModalPaziente = useAresStore((s) => s.openModalPaziente)
  const openModalMezzo = useAresStore((s) => s.openModalMezzo)
  return (
    <>
      <EventDetailModal onClose={() => openModalEvento(null)} />
      <MissionDetailModal onClose={() => openModalMissione(null)} />
      <PatientDetailModal onClose={() => openModalPaziente(null)} />
      <MezzoDetailModal onClose={() => openModalMezzo(null)} />
    </>
  )
}

export default function App() {
  const navigate = useNavigate()
  const firstAllowedPath = useMemo(() => '/dashboard', [])
  const authEnabled = false
  const [syncBusy, setSyncBusy] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncAt())
  const syncEnabled = isSupabaseConfigured()

  const canRoute = (_k: AppRouteKey): boolean => !authEnabled || true

  useEffect(() => onSyncUpdate((iso) => setLastSync(iso)), [])

  const syncLabel = lastSync
    ? `SYNC ${new Date(lastSync).toLocaleString('it-IT')}`
    : 'SYNC --'

  return (
    <div className="ares-app">
      <nav className="ares-nav">
        {syncEnabled && (
          <button
            type="button"
            className="ares-nav-sync"
            disabled={syncBusy}
            onClick={async () => {
              const key = useAresStore.persist.getOptions().name
              if (!key) return
              setSyncBusy(true)
              try {
                await forceSupabaseSync(key)
              } finally {
                setSyncBusy(false)
              }
            }}
          >
            {syncBusy ? 'SYNC...' : syncLabel}
          </button>
        )}
        {ROUTES.filter((r) => canRoute(r.key)).map((r) => (
          <NavLink key={r.key} to={r.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {r.label}
          </NavLink>
        ))}
      </nav>
      <main className="ares-main">
        <Routes>
          <Route path="/" element={<Navigate to={firstAllowedPath} replace />} />
          <Route path="/dashboard" element={canRoute('dashboard') ? <Dashboard /> : <Navigate to={firstAllowedPath} replace />} />
          <Route path="/impostazioni" element={canRoute('impostazioni') ? <Settings /> : <Navigate to={firstAllowedPath} replace />} />
          <Route path="/PMA" element={canRoute('pma') ? <PmaVista /> : <Navigate to={firstAllowedPath} replace />} />
          <Route path="/mezzo" element={canRoute('mezzo') ? <MezzoVista /> : <Navigate to={firstAllowedPath} replace />} />
          <Route path="/diario" element={canRoute('diario') ? <Diario /> : <Navigate to={firstAllowedPath} replace />} />
          <Route
            path="/ricerca"
            element={
              canRoute('ricerca') ? (
                <Ricerca onOpenDetail={() => navigate('/dashboard')} />
              ) : (
                <Navigate to={firstAllowedPath} replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={firstAllowedPath} replace />} />
        </Routes>
      </main>
      <GlobalModals />
    </div>
  )
}
