import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AresBootstrap } from './components/AresBootstrap'
import { applyStoredFontStep } from './utils/fontScale'
import './index.css'
import App from './App.tsx'

applyStoredFontStep()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AresBootstrap>
        <App />
      </AresBootstrap>
    </BrowserRouter>
  </StrictMode>,
)
