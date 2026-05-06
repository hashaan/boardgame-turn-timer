"use client"

import { useState, useEffect, useRef } from "react"
import type { Player, PlayerTurnStage, TimerPhase } from "@/types"
import { DEFAULT_INITIAL_TIME } from "@/constants"
import { useSoundEffects } from "./useSoundEffects"
import { track } from "@vercel/analytics/react"

const BASE_AGENT_TURNS = 2
const TURN_TIME_BONUS = 60
const MAX_UNDO_SNAPSHOTS = 25

const createInitialPlayer = (
    id: number,
    name: string,
    color: string,
    isActive = false,
): Player => ({
    id,
    name,
    timeRemaining: DEFAULT_INITIAL_TIME,
    totalEfficiency: 0,
    currentTurnEfficiency: 0,
    turnsCompleted: 0,
    isActive,
    color,
    isRevealing: false,
    isOutOfRound: false,
    agentTurnsTaken: 0,
    extraTurnsThisRound: 0,
    hasSwordmaster: false,
    turnStartBank: 0,
    turnBonusAppliedThisTurn: 0,
})

const initialPlayers: Player[] = [
    createInitialPlayer(1, "Player 1", "blue", true),
    createInitialPlayer(2, "Player 2", "green"),
    createInitialPlayer(3, "Player 3", "purple"),
    createInitialPlayer(4, "Player 4", "orange"),
]

type TimerSnapshot = {
    players: Player[]
    isRunning: boolean
    turnStartTime: number | null
    pausedElapsedTime: number
    gameStarted: boolean
    gameStartTime: number | null
    currentRound: number
    roundPhase: TimerPhase
    initialTime: number
    showSettings: boolean
    showColorSelectors: boolean
    lastOvertimeWarning: number
    currentPlayerIndex: number
    playerOrder: number[]
    currentOrderIndex: number
}

const getAgentTurnLimit = (player: Player): number => {
    return (
        BASE_AGENT_TURNS +
        (player.hasSwordmaster ? 1 : 0) +
        Math.max(0, player.extraTurnsThisRound ?? 0)
    )
}

const normalizePlayer = (player: Partial<Player>, index: number): Player => {
    const fallback =
        initialPlayers[index] ??
        createInitialPlayer(index + 1, `Player ${index + 1}`, "blue")
    return {
        ...fallback,
        ...player,
        id: typeof player.id === "number" ? player.id : fallback.id,
        name: player.name ?? fallback.name,
        timeRemaining:
            typeof player.timeRemaining === "number"
                ? player.timeRemaining
                : fallback.timeRemaining,
        totalEfficiency:
            typeof player.totalEfficiency === "number"
                ? player.totalEfficiency
                : 0,
        currentTurnEfficiency:
            typeof player.currentTurnEfficiency === "number"
                ? player.currentTurnEfficiency
                : 0,
        turnsCompleted:
            typeof player.turnsCompleted === "number"
                ? player.turnsCompleted
                : 0,
        isActive: Boolean(player.isActive),
        color: player.color ?? fallback.color,
        isRevealing: Boolean(player.isRevealing),
        isOutOfRound: Boolean(player.isOutOfRound),
        agentTurnsTaken: Math.max(0, Number(player.agentTurnsTaken ?? 0)),
        extraTurnsThisRound: Math.max(
            0,
            Number(player.extraTurnsThisRound ?? 0),
        ),
        hasSwordmaster: Boolean(player.hasSwordmaster),
        turnStartBank: Math.max(0, Number(player.turnStartBank ?? 0)),
        turnBonusAppliedThisTurn: Math.max(
            0,
            Number(player.turnBonusAppliedThisTurn ?? 0),
        ),
    }
}

const prepareActiveTurn = (player: Player): Player => {
    const agentTurnLimit = getAgentTurnLimit(player)
    const turnStartBank = Math.max(0, Math.floor(player.timeRemaining))
    return {
        ...player,
        isActive: true,
        isRevealing:
            player.isRevealing || player.agentTurnsTaken >= agentTurnLimit,
        currentTurnEfficiency: 0,
        turnStartBank,
        turnBonusAppliedThisTurn: TURN_TIME_BONUS,
        timeRemaining: turnStartBank + TURN_TIME_BONUS,
    }
}

const getLiveTurnTimeRemaining = (
    player: Player,
    elapsedSeconds: number,
): number => {
    const startBank = Math.max(0, Number(player.turnStartBank ?? 0))
    const turnBonus = Math.max(0, Number(player.turnBonusAppliedThisTurn ?? 0))
    const baseline = startBank > 0 ? startBank : Math.max(0, Number(player.timeRemaining ?? 0))

    return Math.max(0, baseline + turnBonus - elapsedSeconds)
}

export const useGameTimer = () => {
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => {
        setHydrated(true)
    }, [])

    const [players, setPlayers] = useState<Player[]>(initialPlayers)
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [turnStartTime, setTurnStartTime] = useState<number | null>(null)
    const [pausedElapsedTime, setPausedElapsedTime] = useState<number>(0)
    const [gameStarted, setGameStarted] = useState<boolean>(false)
    const [gameStartTime, setGameStartTime] = useState<number | null>(null)
    const [currentRound, setCurrentRound] = useState<number>(1)
    const [roundPhase, setRoundPhase] = useState<TimerPhase>("player-turns")
    const [initialTime, setInitialTime] = useState<number>(DEFAULT_INITIAL_TIME)
    const [showSettings, setShowSettings] = useState(false)
    const [showAdjustButtons, setShowAdjustButtons] = useState<boolean>(false)
    const [showColorSelectors, setShowColorSelectors] = useState(true)
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
    const [editingPlayer, setEditingPlayer] = useState<number | null>(null)
    const [editName, setEditName] = useState("")
    const [draggedPlayer, setDraggedPlayer] = useState<number | null>(null)
    const [lastOvertimeWarning, setLastOvertimeWarning] = useState<number>(0)
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0)
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
    const [slideDirection, setSlideDirection] = useState<
        "left" | "right" | null
    >(null)
    const [manualNavigation, setManualNavigation] = useState<boolean>(false)
    const [nextPlayerId, setNextPlayerId] = useState<number | null>(null)
    const [playerOrder, setPlayerOrder] = useState<number[]>([])
    const [currentOrderIndex, setCurrentOrderIndex] = useState<number>(0)
    const [undoStack, setUndoStack] = useState<TimerSnapshot[]>([])
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const manualNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const sounds = useSoundEffects(soundEnabled)

    const activePlayer = players.find((p) => p.isActive)
    const activePlayerIndex = players.findIndex((p) => p.isActive)

    const [syncSignal, setSyncSignal] = useState(0)
    const triggerSync = () => {
        queueMicrotask(() => {
            setSyncSignal((v) => v + 1)
        })
    }

    const captureSnapshot = (): TimerSnapshot => ({
        players,
        isRunning,
        turnStartTime,
        pausedElapsedTime,
        gameStarted,
        gameStartTime,
        currentRound,
        roundPhase,
        initialTime,
        showSettings,
        showColorSelectors,
        lastOvertimeWarning,
        currentPlayerIndex,
        playerOrder,
        currentOrderIndex,
    })

    const pushUndoSnapshot = () => {
        setUndoStack((prev) => [
            ...prev.slice(-(MAX_UNDO_SNAPSHOTS - 1)),
            captureSnapshot(),
        ])
    }

    const applySnapshot = (snapshot: TimerSnapshot) => {
        setPlayers(snapshot.players)
        setIsRunning(snapshot.isRunning)
        setTurnStartTime(snapshot.turnStartTime)
        setPausedElapsedTime(snapshot.pausedElapsedTime)
        setGameStarted(snapshot.gameStarted)
        setGameStartTime(snapshot.gameStartTime)
        setCurrentRound(snapshot.currentRound)
        setRoundPhase(snapshot.roundPhase)
        setInitialTime(snapshot.initialTime)
        setShowSettings(snapshot.showSettings)
        setShowColorSelectors(snapshot.showColorSelectors)
        setLastOvertimeWarning(snapshot.lastOvertimeWarning)
        setCurrentPlayerIndex(snapshot.currentPlayerIndex)
        setPlayerOrder(snapshot.playerOrder)
        setCurrentOrderIndex(snapshot.currentOrderIndex)
        setIsTransitioning(false)
        setSlideDirection(null)
        setManualNavigation(false)
        triggerSync()
    }

    const undoLastAction = () => {
        setUndoStack((prev) => {
            const snapshot = prev.at(-1)
            if (!snapshot) return prev
            queueMicrotask(() => applySnapshot(snapshot))
            return prev.slice(0, -1)
        })
    }

    useEffect(() => {
        track("page_visited", { page: "timer" })
    }, [])

    useEffect(() => {
        if (!hydrated) return
        const get = (key: string) => {
            if (typeof window === "undefined") return null
            return localStorage.getItem(key)
        }
        const storedPlayers = get("dune-timer-players")
        if (storedPlayers) {
            try {
                const parsed = JSON.parse(storedPlayers)
                if (Array.isArray(parsed)) {
                    setPlayers(parsed.map(normalizePlayer))
                }
            } catch {
                setPlayers(initialPlayers)
            }
        }
        const storedRunning = get("dune-timer-running")
        if (storedRunning) setIsRunning(JSON.parse(storedRunning))
        const storedStarted = get("dune-timer-started")
        if (storedStarted) setGameStarted(JSON.parse(storedStarted))
        const storedGameStart = get("dune-timer-game-start")
        if (storedGameStart) setGameStartTime(JSON.parse(storedGameStart))
        const storedRound = get("dune-timer-round")
        if (storedRound) setCurrentRound(JSON.parse(storedRound))
        const storedRoundPhase = get("dune-timer-round-phase")
        if (storedRoundPhase) {
            const parsedRoundPhase = JSON.parse(storedRoundPhase)
            if (parsedRoundPhase === "round-wrap-up") {
                setRoundPhase("round-wrap-up")
            } else {
                setRoundPhase("player-turns")
            }
        }
        const storedInitial = get("dune-timer-initial")
        if (storedInitial) setInitialTime(JSON.parse(storedInitial))
        const storedAdjust = get("dune-timer-adjust-buttons")
        if (storedAdjust) setShowAdjustButtons(JSON.parse(storedAdjust))
        const storedSound = get("dune-timer-sound")
        if (storedSound) setSoundEnabled(JSON.parse(storedSound))
    }, [hydrated])

    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-players", JSON.stringify(players))
    }, [players, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-running", JSON.stringify(isRunning))
    }, [isRunning, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-started", JSON.stringify(gameStarted))
    }, [gameStarted, hydrated])
    useEffect(() => {
        if (!hydrated) return
        if (gameStartTime)
            localStorage.setItem(
                "dune-timer-game-start",
                JSON.stringify(gameStartTime),
            )
    }, [gameStartTime, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-round", JSON.stringify(currentRound))
    }, [currentRound, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-round-phase", JSON.stringify(roundPhase))
    }, [roundPhase, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-initial", JSON.stringify(initialTime))
    }, [initialTime, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem(
            "dune-timer-adjust-buttons",
            JSON.stringify(showAdjustButtons),
        )
    }, [showAdjustButtons, hydrated])
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem("dune-timer-sound", JSON.stringify(soundEnabled))
    }, [soundEnabled, hydrated])

    useEffect(() => {
        const isPaused = gameStarted && !isRunning

        if (
            isPaused ||
            manualNavigation ||
            activePlayerIndex === currentPlayerIndex ||
            isTransitioning
        ) {
            return
        }

        if (
            activePlayerIndex !== -1 &&
            activePlayerIndex !== currentPlayerIndex &&
            isRunning &&
            gameStarted
        ) {
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
    }, [
        activePlayerIndex,
        gameStarted,
        isRunning,
        manualNavigation,
        isTransitioning,
        currentPlayerIndex,
    ])

    useEffect(() => {
        if (isRunning && activePlayer && turnStartTime) {
            intervalRef.current = setInterval(() => {
                setPlayers((prev) =>
                    prev.map((player) => {
                        if (player.isActive) {
                            const currentTurnTime =
                                Math.floor(
                                    (Date.now() - turnStartTime) / 1000,
                                ) + pausedElapsedTime
                            const currentEfficiency =
                                TURN_TIME_BONUS - currentTurnTime

                            if (
                                currentTurnTime > TURN_TIME_BONUS &&
                                Math.floor(currentTurnTime / 30) >
                                    lastOvertimeWarning
                            ) {
                                sounds.playOvertime()
                                setLastOvertimeWarning(
                                    Math.floor(currentTurnTime / 30),
                                )
                            }

                            return {
                                ...player,
                                timeRemaining: getLiveTurnTimeRemaining(
                                    player,
                                    currentTurnTime,
                                ),
                                currentTurnEfficiency: currentEfficiency,
                            }
                        }
                        return player
                    }),
                )
            }, 1000)
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [
        isRunning,
        activePlayer,
        turnStartTime,
        pausedElapsedTime,
        sounds,
        lastOvertimeWarning,
    ])

    useEffect(() => {
        if (gameStarted && turnStartTime && typeof window !== "undefined") {
            localStorage.setItem(
                "dune-timer-turn-start",
                turnStartTime.toString(),
            )
            localStorage.setItem(
                "dune-timer-paused-elapsed",
                pausedElapsedTime.toString(),
            )
        }
    }, [gameStarted, turnStartTime, pausedElapsedTime])

    useEffect(() => {
        if (roundPhase === "round-wrap-up") return
        if (gameStarted && !turnStartTime && typeof window !== "undefined") {
            const savedTurnStart = localStorage.getItem("dune-timer-turn-start")
            const savedPausedElapsed = localStorage.getItem(
                "dune-timer-paused-elapsed",
            )
            if (savedTurnStart)
                setTurnStartTime(Number.parseInt(savedTurnStart))
            if (savedPausedElapsed)
                setPausedElapsedTime(Number.parseInt(savedPausedElapsed))
        }
    }, [gameStarted, turnStartTime, roundPhase])

    const getCurrentTurnTime = (): number => {
        if (!turnStartTime) return 0
        if (!isRunning) return pausedElapsedTime
        return (
            Math.floor((Date.now() - turnStartTime) / 1000) + pausedElapsedTime
        )
    }

    const getActivePlayersCount = (): number => {
        return players.filter((p) => !p.isOutOfRound).length
    }

    const enterRoundWrapUp = () => {
        setRoundPhase("round-wrap-up")
        setTurnStartTime(null)
        setPausedElapsedTime(0)
        setIsRunning(false)
        setLastOvertimeWarning(0)
        sounds.playRoundEnd()
        track("player_turns_completed", {
            round_number: currentRound,
        })
        if (typeof window !== "undefined") {
            localStorage.removeItem("dune-timer-turn-start")
            localStorage.removeItem("dune-timer-paused-elapsed")
        }
    }

    const completeActiveTurn = (direction: 1 | -1 = 1) => {
        const currentTime = Date.now()
        const turnDuration = turnStartTime
            ? Math.floor((currentTime - turnStartTime) / 1000) +
              pausedElapsedTime
            : 0
        const turnEfficiency = TURN_TIME_BONUS - turnDuration
        const activeIndex = players.findIndex((p) => p.isActive)

        if (activeIndex === -1) return

        sounds.playTurnChange()
        setLastOvertimeWarning(0)
        track("turn_completed", {
            duration_seconds: turnDuration,
            is_overtime: turnDuration > TURN_TIME_BONUS,
        })

        const updatedPlayers = players.map((player, index) => {
            if (index !== activeIndex) return player

            const wasReveal =
                player.isRevealing ||
                player.agentTurnsTaken >= getAgentTurnLimit(player)

            return {
                ...player,
                timeRemaining: getLiveTurnTimeRemaining(player, turnDuration),
                isActive: false,
                isRevealing: false,
                isOutOfRound: wasReveal ? true : player.isOutOfRound,
                agentTurnsTaken: wasReveal
                    ? player.agentTurnsTaken
                    : Math.min(
                          getAgentTurnLimit(player),
                          player.agentTurnsTaken + 1,
                      ),
                totalEfficiency: player.totalEfficiency + turnEfficiency,
                turnsCompleted: player.turnsCompleted + 1,
            }
        })

        const availablePlayers = updatedPlayers.filter((p) => !p.isOutOfRound)

        if (availablePlayers.length === 0) {
            setPlayers(updatedPlayers)
            enterRoundWrapUp()
            triggerSync()
            return
        }

        let nextIndex =
            (activeIndex + direction + updatedPlayers.length) %
            updatedPlayers.length

        while (
            updatedPlayers[nextIndex].isOutOfRound &&
            nextIndex !== activeIndex
        ) {
            nextIndex =
                (nextIndex + direction + updatedPlayers.length) %
                updatedPlayers.length
        }

        const nextPlayers = updatedPlayers.map((player, index) =>
            index === nextIndex ? prepareActiveTurn(player) : player,
        )

        setPlayers(nextPlayers)
        setRoundPhase("player-turns")
        setTurnStartTime(currentTime)
        setPausedElapsedTime(0)
        setIsRunning(true)
        triggerSync()
    }

    const startPauseTimer = () => {
        if (!gameStarted) {
            pushUndoSnapshot()
            setPlayerOrder(players.map((p) => p.id))
            setCurrentOrderIndex(0)
            setGameStarted(true)
            setRoundPhase("player-turns")
            setGameStartTime(Date.now())
            setTurnStartTime(Date.now())
            setPausedElapsedTime(0)
            setShowSettings(false)
            setShowColorSelectors(false)
            sounds.playGameStart()

            track("game_started", {
                player_count: players.length,
                initial_time_minutes: initialTime / 60,
            })

            setPlayers((prev) =>
                prev.map((player, index) =>
                    player.isActive || index === 0
                        ? prepareActiveTurn({
                              ...player,
                              isActive: true,
                              isRevealing: false,
                              isOutOfRound: false,
                          })
                        : {
                              ...player,
                              isActive: false,
                              isRevealing: false,
                              isOutOfRound: false,
                          },
                ),
            )
            setIsRunning(true)
        } else if (roundPhase === "round-wrap-up") {
            return
        } else if (isRunning) {
            if (turnStartTime) {
                const currentElapsed =
                    Math.floor((Date.now() - turnStartTime) / 1000) +
                    pausedElapsedTime
                setPausedElapsedTime(currentElapsed)
            }
            setIsRunning(false)
        } else {
            setTurnStartTime(Date.now())
            setIsRunning(true)
        }

        triggerSync()
    }

    const switchToPlayer = (playerId: number) => {
        if (!gameStarted || roundPhase === "round-wrap-up") return
        const target = players.find((p) => p.id === playerId)
        if (!target || target.isOutOfRound || target.isActive) return

        pushUndoSnapshot()

        const elapsed = getCurrentTurnTime()

        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id === playerId) {
                    return {
                        ...player,
                        isActive: true,
                        isRevealing:
                            player.isRevealing ||
                            player.agentTurnsTaken >= getAgentTurnLimit(player),
                        currentTurnEfficiency: 0,
                        turnStartBank: player.timeRemaining,
                        turnBonusAppliedThisTurn: 0,
                    }
                }

                if (player.isActive) {
                    return {
                        ...player,
                        isActive: false,
                        timeRemaining: getLiveTurnTimeRemaining(player, elapsed),
                    }
                }

                return { ...player, isActive: false }
            }),
        )
        setTurnStartTime(Date.now())
        setPausedElapsedTime(0)
        setLastOvertimeWarning(0)
        triggerSync()
    }

    const reopenPlayerTurn = (playerId: number) => {
        if (!gameStarted || roundPhase !== "round-wrap-up") return
        const target = players.find((p) => p.id === playerId)
        if (!target || !target.isOutOfRound) return

        pushUndoSnapshot()

        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id === playerId) {
                    return {
                        ...player,
                        isActive: true,
                        isOutOfRound: false,
                        isRevealing: true,
                        agentTurnsTaken: getAgentTurnLimit(player),
                        currentTurnEfficiency: 0,
                        turnStartBank: player.timeRemaining,
                        turnBonusAppliedThisTurn: 0,
                    }
                }

                return { ...player, isActive: false }
            }),
        )
        setRoundPhase("player-turns")
        setTurnStartTime(null)
        setPausedElapsedTime(0)
        setIsRunning(false)
        setLastOvertimeWarning(0)
        triggerSync()
    }

    const nextTurn = () => {
        if (!gameStarted) return

        if (roundPhase === "round-wrap-up") {
            endRound()
            return
        }

        const availablePlayers = players.filter((p) => !p.isOutOfRound)
        if (availablePlayers.length === 0) {
            pushUndoSnapshot()
            enterRoundWrapUp()
            triggerSync()
            return
        }

        pushUndoSnapshot()
        completeActiveTurn(1)
    }

    const previousTurn = () => {
        undoLastAction()
    }

    const startRevealTurn = () => {
        if (!activePlayer) return
        pushUndoSnapshot()
        sounds.playReveal()
        setPlayers((prev) =>
            prev.map((player) =>
                player.isActive
                    ? {
                          ...player,
                          isRevealing: true,
                          agentTurnsTaken: Math.max(
                              player.agentTurnsTaken,
                              getAgentTurnLimit(player),
                          ),
                      }
                    : player,
            ),
        )
        triggerSync()
    }

    const markPlayerRevealed = (playerId: number) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId || player.isActive) return player
                const nextOutOfRound = !player.isOutOfRound
                return {
                    ...player,
                    isOutOfRound: nextOutOfRound,
                    isRevealing: !nextOutOfRound,
                    agentTurnsTaken: getAgentTurnLimit(player),
                }
            }),
        )
        triggerSync()
    }

    const setPlayerTurnStage = (playerId: number, stage: PlayerTurnStage) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId) return player
                const limit = getAgentTurnLimit(player)
                if (stage === "done") {
                    return {
                        ...player,
                        isOutOfRound: true,
                        isRevealing: false,
                        isActive: player.isActive ? false : player.isActive,
                        agentTurnsTaken: limit,
                    }
                }
                if (stage === "reveal") {
                    return {
                        ...player,
                        isOutOfRound: false,
                        isRevealing: true,
                        agentTurnsTaken: limit,
                    }
                }
                const nextAgentTurnsTaken = Math.max(
                    0,
                    Math.min(limit - 1, stage - 1),
                )
                return {
                    ...player,
                    isOutOfRound: false,
                    isRevealing: false,
                    agentTurnsTaken: nextAgentTurnsTaken,
                }
            }),
        )
        triggerSync()
    }

    const togglePlayerSwordmaster = (playerId: number) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId) return player
                const nextPlayer = {
                    ...player,
                    hasSwordmaster: !player.hasSwordmaster,
                }
                const limit = getAgentTurnLimit(nextPlayer)
                return {
                    ...nextPlayer,
                    agentTurnsTaken: Math.min(
                        nextPlayer.agentTurnsTaken,
                        limit,
                    ),
                    isRevealing:
                        nextPlayer.isRevealing &&
                        nextPlayer.agentTurnsTaken >= limit,
                }
            }),
        )
        triggerSync()
    }

    const addPlayerTurn = (playerId: number) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) =>
                player.id === playerId
                    ? {
                          ...player,
                          extraTurnsThisRound:
                              Math.max(0, player.extraTurnsThisRound) + 1,
                          isOutOfRound: false,
                          isRevealing: false,
                      }
                    : player,
            ),
        )
        triggerSync()
    }

    const removePlayerTurn = (playerId: number) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId || player.extraTurnsThisRound <= 0)
                    return player
                const nextExtraTurns = Math.max(
                    0,
                    player.extraTurnsThisRound - 1,
                )
                const nextPlayer = {
                    ...player,
                    extraTurnsThisRound: nextExtraTurns,
                }
                const nextLimit = getAgentTurnLimit(nextPlayer)
                const nextTurnsTaken = Math.min(
                    player.agentTurnsTaken,
                    nextLimit,
                )
                return {
                    ...nextPlayer,
                    agentTurnsTaken: nextTurnsTaken,
                    isRevealing:
                        player.isRevealing || nextTurnsTaken >= nextLimit,
                }
            }),
        )
        triggerSync()
    }

    const endRound = () => {
        pushUndoSnapshot()
        sounds.playRoundEnd()
        track("round_completed", {
            round_number: currentRound,
            active_players: getActivePlayersCount(),
        })

        const order =
            playerOrder.length > 0 ? playerOrder : players.map((p) => p.id)
        const nextIndex =
            order.length > 0 ? (currentOrderIndex + 1) % order.length : 0
        const roundStarterId = order[nextIndex] ?? players[0]?.id

        setCurrentOrderIndex(nextIndex)
        setPlayerOrder(order)
        setRoundPhase("player-turns")
        setPlayers((prev) =>
            prev.map((player) => ({
                ...player,
                isOutOfRound: false,
                isRevealing: false,
                isActive: player.id === roundStarterId,
                agentTurnsTaken: 0,
                extraTurnsThisRound: 0,
                turnsCompleted: 0,
                currentTurnEfficiency: 0,
                turnStartBank:
                    player.id === roundStarterId ? player.timeRemaining : 0,
                turnBonusAppliedThisTurn:
                    player.id === roundStarterId ? TURN_TIME_BONUS : 0,
                timeRemaining:
                    player.id === roundStarterId
                        ? player.timeRemaining + TURN_TIME_BONUS
                        : player.timeRemaining,
            })),
        )

        setCurrentRound((prev) => prev + 1)
        setTurnStartTime(Date.now())
        setPausedElapsedTime(0)
        setIsRunning(true)
        setLastOvertimeWarning(0)
        setManualNavigation(false)
        triggerSync()
    }

    const resetGame = () => {
        pushUndoSnapshot()
        if (gameStarted && gameStartTime) {
            const gameDuration = (Date.now() - gameStartTime) / 1000
            track("game_completed", {
                duration_minutes: Math.round(gameDuration / 60),
                player_count: players.length,
                total_rounds: currentRound,
            })
        } else {
            track("game_reset", { reason: "manual" })
        }

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
                agentTurnsTaken: 0,
                extraTurnsThisRound: 0,
                hasSwordmaster: false,
                turnStartBank: 0,
                turnBonusAppliedThisTurn: 0,
            })),
        )
        setIsRunning(false)
        setGameStarted(false)
        setRoundPhase("player-turns")
        setGameStartTime(null)
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
        setNextPlayerId(null)
        setPlayerOrder([])
        setCurrentOrderIndex(0)
        setUndoStack([])
        if (typeof window !== "undefined") {
            localStorage.removeItem("dune-timer-turn-start")
            localStorage.removeItem("dune-timer-paused-elapsed")
            localStorage.removeItem("dune-timer-game-start")
            localStorage.removeItem("dune-timer-round-phase")
        }
        triggerSync()
    }

    const adjustPlayerTime = (playerId: number, adjustment: number) => {
        pushUndoSnapshot()
        setPlayers((prev) =>
            prev.map((player) =>
                player.id === playerId
                    ? {
                          ...player,
                          timeRemaining: Math.max(
                              0,
                              player.timeRemaining + adjustment,
                          ),
                      }
                    : player,
            ),
        )
        triggerSync()
    }

    const updatePlayerName = (playerId: number, newName: string) => {
        setPlayers((prev) =>
            prev.map((player) =>
                player.id === playerId ? { ...player, name: newName } : player,
            ),
        )
        setEditingPlayer(null)
        setEditName("")
        triggerSync()
    }

    const updatePlayerColor = (playerId: number, newColor: string) => {
        setPlayers((prev) =>
            prev.map((player) =>
                player.id === playerId
                    ? { ...player, color: newColor }
                    : player,
            ),
        )
        triggerSync()
    }

    const handleDragStart = (playerId: number) => {
        setDraggedPlayer(playerId)
    }

    const handleDrop = (targetPlayerId: number) => {
        if (draggedPlayer === null || draggedPlayer === targetPlayerId) return
        pushUndoSnapshot()

        setPlayers((prev) => {
            const newPlayers = [...prev]
            const draggedIndex = newPlayers.findIndex(
                (p) => p.id === draggedPlayer,
            )
            const targetIndex = newPlayers.findIndex(
                (p) => p.id === targetPlayerId,
            )
            const [draggedItem] = newPlayers.splice(draggedIndex, 1)
            newPlayers.splice(targetIndex, 0, draggedItem)
            return newPlayers
        })
        setDraggedPlayer(null)
        triggerSync()
    }

    const nextPlayerCard = (direction: "left" | "right" = "right") => {
        setManualNavigation(true)
        if (manualNavigationTimeoutRef.current)
            clearTimeout(manualNavigationTimeoutRef.current)
        track("mobile_navigation", {
            direction,
            context: gameStarted && !isRunning ? "paused" : "active",
        })
        setIsTransitioning(true)
        setSlideDirection(direction)
        setCurrentPlayerIndex((prev) =>
            prev === players.length - 1 ? 0 : prev + 1,
        )
        setTimeout(() => {
            setIsTransitioning(false)
            setSlideDirection(null)
        }, 500)
        manualNavigationTimeoutRef.current = setTimeout(
            () => setManualNavigation(false),
            2000,
        )
    }

    const previousPlayerCard = (direction: "left" | "right" = "left") => {
        setManualNavigation(true)
        if (manualNavigationTimeoutRef.current)
            clearTimeout(manualNavigationTimeoutRef.current)
        track("mobile_navigation", {
            direction,
            context: gameStarted && !isRunning ? "paused" : "active",
        })
        setIsTransitioning(true)
        setSlideDirection(direction)
        setCurrentPlayerIndex((prev) =>
            prev === 0 ? players.length - 1 : prev - 1,
        )
        setTimeout(() => {
            setIsTransitioning(false)
            setSlideDirection(null)
        }, 500)
        manualNavigationTimeoutRef.current = setTimeout(
            () => setManualNavigation(false),
            2000,
        )
    }

    const setInitialTimeWithAnalytics = (time: number) => {
        track("settings_changed", {
            setting: "initial_time",
            value: String(time / 60),
        })
        setInitialTime(time)
    }

    const setShowAdjustButtonsWithAnalytics = (show: boolean) => {
        track("settings_changed", {
            setting: "show_adjust_buttons",
            value: String(show),
        })
        setShowAdjustButtons(show)
    }

    const setSoundEnabledWithAnalytics = (enabled: boolean) => {
        track("settings_changed", {
            setting: "sound_enabled",
            value: String(enabled),
        })
        setSoundEnabled(enabled)
    }

    useEffect(() => {
        return () => {
            if (manualNavigationTimeoutRef.current)
                clearTimeout(manualNavigationTimeoutRef.current)
        }
    }, [])

    return {
        hydrated,
        players,
        isRunning,
        turnStartTime,
        gameStarted,
        currentRound,
        roundPhase,
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
        nextPlayerId,
        canUndo: undoStack.length > 0,
        getCurrentTurnTime,
        getActivePlayersCount,
        getAgentTurnLimit,
        startPauseTimer,
        switchToPlayer,
        reopenPlayerTurn,
        nextTurn,
        previousTurn,
        startRevealTurn,
        markPlayerRevealed,
        setPlayerTurnStage,
        togglePlayerSwordmaster,
        addPlayerTurn,
        removePlayerTurn,
        undoLastAction,
        endRound,
        resetGame,
        adjustPlayerTime,
        updatePlayerName,
        updatePlayerColor,
        handleDragStart,
        handleDrop,
        nextPlayerCard,
        previousPlayerCard,
        setInitialTime: setInitialTimeWithAnalytics,
        setShowSettings,
        setShowAdjustButtons: setShowAdjustButtonsWithAnalytics,
        setShowColorSelectors,
        setSoundEnabled: setSoundEnabledWithAnalytics,
        setEditingPlayer,
        setEditName,
        setCurrentPlayerIndex,
        setManualNavigation,
        syncSignal,
    }
}
