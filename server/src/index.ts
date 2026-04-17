import http from 'node:http'
import cors from 'cors'
import express from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { getCorsOrigin } from './lib/corsOrigins.js'
import { registerSocketHandlers } from './socket/registerSocket.js'
import { GameStore } from './store/gameStore.js'

const PORT = Number(process.env.PORT) || 3001
const corsOrigin = getCorsOrigin()

const app = express()
app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const httpServer = http.createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
})

const store = new GameStore()
registerSocketHandlers(io, store)

httpServer.listen(PORT, () => {
  console.log(`API + Socket.IO listening on http://localhost:${PORT}`)
  console.log(
    `CORS origin: ${
      corsOrigin === true
        ? 'reflect request (dev — any Vite port)'
        : corsOrigin.join(', ')
    }`,
  )
})
