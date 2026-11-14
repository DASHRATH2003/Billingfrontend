import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, getInitialDarkMode } from './lib/theme.js'

// Apply the saved light/dark mode before the first paint so no page flashes white.
applyTheme(getInitialDarkMode())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
