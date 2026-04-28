import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AresBootstrap } from './components/AresBootstrap'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AresBootstrap>
      <App />
    </AresBootstrap>
  </StrictMode>,
)
