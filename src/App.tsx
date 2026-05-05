import { useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Dashboard } from './views/Dashboard'
import { PmaModulo } from './views/PmaModulo'
import { Settings } from './views/Settings'
import { Ricerca } from './views/Ricerca'
import { MezzoVista } from './views/MezzoVista'
import { Diario } from './views/Diario'
import { Login } from './views/Login'
import { EventDetailModal } from './components/EventDetailModal'
import { MissionDetailModal } from './components/MissionDetailModal'
import { PatientDetailModal } from './components/PatientDetailModal'
import { MezzoDetailModal } from './components/MezzoDetailModal'
import { PersistenceStatusDot } from './components/PersistenceStatusDot'
import { useAresStore } from './store/aresStore'
import {
  forceSupabaseSync,
  getLastSyncAt,
  isSupabaseConfigured,
  onSyncUpdate,
} from './store/supabasePersistStorage'
import type { AppRouteKey } from './types'
import { appVersionNavLabel } from './utils/appVersionLabel'
import { firstAllowedRoutePath, routeAllowedForUser } from './utils/routeAccess'
import './ares.css'

const ROUTES: { key: AppRouteKey; label: string; to: string }[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'diario', label: 'Diario', to: '/diario' },
  { key: 'ricerca', label: 'Ricerca', to: '/ricerca' },
  { key: 'impostazioni', label: 'Impostazioni', to: '/impostazioni' },
  { key: 'pma_modulo', label: 'Vista PMA', to: '/pma' },
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

function AppShellRoutes() {
  const navigate = useNavigate()
  const impostazioni = useAresStore((s) => s.impostazioni)
  const { session, logout } = useAuth()
  const userId = session?.userId

  const firstAllowedPath = useMemo(
    () => firstAllowedRoutePath(impostazioni, userId),
    [impostazioni, userId],
  )

  const [syncBusy, setSyncBusy] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncAt())
  const syncEnabled = isSupabaseConfigured()

  useEffect(() => onSyncUpdate((iso) => setLastSync(iso)), [])

  const syncLabel = lastSync
    ? `SYNC ${new Date(lastSync).toLocaleString('it-IT')}`
    : 'SYNC --'

  const canRoute = useMemo(
    () => (k: AppRouteKey) => routeAllowedForUser(impostazioni, userId, k),
    [impostazioni, userId],
  )

  return (
    <div className="ares-app">
      <nav className="ares-nav ares-nav--triple">
        <div className="ares-nav-left">
          <PersistenceStatusDot />
          <span className="ares-nav-version" title={`ARES ${appVersionNavLabel()}`}>
            {appVersionNavLabel()}
          </span>
        </div>
        <div className="ares-nav-center">
          {ROUTES.filter((r) => canRoute(r.key)).map((r) => (
            <NavLink
              key={r.key}
              to={r.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {r.label}
            </NavLink>
          ))}
        </div>
        <div className="ares-nav-right">
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
          <button
            type="button"
            className="ares-btn ghost ares-nav-logout"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="ares-main">
        <Routes>
          <Route path="/" element={<Navigate to={firstAllowedPath} replace />} />
          <Route
            path="/dashboard"
            element={
              canRoute('dashboard') ? <Dashboard /> : <Navigate to={firstAllowedPath} replace />
            }
          />
          <Route
            path="/impostazioni"
            element={
              canRoute('impostazioni') ? (
                <Settings />
              ) : (
                <Navigate to={firstAllowedPath} replace />
              )
            }
          />
          <Route
            path="/pma"
            element={
              canRoute('pma_modulo') ? <PmaModulo /> : <Navigate to={firstAllowedPath} replace />
            }
          />
          <Route path="/PMA" element={<Navigate to="/pma" replace />} />
          <Route path="/pma-modulo" element={<Navigate to="/pma" replace />} />
          <Route
            path="/mezzo"
            element={canRoute('mezzo') ? <MezzoVista /> : <Navigate to={firstAllowedPath} replace />}
          />
          <Route
            path="/diario"
            element={canRoute('diario') ? <Diario /> : <Navigate to={firstAllowedPath} replace />}
          />
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
          <Route path="/login" element={<Navigate to={firstAllowedPath} replace />} />
          <Route path="*" element={<Navigate to={firstAllowedPath} replace />} />
        </Routes>
      </main>
      <GlobalModals />
    </div>
  )
}

export default function App() {
  const { session } = useAuth()
  const modalitaSviluppo = useAresStore((s) => s.impostazioni.modalitaSviluppo === true)

  if (!session && !modalitaSviluppo) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return <AppShellRoutes />
}
