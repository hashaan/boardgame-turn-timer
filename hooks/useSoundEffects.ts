"use client"

import { useRef, useCallback } from "react"

interface SoundEffects {
  playTurnChange: () => void
  playReveal: () => void
  playRoundEnd: () => void
  playOvertime: () => void
  playGameStart: () => void
}

export const useSoundEffects = (enabled = true): SoundEffects => {
  const audioContextRef = useRef<AudioContext | null>(null)

  const createBeep = useCallback(
    (frequency: number, duration: number, volume = 0.1) => {
      if (!enabled || typeof window === "undefined") return

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }

        const ctx = audioContextRef.current
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.frequency.value = frequency
        oscillator.type = "sine"

        gainNode.gain.setValueAtTime(0, ctx.currentTime)
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + duration)
      } catch (error) {
        console.log("Audio not supported:", error)
      }
    },
    [enabled],
  )

  const playTurnChange = useCallback(() => {
    createBeep(800, 0.1)
  }, [createBeep])

  const playReveal = useCallback(() => {
    createBeep(600, 0.2)
    setTimeout(() => createBeep(900, 0.2), 100)
  }, [createBeep])

  const playRoundEnd = useCallback(() => {
    createBeep(400, 0.3)
    setTimeout(() => createBeep(600, 0.3), 150)
    setTimeout(() => createBeep(800, 0.3), 300)
  }, [createBeep])

  const playOvertime = useCallback(() => {
    createBeep(300, 0.5, 0.05)
  }, [createBeep])

  const playGameStart = useCallback(() => {
    createBeep(600, 0.2)
    setTimeout(() => createBeep(800, 0.2), 100)
    setTimeout(() => createBeep(1000, 0.3), 200)
  }, [createBeep])

  return {
    playTurnChange,
    playReveal,
    playRoundEnd,
    playOvertime,
    playGameStart,
  }
}
