import { useCallback, useRef, type ClipboardEvent } from 'react'
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '../lib/roomCode'

type RoomCodeBoxesProps = {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  /** For label association */
  id?: string
}

/**
 * One box per room-code character; input is forced uppercase A–Z / 0–9.
 */
export function RoomCodeBoxes({ value, onChange, disabled, id }: RoomCodeBoxesProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const setRefs = useCallback((el: HTMLInputElement | null, index: number) => {
    inputsRef.current[index] = el
  }, [])

  const normalized = normalizeRoomCode(value).slice(0, ROOM_CODE_LENGTH)

  function applyAtIndex(index: number, raw: string): void {
    const ch = normalizeRoomCode(raw).slice(-1) ?? ''
    const before = normalized.slice(0, index)
    const after = normalized.slice(index + 1)
    const merged = normalizeRoomCode(before + ch + after).slice(0, ROOM_CODE_LENGTH)
    onChange(merged)
    if (ch && index < ROOM_CODE_LENGTH - 1) {
      queueMicrotask(() => inputsRef.current[index + 1]?.focus())
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault()
    const pasted = normalizeRoomCode(e.clipboardData.getData('text')).slice(
      0,
      ROOM_CODE_LENGTH,
    )
    if (!pasted) return
    onChange(pasted)
    const focusAt = Math.min(pasted.length, ROOM_CODE_LENGTH - 1)
    queueMicrotask(() => inputsRef.current[focusAt]?.select())
  }

  return (
    <fieldset>
      <legend className="sr-only">Room code, {ROOM_CODE_LENGTH} characters</legend>
      <div className="mt-2 flex justify-center gap-2 sm:gap-2.5">
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => {
          const char = normalized[index] ?? ''
          return (
            <input
              key={index}
              ref={(el) => setRefs(el, index)}
              id={id ? `${id}-${index}` : undefined}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={1}
              value={char}
              disabled={disabled}
              aria-label={`Room code character ${index + 1} of ${ROOM_CODE_LENGTH}`}
              className="h-12 w-10 rounded-lg border border-zinc-600 bg-zinc-900 text-center font-mono text-lg font-semibold uppercase tracking-wider text-zinc-100 caret-zinc-300 focus:border-amber-500/70 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 sm:h-14 sm:w-12 sm:text-xl"
              onChange={(e) => applyAtIndex(index, e.target.value)}
              onPaste={(e) => handlePaste(e)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !char && index > 0) {
                  e.preventDefault()
                  inputsRef.current[index - 1]?.focus()
                  const prev = normalized.slice(0, index - 1)
                  onChange(prev)
                }
              }}
            />
          )
        })}
      </div>
    </fieldset>
  )
}
