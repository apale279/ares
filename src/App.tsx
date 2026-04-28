import { useState } from 'react'
import { Dashboard } from './views/Dashboard'
import { PmaVista } from './views/PmaVista'
import { Settings } from './views/Settings'
import { Ricerca } from './views/Ricerca'
import { MezzoVista } from './views/MezzoVista'
import { EventDetailModal } from './components/EventDetailModal'
import { MissionDetailModal } from './components/MissionDetailModal'
import { PatientDetailModal } from './components/PatientDetailModal'
import { MezzoDetailModal } from './components/MezzoDetailModal'
import { useAresStore } from './store/aresStore'
import './ares.css'

type Tab = 'pma' | 'dashboard' | 'impostazioni' | 'ricerca' | 'mezzo'

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
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="ares-app">
      <nav className="ares-nav">
        <button
          type="button"
          className={tab === 'dashboard' ? 'active' : ''}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={tab === 'ricerca' ? 'active' : ''}
          onClick={() => setTab('ricerca')}
        >
          Ricerca
        </button>
        <button
          type="button"
          className={tab === 'impostazioni' ? 'active' : ''}
          onClick={() => setTab('impostazioni')}
        >
          Impostazioni
        </button>
        <button
          type="button"
          className={tab === 'pma' ? 'active' : ''}
          onClick={() => setTab('pma')}
        >
          PMA
        </button>
        <button
          type="button"
          className={tab === 'mezzo' ? 'active' : ''}
          onClick={() => setTab('mezzo')}
        >
          Vista mezzo
        </button>
      </nav>
      <main className="ares-main">
        {tab === 'dashboard' ? <Dashboard /> : null}
        {tab === 'impostazioni' ? <Settings /> : null}
        {tab === 'pma' ? <PmaVista /> : null}
        {tab === 'mezzo' ? <MezzoVista /> : null}
        {tab === 'ricerca' ? (
          <Ricerca onOpenDetail={() => setTab('dashboard')} />
        ) : null}
      </main>
      <GlobalModals />
    </div>
  )
}
