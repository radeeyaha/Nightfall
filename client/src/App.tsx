import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CreateRoomPage } from './pages/CreateRoomPage'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { JoinRoomPage } from './pages/JoinRoomPage'
import { LobbyPage } from './pages/LobbyPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
