import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PrivateRoleProvider } from './game/PrivateRoleProvider'
import { SocketProvider } from './socket/SocketContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <PrivateRoleProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PrivateRoleProvider>
    </SocketProvider>
  </StrictMode>,
)
