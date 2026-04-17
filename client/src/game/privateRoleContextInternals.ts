import { createContext } from 'react'
import type { GameYourRolePayload } from '../socket/protocol'

export type PrivateRoleByRoom = Record<string, GameYourRolePayload>

export const PrivateRoleContext = createContext<PrivateRoleByRoom>({})
