"use client"

import { useEffect } from "react"

interface UseKeyboardShortcutsProps {
  onNextTurn: () => void
  onPreviousTurn: () => void
  onToggleTimer: () => void
  gameStarted: boolean
}

export const useKeyboardShortcuts = ({
  onNextTurn,
  onPreviousTurn,
  onToggleTimer,
  gameStarted,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.code) {
        case "Space":
          event.preventDefault()
          // Space bar only pauses/resumes the timer
          onToggleTimer()
          break
        case "ArrowRight":
          event.preventDefault()
          if (gameStarted) {
            onNextTurn()
          }
          break
        case "ArrowLeft":
          event.preventDefault()
          if (gameStarted) {
            onPreviousTurn()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNextTurn, onPreviousTurn, onToggleTimer, gameStarted])
}
