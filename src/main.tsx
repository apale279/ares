import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AresBootstrap } from './components/AresBootstrap'
import { applyStoredFontStep } from './utils/fontScale'
import './index.css'
import App from './App.tsx'

applyStoredFontStep()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AresBootstrap>
      <App />
    </AresBootstrap>
  </StrictMode>,
)
