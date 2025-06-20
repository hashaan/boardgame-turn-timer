"use client"

import { useCallback, useRef, useEffect } from "react"

interface SoundNotificationOptions {
  enabled: boolean
  volume: number
  warningTime: number // seconds before turn ends to play warning
}

interface SoundNotificationHook {
  playTurnStart: () => void
  playTurnEnd: () => void
  playWarning: () => void
  playGameEnd: () => void
  updateSettings: (settings: Partial<SoundNotificationOptions>) => void
  settings: SoundNotificationOptions
}

export function useSoundNotifications(
  initialSettings: SoundNotificationOptions = {
    enabled: true,
    volume: 0.5,
    warningTime: 30,
  },
): SoundNotificationHook {
  const settingsRef = useRef<SoundNotificationOptions>(initialSettings)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
    }

    // Initialize on first user interaction
    const handleFirstInteraction = () => {
      initAudioContext()
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)
    document.addEventListener("keydown", handleFirstInteraction)

    return () => {
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
    }
  }, [])

  // Create different tones for different notifications
  const createTone = useCallback(
    (frequency: number, duration: number, type: "sine" | "square" | "triangle" = "sine") => {
      if (!settingsRef.current.enabled || !audioContextRef.current) return

      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
      gainNode.gain.linearRampToValueAtTime(settingsRef.current.volume, audioContextRef.current.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
    },
    [],
  )

  const playTurnStart = useCallback(() => {
    // Pleasant ascending chime
    createTone(523.25, 0.2) // C5
    setTimeout(() => createTone(659.25, 0.2), 100) // E5
    setTimeout(() => createTone(783.99, 0.3), 200) // G5
  }, [createTone])

  const playTurnEnd = useCallback(() => {
    // Gentle descending tone
    createTone(783.99, 0.2) // G5
    setTimeout(() => createTone(659.25, 0.2), 150) // E5
    setTimeout(() => createTone(523.25, 0.3), 300) // C5
  }, [createTone])

  const playWarning = useCallback(() => {
    // Urgent but not harsh warning
    createTone(880, 0.15, "triangle") // A5
    setTimeout(() => createTone(880, 0.15, "triangle"), 200)
    setTimeout(() => createTone(880, 0.15, "triangle"), 400)
  }, [createTone])

  const playGameEnd = useCallback(() => {
    // Triumphant ending sequence
    createTone(523.25, 0.2) // C5
    setTimeout(() => createTone(659.25, 0.2), 100) // E5
    setTimeout(() => createTone(783.99, 0.2), 200) // G5
    setTimeout(() => createTone(1046.5, 0.4), 300) // C6
  }, [createTone])

  const updateSettings = useCallback((newSettings: Partial<SoundNotificationOptions>) => {
    settingsRef.current = { ...settingsRef.current, ...newSettings }
  }, [])

  return {
    playTurnStart,
    playTurnEnd,
    playWarning,
    playGameEnd,
    updateSettings,
    settings: settingsRef.current,
  }
}
