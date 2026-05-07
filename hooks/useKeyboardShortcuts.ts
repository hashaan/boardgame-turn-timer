"use client"

import { useEffect } from "react"

type KeyboardShortcutOptions = {
    onNextTurn: () => void
    onToggleTimer: () => void
    onUndo?: () => void
    onNextPlayer?: () => void
    onPreviousPlayer?: () => void
    gameStarted: boolean
}

const isShortcutKey = (event: KeyboardEvent, key: string) =>
    event.key === key || event.code === key

const isEditableTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) return false

    const tagName = element.tagName?.toLowerCase()
    return (
        element.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
    )
}

export function useKeyboardShortcuts({
    onNextTurn,
    onToggleTimer,
    onUndo,
    onNextPlayer,
    onPreviousPlayer,
    gameStarted,
}: KeyboardShortcutOptions) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) return

            const isUndo =
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === "z"

            if (isUndo && onUndo) {
                event.preventDefault()
                onUndo()
                return
            }

            if (
                event.key === " " ||
                event.key === "Spacebar" ||
                event.code === "Space"
            ) {
                event.preventDefault()
                onToggleTimer()
                return
            }

            if (isShortcutKey(event, "Enter") && gameStarted) {
                event.preventDefault()
                onNextTurn()
                return
            }

            if (isShortcutKey(event, "ArrowRight") && onNextPlayer) {
                event.preventDefault()
                onNextPlayer()
                return
            }

            if (isShortcutKey(event, "ArrowLeft") && onPreviousPlayer) {
                event.preventDefault()
                onPreviousPlayer()
            }
        }

        window.addEventListener("keydown", handleKeyDown, true)
        return () => window.removeEventListener("keydown", handleKeyDown, true)
    }, [
        gameStarted,
        onNextPlayer,
        onNextTurn,
        onPreviousPlayer,
        onToggleTimer,
        onUndo,
    ])
}
