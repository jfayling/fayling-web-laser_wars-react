import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { SettingsProvider } from './contexts/SettingsContext'
import { MultiplayerProvider } from './contexts/MultiplayerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <MultiplayerProvider>
        <App />
      </MultiplayerProvider>
    </SettingsProvider>
  </StrictMode>,
)
