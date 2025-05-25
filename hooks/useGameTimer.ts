"use client"

import { useState, useEffect, useRef } from "react"
import type { Player } from "@/types"
import { DEFAULT_INITIAL_TIME } from "@/constants"
import { useLocalStorage } from "./useLocalStorage"
import { useSoundEffects } from "./useSoundEffects"

const initialPlayers: Player[] = [
  {
    id: 1,
    name: "Player 1",
    timeRemaining: DEFAULT_INITIAL_TIME,
    totalEfficiency: 0,
    currentTurnEfficiency: 0,
    turnsCompleted: 0,
    isActive: true,
    color: "blue",
    isRevealing: false,
    isOutOfRound: false,
  },
  {
    id: 2,
    name: "Player 2",
    timeRemaining: DEFAULT_INITIAL_TIME,
    totalEfficiency: 0,
    currentTurnEfficiency: 0,
    turnsCompleted: 0,
    isActive: false,
    color: "green",
    isRevealing: false,
    isOutOfRound: false,
  },
  {
    id: 3,
    name: "Player 3",
    timeRemaining: DEFAULT_INITIAL_TIME,
    totalEfficiency: 0,
    currentTurnEfficiency: 0,
    turnsCompleted: 0,
    isActive: false,
    color: "purple",
    isRevealing: false,
    isOutOfRound: false,
  },
  {
    id: 4,
    name: "Player 4",
    timeRemaining: DEFAULT_INITIAL_TIME,
    totalEfficiency: 0,
    currentTurnEfficiency: 0,
    turnsCompleted: 0,
    isActive: false,
    color: "orange",
    isRevealing: false,
    isOutOfRound: false,
  },
]

export const useGameTimer = () => {
  const [players, setPlayers] = useLocalStorage<Player[]>("dune-timer-players", initialPlayers)
  const [isRunning, setIsRunning] = useLocalStorage<boolean>("dune-timer-running", false)
  const [turnStartTime, setTurnStartTime] = useState<number | null>(null)
  const [pausedElapsedTime, setPausedElapsedTime] = useState<number>(0)
  const [gameStarted, setGameStarted] = useLocalStorage<boolean>("dune-timer-started", false)
  const [currentRound, setCurrentRound] = useLocalStorage<number>("dune-timer-round", 1)
  const [initialTime, setInitialTime] = useLocalStorage<number>("dune-timer-initial", DEFAULT_INITIAL_TIME)
  const [showSettings, setShowSettings] = useState(false)
  const [showAdjustButtons, setShowAdjustButtons] = useLocalStorage<boolean>("dune-timer-adjust-buttons", false)
  const [showColorSelectors, setShowColorSelectors] = useState(true)
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("dune-timer-sound", true)
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [draggedPlayer, setDraggedPlayer] = useState<number | null>(null)
  const [lastOvertimeWarning, setLastOvertimeWarning] = useState<number>(0)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null)
  const [manualNavigation, setManualNavigation] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const manualNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const sounds = useSoundEffects(soundEnabled)

  const activePlayer = players.find((p) => p.isActive)
  const activePlayerIndex = players.findIndex((p) => p.isActive)

  // Auto-track active player ONLY when game is running and no manual navigation
  // Removed currentPlayerIndex from dependencies to prevent conflicts
  useEffect(() => {
    const isPaused = gameStarted && !isRunning

    // Don't auto-track when:
    // 1. Game is paused (allow free navigation)
    // 2. User is manually navigating
    // 3. Already on the correct card
    // 4. Currently transitioning
    if (isPaused || manualNavigation || activePlayerIndex === currentPlayerIndex || isTransitioning) {
      return
    }

    // Only auto-track when game is running and active player changed
    if (activePlayerIndex !== -1 && activePlayerIndex !== currentPlayerIndex && isRunning && gameStarted) {
      console.log("Auto-tracking to active player:", activePlayerIndex)
      setIsTransitioning(true)
      setSlideDirection("right")
      setTimeout(() => {
        setCurrentPlayerIndex(activePlayerIndex)
        setTimeout(() => {
          setIsTransitioning(false)
          setSlideDirection(null)
        }, 500)
      }, 50)
    }
  }, [activePlayerIndex, gameStarted, isRunning, manualNavigation, isTransitioning]) // Removed currentPlayerIndex

  // Timer effect with proper pause functionality
  useEffect(() => {
    if (isRunning && activePlayer && turnStartTime) {
      intervalRef.current = setInterval(() => {
        setPlayers((prev) =>
          prev.map((player) => {
            if (player.isActive) {
              const currentTurnTime = Math.floor((Date.now() - turnStartTime) / 1000) + pausedElapsedTime
              const currentEfficiency = 60 - currentTurnTime

              if (currentTurnTime > 60 && Math.floor(currentTurnTime / 30) > lastOvertimeWarning) {
                sounds.playOvertime()
                setLastOvertimeWarning(Math.floor(currentTurnTime / 30))
              }

              return {
                ...player,
                timeRemaining: Math.max(0, player.timeRemaining - 1),
                currentTurnEfficiency: currentEfficiency,
              }
            }
            return player
          }),
        )
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, activePlayer, turnStartTime, pausedElapsedTime, sounds, lastOvertimeWarning, setPlayers])

  // Auto-save game state
  useEffect(() => {
    if (gameStarted && turnStartTime && typeof window !== "undefined") {
      localStorage.setItem("dune-timer-turn-start", turnStartTime.toString())
      localStorage.setItem("dune-timer-paused-elapsed", pausedElapsedTime.toString())
    }
  }, [gameStarted, turnStartTime, pausedElapsedTime])

  // Restore turn start time and paused elapsed time
  useEffect(() => {
    if (gameStarted && !turnStartTime && typeof window !== "undefined") {
      const savedTurnStart = localStorage.getItem("dune-timer-turn-start")
      const savedPausedElapsed = localStorage.getItem("dune-timer-paused-elapsed")
      if (savedTurnStart) {
        setTurnStartTime(Number.parseInt(savedTurnStart))
      }
      if (savedPausedElapsed) {
        setPausedElapsedTime(Number.parseInt(savedPausedElapsed))
      }
    }
  }, [gameStarted, turnStartTime])

  const getCurrentTurnTime = (): number => {
    if (!turnStartTime) return 0
    if (!isRunning) return pausedElapsedTime
    return Math.floor((Date.now() - turnStartTime) / 1000) + pausedElapsedTime
  }

  const getActivePlayersCount = (): number => {
    return players.filter((p) => !p.isOutOfRound).length
  }

  const startPauseTimer = () => {
    if (!gameStarted) {
      setGameStarted(true)
      setTurnStartTime(Date.now())
      setPausedElapsedTime(0)
      setShowSettings(false)
      setShowColorSelectors(false)
      sounds.playGameStart()
      setPlayers((prev) =>
        prev.map((player) =>
          player.isActive
            ? {
                ...player,
                timeRemaining: player.timeRemaining + 60,
                currentTurnEfficiency: 0,
              }
            : player,
        ),
      )
      setIsRunning(true)
    } else if (isRunning) {
      // Pause the game
      if (turnStartTime) {
        const currentElapsed = Math.floor((Date.now() - turnStartTime) / 1000) + pausedElapsedTime
        setPausedElapsedTime(currentElapsed)
      }
      setIsRunning(false)
    } else {
      // Resume the game - give +60 seconds to the active player
      setPlayers((prev) =>
        prev.map((player) =>
          player.isActive
            ? {
                ...player,
                timeRemaining: player.timeRemaining + 60,
                currentTurnEfficiency: 0,
              }
            : player,
        ),
      )
      setTurnStartTime(Date.now())
      setIsRunning(true)
    }
  }

  const switchToPlayer = (playerId: number) => {
    if (!gameStarted) return

    if (!isRunning) {
      // When game is paused, just switch the active player without time changes
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.isActive) {
            return { ...player, isActive: false }
          } else if (player.id === playerId && !player.isOutOfRound) {
            return {
              ...player,
              isActive: true,
              currentTurnEfficiency: 0,
              isRevealing: false,
            }
          }
          return player
        }),
      )
      return
    }

    // When game is running, switch players with full turn logic
    const currentTime = Date.now()
    const turnDuration = turnStartTime ? Math.floor((currentTime - turnStartTime) / 1000) + pausedElapsedTime : 0
    const turnEfficiency = 60 - turnDuration

    sounds.playTurnChange()
    setLastOvertimeWarning(0)

    setPlayers((prev) =>
      prev.map((player) => {
        if (player.isActive) {
          return {
            ...player,
            isActive: false,
            totalEfficiency: player.totalEfficiency + turnEfficiency,
            turnsCompleted: player.turnsCompleted + 1,
          }
        } else if (player.id === playerId && !player.isOutOfRound) {
          return {
            ...player,
            isActive: true,
            timeRemaining: player.timeRemaining + 60, // Always give +60 seconds when switching
            currentTurnEfficiency: 0,
            isRevealing: false,
          }
        }
        return player
      }),
    )

    setTurnStartTime(currentTime)
    setPausedElapsedTime(0)
  }

  const nextTurn = () => {
    if (!gameStarted) return

    const currentTime = Date.now()
    const turnDuration = turnStartTime ? Math.floor((currentTime - turnStartTime) / 1000) + pausedElapsedTime : 0
    const turnEfficiency = 60 - turnDuration

    sounds.playTurnChange()
    setLastOvertimeWarning(0)

    setPlayers((prev) => {
      const updatedPlayers = prev.map((player) => {
        if (player.isActive) {
          const newPlayer = {
            ...player,
            isActive: false,
            totalEfficiency: player.totalEfficiency + turnEfficiency,
            turnsCompleted: player.turnsCompleted + 1,
          }

          if (player.isRevealing) {
            newPlayer.isOutOfRound = true
            newPlayer.isRevealing = false
          }

          return newPlayer
        }
        return player
      })

      const availablePlayers = updatedPlayers.filter((p) => !p.isOutOfRound)

      if (availablePlayers.length > 0) {
        const currentActivePlayer = prev.find((p) => p.isActive)
        if (currentActivePlayer) {
          const currentPlayerIndex = prev.findIndex((p) => p.id === currentActivePlayer.id)

          let nextPlayerIndex = (currentPlayerIndex + 1) % prev.length
          let nextPlayer = prev[nextPlayerIndex]

          while (nextPlayer.isOutOfRound && nextPlayerIndex !== currentPlayerIndex) {
            nextPlayerIndex = (nextPlayerIndex + 1) % prev.length
            nextPlayer = prev[nextPlayerIndex]
          }

          if (!nextPlayer.isOutOfRound) {
            return updatedPlayers.map((player) => {
              if (player.id === nextPlayer.id) {
                return {
                  ...player,
                  isActive: true,
                  timeRemaining: player.timeRemaining + 60,
                  currentTurnEfficiency: 0,
                  isRevealing: false,
                }
              }
              return player
            })
          }
        }
      }

      return updatedPlayers
    })

    setTurnStartTime(currentTime)
    setPausedElapsedTime(0)
    setIsRunning(true)
  }

  const previousTurn = () => {
    if (!gameStarted) return

    const availablePlayers = players.filter((p) => !p.isOutOfRound)
    if (availablePlayers.length === 0) return

    const currentActivePlayer = players.find((p) => p.isActive)
    if (!currentActivePlayer) return

    const currentPlayerIndex = players.findIndex((p) => p.id === currentActivePlayer.id)

    let prevPlayerIndex = currentPlayerIndex === 0 ? players.length - 1 : currentPlayerIndex - 1
    let prevPlayer = players[prevPlayerIndex]

    while (prevPlayer.isOutOfRound && prevPlayerIndex !== currentPlayerIndex) {
      prevPlayerIndex = prevPlayerIndex === 0 ? players.length - 1 : prevPlayerIndex - 1
      prevPlayer = players[prevPlayerIndex]
    }

    if (prevPlayer.isOutOfRound) return

    sounds.playTurnChange()
    setLastOvertimeWarning(0)

    setPlayers((prev) =>
      prev.map((player) => {
        if (player.isActive) {
          return { ...player, isActive: false }
        } else if (player.id === prevPlayer.id) {
          return {
            ...player,
            isActive: true,
            timeRemaining: player.timeRemaining + 60,
            currentTurnEfficiency: 0,
            isRevealing: false,
          }
        }
        return player
      }),
    )

    setTurnStartTime(Date.now())
    setPausedElapsedTime(0)
    setIsRunning(true)
  }

  const startRevealTurn = () => {
    if (!activePlayer) return

    sounds.playReveal()

    setPlayers((prev) =>
      prev.map((player) =>
        player.isActive
          ? {
              ...player,
              isRevealing: true,
            }
          : player,
      ),
    )
  }

  const endRound = () => {
    sounds.playRoundEnd()

    // Find the next player to start the new round
    const currentActivePlayer = players.find((p) => p.isActive)
    let nextStarterIndex = 0

    if (currentActivePlayer) {
      const currentIndex = players.findIndex((p) => p.id === currentActivePlayer.id)
      nextStarterIndex = (currentIndex + 1) % players.length
    }

    // Reset ALL players and start with the next player
    setPlayers((prev) =>
      prev.map((player, index) => ({
        ...player,
        isOutOfRound: false,
        isRevealing: false,
        isActive: index === nextStarterIndex, // Next player becomes active
        turnsCompleted: 0,
        currentTurnEfficiency: 0,
        timeRemaining: index === nextStarterIndex ? player.timeRemaining + 60 : player.timeRemaining,
      })),
    )

    setCurrentRound((prev) => prev + 1)
    setTurnStartTime(Date.now())
    setPausedElapsedTime(0)
    setIsRunning(true) // Automatically start the next round
    setLastOvertimeWarning(0)
    setManualNavigation(false) // Reset manual navigation on round end
  }

  const resetGame = () => {
    setPlayers((prev) =>
      prev.map((player, index) => ({
        ...player,
        timeRemaining: initialTime,
        totalEfficiency: 0,
        currentTurnEfficiency: 0,
        turnsCompleted: 0,
        isActive: index === 0,
        isRevealing: false,
        isOutOfRound: false,
      })),
    )
    setIsRunning(false)
    setGameStarted(false)
    setTurnStartTime(null)
    setPausedElapsedTime(0)
    setCurrentRound(1)
    setShowSettings(true)
    setShowColorSelectors(true)
    setLastOvertimeWarning(0)
    setCurrentPlayerIndex(0)
    setIsTransitioning(false)
    setSlideDirection(null)
    setManualNavigation(false)
    if (typeof window !== "undefined") {
      localStorage.removeItem("dune-timer-turn-start")
      localStorage.removeItem("dune-timer-paused-elapsed")
    }
  }

  const adjustPlayerTime = (playerId: number, adjustment: number) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, timeRemaining: Math.max(0, player.timeRemaining + adjustment) } : player,
      ),
    )
  }

  const updatePlayerName = (playerId: number, newName: string) => {
    setPlayers((prev) => prev.map((player) => (player.id === playerId ? { ...player, name: newName } : player)))
    setEditingPlayer(null)
    setEditName("")
  }

  const updatePlayerColor = (playerId: number, newColor: string) => {
    setPlayers((prev) => prev.map((player) => (player.id === playerId ? { ...player, color: newColor } : player)))
  }

  const handleDragStart = (playerId: number) => {
    setDraggedPlayer(playerId)
  }

  const handleDrop = (targetPlayerId: number) => {
    if (draggedPlayer === null || draggedPlayer === targetPlayerId) return

    setPlayers((prev) => {
      const newPlayers = [...prev]
      const draggedIndex = newPlayers.findIndex((p) => p.id === draggedPlayer)
      const targetIndex = newPlayers.findIndex((p) => p.id === targetPlayerId)

      const [draggedItem] = newPlayers.splice(draggedIndex, 1)
      newPlayers.splice(targetIndex, 0, draggedItem)

      return newPlayers
    })
    setDraggedPlayer(null)
  }

  const nextPlayerCard = (direction: "left" | "right" = "right") => {
    // Immediately set manual navigation flag to prevent auto-tracking conflicts
    setManualNavigation(true)

    // Clear any existing timeout
    if (manualNavigationTimeoutRef.current) {
      clearTimeout(manualNavigationTimeoutRef.current)
    }

    console.log("Manual next navigation triggered")

    setIsTransitioning(true)
    setSlideDirection(direction)

    setTimeout(() => {
      setCurrentPlayerIndex((prev) => {
        const newIndex = (prev + 1) % players.length
        console.log("Setting currentPlayerIndex to:", newIndex)
        return newIndex
      })

      setTimeout(() => {
        setIsTransitioning(false)
        setSlideDirection(null)
      }, 500)
    }, 50)

    // Reset manual navigation flag after a longer delay
    manualNavigationTimeoutRef.current = setTimeout(() => {
      console.log("Resetting manual navigation flag")
      setManualNavigation(false)
    }, 2000) // Increased to 2 seconds to ensure no conflicts
  }

  const previousPlayerCard = (direction: "left" | "right" = "left") => {
    // Immediately set manual navigation flag to prevent auto-tracking conflicts
    setManualNavigation(true)

    // Clear any existing timeout
    if (manualNavigationTimeoutRef.current) {
      clearTimeout(manualNavigationTimeoutRef.current)
    }

    console.log("Manual previous navigation triggered")

    setIsTransitioning(true)
    setSlideDirection(direction)

    setTimeout(() => {
      setCurrentPlayerIndex((prev) => {
        const newIndex = prev === 0 ? players.length - 1 : prev - 1
        console.log("Setting currentPlayerIndex to:", newIndex)
        return newIndex
      })

      setTimeout(() => {
        setIsTransitioning(false)
        setSlideDirection(null)
      }, 500)
    }, 50)

    // Reset manual navigation flag after a longer delay
    manualNavigationTimeoutRef.current = setTimeout(() => {
      console.log("Resetting manual navigation flag")
      setManualNavigation(false)
    }, 2000) // Increased to 2 seconds to ensure no conflicts
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (manualNavigationTimeoutRef.current) {
        clearTimeout(manualNavigationTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    players,
    isRunning,
    turnStartTime,
    gameStarted,
    currentRound,
    initialTime,
    showSettings,
    showAdjustButtons,
    showColorSelectors,
    soundEnabled,
    editingPlayer,
    editName,
    draggedPlayer,
    activePlayer,
    activePlayerIndex,
    currentPlayerIndex,
    isTransitioning,
    slideDirection,
    // Computed values
    getCurrentTurnTime,
    getActivePlayersCount,
    // Actions
    startPauseTimer,
    switchToPlayer,
    nextTurn,
    previousTurn,
    startRevealTurn,
    endRound,
    resetGame,
    adjustPlayerTime,
    updatePlayerName,
    updatePlayerColor,
    handleDragStart,
    handleDrop,
    nextPlayerCard,
    previousPlayerCard,
    // Setters
    setInitialTime,
    setShowSettings,
    setShowAdjustButtons,
    setShowColorSelectors,
    setSoundEnabled,
    setEditingPlayer,
    setEditName,
    setCurrentPlayerIndex,
    setManualNavigation, // Add this line
  }
}
