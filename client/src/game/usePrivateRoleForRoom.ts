import { useContext } from 'react'
import type { GameYourRolePayload } from '../socket/protocol'
import { PrivateRoleContext } from './privateRoleContextInternals'

export function usePrivateRoleForRoom(
  roomCode: string,
): GameYourRolePayload | undefined {
  return useContext(PrivateRoleContext)[roomCode]
}
