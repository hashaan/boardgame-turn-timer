"use client"

import { useEffect } from "react"

interface UseKeyboardShortcutsProps {
    onNextTurn: () => void
    onToggleTimer: () => void
    onUndo?: () => void
    gameStarted: boolean
}

export const useKeyboardShortcuts = ({
    onNextTurn,
    onToggleTimer,
    onUndo,
    gameStarted,
}: UseKeyboardShortcutsProps) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return
            }

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "z"
            ) {
                if (gameStarted && onUndo) {
                    event.preventDefault()
                    onUndo()
                }
                return
            }

            switch (event.code) {
                case "Space":
                    event.preventDefault()
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
                    if (gameStarted && onUndo) {
                        onUndo()
                    }
                    break
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onNextTurn, onToggleTimer, onUndo, gameStarted])
}
