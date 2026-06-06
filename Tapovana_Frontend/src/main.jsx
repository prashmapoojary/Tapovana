import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startKeepAlive } from './utils/keepAlive.js'

// Keep Render free-tier backend alive by pinging /health every 14 minutes
startKeepAlive();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
