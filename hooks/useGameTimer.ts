"use client"

import { useState, useEffect, useRef } from "react"
import type { Player, PlayerTurnStage, TimerPhase } from "@/types"
import { DEFAULT_INITIAL_TIME } from "@/constants"
import { useSoundEffects } from "./useSoundEffects"
import { track } from "@vercel/analytics/react"

const BASE_AGENT_TURNS = 2
const TURN_TIME_BONUS = 60
const TIMER_TICK_SETTLE_MS = 25
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
    createInitialPlayer(3, "Player 3", "yellow"),
    createInitialPlayer(4, "Player 4", "red"),
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
    turnPlayerId: number | null
    playerOrder: number[]
    currentOrderIndex: number
}

const getAgentTurnLimit = (player: Player): number => {
    return (
        Math.max(
            0,
            BASE_AGENT_TURNS +
                (player.hasSwordmaster ? 1 : 0) +
                Math.floor(Number(player.extraTurnsThisRound ?? 0)),
        )
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
        color: ["blue", "green", "yellow", "red"].includes(player.color ?? "")
            ? player.color ?? fallback.color
            : player.color === "purple"
              ? "yellow"
              : "red",
        isRevealing: Boolean(player.isRevealing),
        isOutOfRound: Boolean(player.isOutOfRound),
        agentTurnsTaken: Math.max(0, Number(player.agentTurnsTaken ?? 0)),
        extraTurnsThisRound: Math.floor(Number(player.extraTurnsThisRound ?? 0)),
        hasSwordmaster: Boolean(player.hasSwordmaster),
        turnStartBank: Math.max(0, Number(player.turnStartBank ?? 0)),
        turnBonusAppliedThisTurn: Math.max(
            0,
            Number(player.turnBonusAppliedThisTurn ?? 0),
        ),
    }
}

const getStartedTurnLevel = (player: Player): number => {
    const agentTurnLimit = getAgentTurnLimit(player)
    const startedAgentTurns = Math.min(player.agentTurnsTaken, agentTurnLimit)
    return startedAgentTurns + (player.isRevealing || player.isOutOfRound ? 1 : 0)
}

const getMaxTurnLevel = (player: Player): number => {
    return getAgentTurnLimit(player) + 1
}

const getRevealCompletionLevel = (player: Player): number => {
    return Math.min(getStartedTurnLevel(player) + 1, getMaxTurnLevel(player))
}

const getRoundOrderIndices = (
    players: Player[],
    playerOrder: number[],
    currentOrderIndex: number,
): number[] => {
    const fallbackOrder = players.map((player) => player.id)
    const orderIds = playerOrder.length > 0 ? playerOrder : fallbackOrder
    const safeStart =
        orderIds.length > 0
            ? ((currentOrderIndex % orderIds.length) + orderIds.length) %
              orderIds.length
            : 0
    const rotatedOrderIds = [
        ...orderIds.slice(safeStart),
        ...orderIds.slice(0, safeStart),
    ]

    const indices = rotatedOrderIds
        .map((id) => players.findIndex((player) => player.id === id))
        .filter((index) => index >= 0)

    return indices.length > 0 ? indices : players.map((_, index) => index)
}

const getPreviousIndexInOrder = (
    targetIndex: number,
    orderIndices: number[],
): number => {
    if (orderIndices.length <= 1) return targetIndex
    const targetOrderIndex = orderIndices.indexOf(targetIndex)
    if (targetOrderIndex === -1) return targetIndex
    return orderIndices[
        (targetOrderIndex - 1 + orderIndices.length) % orderIndices.length
    ]
}

const isForwardInOrder = (
    fromIndex: number,
    targetIndex: number,
    orderIndices: number[],
): boolean => {
    if (fromIndex === targetIndex || orderIndices.length <= 1) return false

    const fromOrderIndex = orderIndices.indexOf(fromIndex)
    const targetOrderIndex = orderIndices.indexOf(targetIndex)
    if (fromOrderIndex === -1 || targetOrderIndex === -1) return false

    const clockwiseDistance =
        (targetOrderIndex - fromOrderIndex + orderIndices.length) %
        orderIndices.length
    const counterClockwiseDistance =
        (fromOrderIndex - targetOrderIndex + orderIndices.length) %
        orderIndices.length

    return clockwiseDistance > 0 && clockwiseDistance <= counterClockwiseDistance
}

const canStartNextSlot = (
    players: Player[],
    targetIndex: number,
    orderIndices: number[],
    direction: 1 | -1,
): boolean => {
    if (direction !== 1) return false

    const targetPlayer = players[targetIndex]
    if (!targetPlayer || targetPlayer.isOutOfRound) return false

    const targetLevel = getStartedTurnLevel(targetPlayer)
    const nextLevel = targetLevel + 1
    if (nextLevel > getMaxTurnLevel(targetPlayer)) return false

    const previousIndex = getPreviousIndexInOrder(targetIndex, orderIndices)
    const previousPlayer = players[previousIndex]

    if (!previousPlayer || previousIndex === targetIndex) return true

    // Main invariant: a player can only catch up to the player before them
    // in the round order. They cannot overtake that player. If the previous
    // player has no slot at this level, it does not block later extra slots.
    if (getMaxTurnLevel(previousPlayer) < nextLevel) return true
    if (getStartedTurnLevel(previousPlayer) >= nextLevel) return true

    // Round-starter exception: the first player in the current round order can
    // begin the next lap once everyone has started the previous lap or has no
    // slot at that level. This covers the first turn of a round and later laps.
    const roundStarterIndex = orderIndices[0]
    if (targetIndex !== roundStarterIndex) return false

    return orderIndices.every((index) => {
        const player = players[index]
        if (!player) return true
        const requiredPriorLevel = Math.min(nextLevel - 1, getMaxTurnLevel(player))
        return getStartedTurnLevel(player) >= requiredPriorLevel
    })
}

const startNextSlotWithoutActivating = (player: Player): Player => {
    const agentTurnLimit = getAgentTurnLimit(player)
    const agentTurnsTaken = Math.min(player.agentTurnsTaken, agentTurnLimit)

    let nextPlayer = player

    if (agentTurnsTaken < agentTurnLimit) {
        nextPlayer = {
            ...player,
            agentTurnsTaken: agentTurnsTaken + 1,
            isRevealing: false,
            isOutOfRound: false,
        }
    } else if (!player.isRevealing && !player.isOutOfRound) {
        nextPlayer = {
            ...player,
            agentTurnsTaken: agentTurnLimit,
            isRevealing: true,
            isOutOfRound: false,
        }
    }

    const nextStartedLevel = getStartedTurnLevel(nextPlayer)

    const turnStartBank = Math.max(0, Math.floor(player.timeRemaining))

    return {
        ...nextPlayer,
        timeRemaining: turnStartBank + TURN_TIME_BONUS,
        turnsCompleted: Math.max(player.turnsCompleted, nextStartedLevel),
        turnStartBank,
        turnBonusAppliedThisTurn: TURN_TIME_BONUS,
        currentTurnEfficiency: TURN_TIME_BONUS,
    }
}

const startRevealWithoutActivating = (player: Player): Player => {
    const agentTurnLimit = getAgentTurnLimit(player)
    const agentTurnsTaken = Math.min(player.agentTurnsTaken, agentTurnLimit)
    const nextPlayer = {
        ...player,
        agentTurnsTaken,
        isRevealing: true,
        isOutOfRound: false,
    }
    const nextStartedLevel = getStartedTurnLevel(nextPlayer)
    const turnStartBank = Math.max(0, Math.floor(player.timeRemaining))

    return {
        ...nextPlayer,
        timeRemaining: turnStartBank + TURN_TIME_BONUS,
        turnsCompleted: Math.max(player.turnsCompleted, nextStartedLevel),
        turnStartBank,
        turnBonusAppliedThisTurn: TURN_TIME_BONUS,
        currentTurnEfficiency: TURN_TIME_BONUS,
    }
}

const hasAnyOpenTurnSlot = (players: Player[]): boolean =>
    players.some((player) => getStartedTurnLevel(player) < getMaxTurnLevel(player))

const allPlayersFinishedTurns = (players: Player[]): boolean =>
    players.length > 0 && players.every((player) => player.isOutOfRound)

const canManuallyFillTargetLevel = (
    players: Player[],
    targetIndex: number,
    requestedLevel: number,
    orderIndices: number[],
): boolean => {
    const targetPlayer = players[targetIndex]
    if (!targetPlayer) return false

    const safeRequestedLevel = Math.min(
        Math.max(0, requestedLevel),
        getMaxTurnLevel(targetPlayer),
    )

    if (getStartedTurnLevel(targetPlayer) >= safeRequestedLevel) return true

    let nextPlayers = players
    let guard = 0

    while (
        guard < 16 &&
        getStartedTurnLevel(nextPlayers[targetIndex]) < safeRequestedLevel
    ) {
        if (!canStartNextSlot(nextPlayers, targetIndex, orderIndices, 1)) {
            return false
        }

        nextPlayers = nextPlayers.map((player, index) =>
            index === targetIndex
                ? startNextSlotWithoutActivating(player)
                : player,
        )
        guard += 1
    }

    return getStartedTurnLevel(nextPlayers[targetIndex]) >= safeRequestedLevel
}

const prepareActiveTurn = (
    player: Player,
    options: { applyTurnCredit?: boolean } = {},
): Player => {
    const applyTurnCredit = options.applyTurnCredit ?? true
    const agentTurnLimit = getAgentTurnLimit(player)
    const existingTurnBonus = Math.max(
        0,
        Number(player.turnBonusAppliedThisTurn ?? 0),
    )
    const turnBonus = applyTurnCredit ? TURN_TIME_BONUS : existingTurnBonus
    const turnStartBank = applyTurnCredit
        ? Math.max(0, Math.floor(player.timeRemaining))
        : Math.max(0, Math.floor(player.timeRemaining) - turnBonus)

    let agentTurnsTaken = Math.min(player.agentTurnsTaken, agentTurnLimit)
    let isRevealing = player.isRevealing
    let isOutOfRound = player.isOutOfRound

    if (applyTurnCredit && !isOutOfRound) {
        if (isRevealing) {
            agentTurnsTaken = Math.min(agentTurnsTaken, agentTurnLimit)
        } else if (agentTurnsTaken < agentTurnLimit) {
            agentTurnsTaken += 1
            isRevealing = false
        } else {
            isRevealing = true
        }
    }

    const nextStartedLevel = getStartedTurnLevel({
        ...player,
        isRevealing,
        isOutOfRound,
        agentTurnsTaken,
    } as Player)
    return {
        ...player,
        isActive: true,
        isOutOfRound,
        isRevealing,
        agentTurnsTaken,
        currentTurnEfficiency: turnBonus,
        turnsCompleted: applyTurnCredit
            ? Math.max(player.turnsCompleted, nextStartedLevel)
            : player.turnsCompleted,
        turnStartBank,
        turnBonusAppliedThisTurn: turnBonus,
        timeRemaining: turnStartBank + turnBonus,
    }
}

const getLiveTurnTimeRemaining = (
    player: Player,
    elapsedSeconds: number,
): number => {
    const startBank = Math.max(0, Number(player.turnStartBank ?? 0))
    const turnBonus = Math.max(0, Number(player.turnBonusAppliedThisTurn ?? 0))

    return Math.max(0, startBank + turnBonus - elapsedSeconds)
}

const freezeActiveTurn = (
    player: Player,
    elapsedSeconds: number,
): Player => {
    const currentBonus = Math.max(
        0,
        Number(player.turnBonusAppliedThisTurn ?? 0),
    )
    const bonusRemaining = Math.max(0, currentBonus - elapsedSeconds)
    const timeRemaining = getLiveTurnTimeRemaining(player, elapsedSeconds)

    return {
        ...player,
        timeRemaining,
        turnBonusAppliedThisTurn: bonusRemaining,
        turnStartBank: Math.max(0, timeRemaining - bonusRemaining),
        currentTurnEfficiency: bonusRemaining,
    }
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
    const [turnPlayerId, setTurnPlayerId] = useState<number | null>(null)
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
    const [slideDirection, setSlideDirection] = useState<
        "left" | "right" | null
    >(null)
    const [manualNavigation, setManualNavigation] = useState<boolean>(false)
    const [nextPlayerId, setNextPlayerId] = useState<number | null>(null)
    const [playerOrder, setPlayerOrder] = useState<number[]>([])
    const [currentOrderIndex, setCurrentOrderIndex] = useState<number>(0)
    const [timerTick, setTimerTick] = useState(0)
    const [undoStack, setUndoStack] = useState<TimerSnapshot[]>([])
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const manualNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastOvertimeWarningRef = useRef(0)
    const navigationActionRef = useRef(false)
    const autoResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const autoResumeIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const activePlayerIdRef = useRef<number | null>(null)
    const isRunningRef = useRef(false)
    const gameStartedRef = useRef(false)
    const roundPhaseRef = useRef<TimerPhase>("player-turns")
    const [autoResumeSeconds, setAutoResumeSeconds] = useState<number | null>(null)

    const sounds = useSoundEffects(soundEnabled)
    const soundsRef = useRef(sounds)

    const releaseManualNavigation = () => {
        if (manualNavigationTimeoutRef.current) {
            clearTimeout(manualNavigationTimeoutRef.current)
            manualNavigationTimeoutRef.current = null
        }
        setManualNavigation(false)
    }

    const beginNavigationAction = () => {
        if (navigationActionRef.current) return false
        navigationActionRef.current = true
        setTimeout(() => {
            navigationActionRef.current = false
        }, 160)
        return true
    }

    useEffect(() => {
        soundsRef.current = sounds
    }, [sounds])

    const activePlayer = players.find((p) => p.isActive)
    const activePlayerIndex = players.findIndex((p) => p.isActive)
    const resolvedTurnPlayerId =
        turnPlayerId ?? activePlayer?.id ?? players[currentPlayerIndex]?.id ?? null
    const turnPlayer =
        players.find((player) => player.id === resolvedTurnPlayerId) ??
        activePlayer
    const turnPlayerIndex = players.findIndex(
        (player) => player.id === turnPlayer?.id,
    )
    const isCorrectionMode = false

    useEffect(() => {
        activePlayerIdRef.current = activePlayer?.id ?? null
        isRunningRef.current = isRunning
        gameStartedRef.current = gameStarted
        roundPhaseRef.current = roundPhase
    }, [activePlayer?.id, isRunning, gameStarted, roundPhase])

    useEffect(() => {
        lastOvertimeWarningRef.current = lastOvertimeWarning
    }, [lastOvertimeWarning])

    const [syncSignal, setSyncSignal] = useState(0)
    const triggerSync = () => {
        queueMicrotask(() => {
            setSyncSignal((v) => v + 1)
        })
    }

    const clearAutoResume = () => {
        if (autoResumeTimeoutRef.current) {
            clearTimeout(autoResumeTimeoutRef.current)
            autoResumeTimeoutRef.current = null
        }
        if (autoResumeIntervalRef.current) {
            clearInterval(autoResumeIntervalRef.current)
            autoResumeIntervalRef.current = null
        }
        setAutoResumeSeconds(null)
    }

    const scheduleAutoResume = (playerId: number, seconds = 3) => {
        clearAutoResume()
        setAutoResumeSeconds(seconds)

        let remaining = seconds
        autoResumeIntervalRef.current = setInterval(() => {
            remaining -= 1
            setAutoResumeSeconds(remaining > 0 ? remaining : null)
        }, 1000)

        autoResumeTimeoutRef.current = setTimeout(() => {
            if (
                activePlayerIdRef.current !== playerId ||
                isRunningRef.current ||
                !gameStartedRef.current ||
                roundPhaseRef.current !== "player-turns"
            ) {
                clearAutoResume()
                return
            }

            clearAutoResume()
            releaseManualNavigation()
            setPausedElapsedTime(0)
            setTurnStartTime(Date.now())
            setIsRunning(true)
            triggerSync()
        }, seconds * 1000)
    }

    const hasStartedTimingSlot = (player: Player | undefined): boolean => {
        if (!player) return false
        return (
            getStartedTurnLevel(player) > 0 ||
            Math.max(0, Number(player.turnBonusAppliedThisTurn ?? 0)) > 0 ||
            player.isRevealing ||
            player.isOutOfRound
        )
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
        turnPlayerId: resolvedTurnPlayerId,
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
        clearAutoResume()
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
        setTurnPlayerId(snapshot.turnPlayerId ?? null)
        setPlayerOrder(snapshot.playerOrder)
        setCurrentOrderIndex(snapshot.currentOrderIndex)
        setIsTransitioning(false)
        setSlideDirection(null)
        releaseManualNavigation()
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
        const storedTurnPlayerId = get("dune-timer-turn-player-id")
        if (storedTurnPlayerId) setTurnPlayerId(JSON.parse(storedTurnPlayerId))
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
        if (turnPlayerId === null) {
            localStorage.removeItem("dune-timer-turn-player-id")
            return
        }
        localStorage.setItem(
            "dune-timer-turn-player-id",
            JSON.stringify(turnPlayerId),
        )
    }, [turnPlayerId, hydrated])
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
        if (intervalRef.current) {
            clearTimeout(intervalRef.current)
            intervalRef.current = null
        }

        if (!isRunning || !activePlayer || !turnStartTime) return

        const updateActiveTurnDisplay = () => {
            const now = Date.now()
            setTimerTick(now)
            const currentTurnTime =
                Math.floor((now - turnStartTime) / 1000) +
                pausedElapsedTime
            const currentTurnBonus = Math.max(
                0,
                Number(activePlayer.turnBonusAppliedThisTurn ?? 0),
            )
            const currentEfficiency = currentTurnBonus - currentTurnTime

            if (
                currentTurnTime > currentTurnBonus &&
                Math.floor((currentTurnTime - currentTurnBonus) / 30) >
                    lastOvertimeWarningRef.current
            ) {
                const warningBucket = Math.floor(
                    (currentTurnTime - currentTurnBonus) / 30,
                )
                lastOvertimeWarningRef.current = warningBucket
                soundsRef.current.playOvertime()
                setLastOvertimeWarning(warningBucket)
            }

            setPlayers((prev) => {
                let changed = false
                const nextPlayers = prev.map((player) => {
                    if (!player.isActive) return player

                    const timeRemaining = getLiveTurnTimeRemaining(
                        player,
                        currentTurnTime,
                    )

                    if (
                        player.timeRemaining === timeRemaining &&
                        player.currentTurnEfficiency === currentEfficiency
                    ) {
                        return player
                    }

                    changed = true
                    return {
                        ...player,
                        timeRemaining,
                        currentTurnEfficiency: currentEfficiency,
                    }
                })

                return changed ? nextPlayers : prev
            })
        }

        const scheduleNextTick = () => {
            updateActiveTurnDisplay()

            const elapsedMs = Math.max(0, Date.now() - turnStartTime)
            const msUntilNextSecond = 1000 - (elapsedMs % 1000)
            const delay = Math.max(50, msUntilNextSecond + TIMER_TICK_SETTLE_MS)
            intervalRef.current = setTimeout(scheduleNextTick, delay)
        }

        scheduleNextTick()

        return () => {
            if (intervalRef.current) {
                clearTimeout(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [
        isRunning,
        activePlayer?.id,
        turnStartTime,
        pausedElapsedTime,
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
        if (roundPhase === "round-wrap-up" || !isRunning) return
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
    }, [gameStarted, isRunning, turnStartTime, roundPhase])

    const getCurrentTurnTime = (): number => {
        void timerTick
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
        clearAutoResume()
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

    const completeActiveTurn = (
        direction: 1 | -1 = 1,
        options: { autoStartDueSlot?: boolean; autoResumeReview?: boolean } = {},
    ) => {
        if (!beginNavigationAction()) return
        clearAutoResume()

        const autoStartDueSlot = options.autoStartDueSlot ?? true
        const autoResumeReview = options.autoResumeReview ?? true
        const currentTime = Date.now()
        const shouldSettleRunning = isRunning && turnStartTime !== null
        const turnDuration = shouldSettleRunning
            ? Math.floor((currentTime - turnStartTime) / 1000) +
              pausedElapsedTime
            : 0
        const activeIndex = players.findIndex((p) => p.isActive)
        const startIndex = activeIndex !== -1 ? activeIndex : currentPlayerIndex
        const includeOutOfRound = direction === -1 || !hasAnyOpenTurnSlot(players)

        if (players.length === 0) return

        if (activeIndex === -1 && direction === 1 && roundPhase === "round-wrap-up") {
            endRound()
            return
        }

        let updatedPlayers = players.map((player, index) => {
            if (index !== activeIndex) return { ...player, isActive: false }

            const settledPlayer = shouldSettleRunning
                ? freezeActiveTurn(player, turnDuration)
                : player

            return {
                ...settledPlayer,
                isActive: false,
                // Moving forward out of Reveal marks that player done for the
                // player-turn phase. Review navigation never un-fills a slot.
                isRevealing:
                    direction === 1 && player.isRevealing
                        ? false
                        : player.isRevealing,
                isOutOfRound:
                    direction === 1 && player.isRevealing
                        ? true
                        : player.isOutOfRound,
            }
        })

        if (direction === 1 && allPlayersFinishedTurns(updatedPlayers)) {
            setPlayers(updatedPlayers.map((player) => ({ ...player, isActive: false })))
            setTurnPlayerId(null)
            enterRoundWrapUp()
            releaseManualNavigation()
            triggerSync()
            return
        }

        const nextIndex = getNextSelectableIndex(startIndex, direction, {
            includeOutOfRound,
        })

        if (nextIndex === -1) {
            setPlayers(updatedPlayers)
            setTurnPlayerId(null)
            enterRoundWrapUp()
            releaseManualNavigation()
            triggerSync()
            return
        }

        const orderIndices = getRoundOrderIndices(
            updatedPlayers,
            playerOrder,
            currentOrderIndex,
        )
        const shouldCreditTurn = canStartNextSlot(
            updatedPlayers,
            nextIndex,
            orderIndices,
            direction,
        )

        const nextPlayers = updatedPlayers.map((player, index) =>
            index === nextIndex
                ? prepareActiveTurn(player, { applyTurnCredit: shouldCreditTurn })
                : player,
        )
        const selectedPlayer = nextPlayers[nextIndex]
        const shouldAutoStart = shouldCreditTurn && autoStartDueSlot

        sounds.playTurnChange()
        setLastOvertimeWarning(0)
        track("turn_cursor_advanced", {
            duration_seconds: turnDuration,
            direction: direction === 1 ? "next" : "previous",
            started_new_slot: shouldCreditTurn,
            is_overtime: shouldSettleRunning && turnDuration > TURN_TIME_BONUS,
        })

        setPlayers(nextPlayers)
        setTurnPlayerId(selectedPlayer?.id ?? null)
        setCurrentPlayerIndex(nextIndex)
        setIsTransitioning(true)
        setSlideDirection(direction === 1 ? "right" : "left")
        setTimeout(() => {
            setIsTransitioning(false)
            setSlideDirection(null)
        }, 500)
        setRoundPhase("player-turns")
        setPausedElapsedTime(0)
        releaseManualNavigation()

        if (shouldAutoStart) {
            setTurnStartTime(currentTime)
            setIsRunning(true)
        } else {
            setTurnStartTime(null)
            setIsRunning(false)
            setManualNavigation(true)
            if (autoResumeReview && selectedPlayer && hasStartedTimingSlot(selectedPlayer)) {
                scheduleAutoResume(selectedPlayer.id)
            }
        }

        triggerSync()
    }

    const startPauseTimer = () => {
        clearAutoResume()

        if (!gameStarted) {
            pushUndoSnapshot()
            setPlayerOrder(players.map((p) => p.id))
            setCurrentOrderIndex(0)
            setTurnPlayerId(players.find((p) => p.isActive)?.id ?? players[0]?.id ?? null)
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
            const currentElapsed = getCurrentTurnTime()
            setPlayers((prev) =>
                prev.map((player) =>
                    player.isActive
                        ? freezeActiveTurn(player, currentElapsed)
                        : player,
                ),
            )
            setTurnStartTime(null)
            setPausedElapsedTime(0)
            setIsRunning(false)
            if (typeof window !== "undefined") {
                localStorage.removeItem("dune-timer-turn-start")
                localStorage.removeItem("dune-timer-paused-elapsed")
            }
        } else {
            if (activePlayer?.isOutOfRound) {
                setPlayers((prev) =>
                    prev.map((player) => {
                        if (!player.isActive) return player
                        return {
                            ...player,
                            isOutOfRound: false,
                            isRevealing: true,
                            agentTurnsTaken: getAgentTurnLimit(player),
                            currentTurnEfficiency: 0,
                            turnStartBank: Math.max(
                                0,
                                Math.floor(player.timeRemaining),
                            ),
                            turnBonusAppliedThisTurn: 0,
                        }
                    }),
                )
            }
            setPausedElapsedTime(0)
            setTurnStartTime(Date.now())
            setIsRunning(true)
        }

        triggerSync()
    }

    const getNextSelectableIndex = (
        fromIndex: number,
        direction: 1 | -1,
        options: { includeOutOfRound?: boolean } = {},
    ): number => {
        if (players.length === 0) return -1

        const includeOutOfRound = Boolean(options.includeOutOfRound)
        let nextIndex =
            (fromIndex + direction + players.length) % players.length
        let checked = 0

        while (
            checked < players.length &&
            !includeOutOfRound &&
            players[nextIndex]?.isOutOfRound
        ) {
            nextIndex =
                (nextIndex + direction + players.length) % players.length
            checked += 1
        }

        return checked >= players.length ? -1 : nextIndex
    }

    const selectPlayerIndex = (
        targetIndex: number,
        options: {
            direction?: "left" | "right"
            autoStart?: boolean
            manual?: boolean
            allowOutOfRound?: boolean
        } = {},
    ) => {
        if (!gameStarted) return
        if (!beginNavigationAction()) return
        clearAutoResume()

        const target = players[targetIndex]
        if (!target || target.isActive) return
        if (target.isOutOfRound && !options.allowOutOfRound) return

        const direction = options.direction ?? "right"
        const autoStart = Boolean(options.autoStart)
        const manual = options.manual ?? true
        const shouldSettleRunning = isRunning && turnStartTime !== null
        const elapsed = shouldSettleRunning ? getCurrentTurnTime() : 0
        const currentTime = Date.now()
        const activeIndex = players.findIndex((player) => player.isActive)
        const orderBeforeSelection = getRoundOrderIndices(
            players,
            playerOrder,
            currentOrderIndex,
        )
        const shouldEndActiveReveal =
            activeIndex !== -1 &&
            players[activeIndex]?.isRevealing &&
            isForwardInOrder(activeIndex, targetIndex, orderBeforeSelection)

        const settledPlayers = players.map((player, index) => {
            if (index === targetIndex) return player
            if (!player.isActive) return { ...player, isActive: false }

            const settledPlayer = shouldSettleRunning
                ? freezeActiveTurn(player, elapsed)
                : player

            return {
                ...settledPlayer,
                isActive: false,
                isRevealing: shouldEndActiveReveal ? false : settledPlayer.isRevealing,
                isOutOfRound: shouldEndActiveReveal ? true : settledPlayer.isOutOfRound,
            }
        })

        if (shouldEndActiveReveal && allPlayersFinishedTurns(settledPlayers)) {
            setPlayers(settledPlayers.map((player) => ({ ...player, isActive: false })))
            setTurnPlayerId(null)
            enterRoundWrapUp()
            releaseManualNavigation()
            triggerSync()
            return
        }

        const orderIndices = getRoundOrderIndices(
            settledPlayers,
            playerOrder,
            currentOrderIndex,
        )
        const shouldCreditTarget =
            autoStart &&
            !target.isOutOfRound &&
            canStartNextSlot(settledPlayers, targetIndex, orderIndices, 1)

        const nextPlayers = settledPlayers.map((player, index) => {
            if (index !== targetIndex) return { ...player, isActive: false }

            if (player.isOutOfRound && autoStart) {
                return {
                    ...player,
                    isActive: true,
                    isOutOfRound: false,
                    isRevealing: true,
                    agentTurnsTaken: getAgentTurnLimit(player),
                    currentTurnEfficiency: 0,
                    turnStartBank: Math.max(0, Math.floor(player.timeRemaining)),
                    turnBonusAppliedThisTurn: 0,
                }
            }

            return prepareActiveTurn(
                { ...player, isActive: true },
                { applyTurnCredit: shouldCreditTarget },
            )
        })

        const selectedPlayer = nextPlayers[targetIndex]
        const shouldRun =
            autoStart &&
            Boolean(
                selectedPlayer &&
                    (shouldCreditTarget || hasStartedTimingSlot(selectedPlayer)),
            )

        setPlayers(nextPlayers)
        setCurrentPlayerIndex(targetIndex)
        setTurnPlayerId(target.id)
        setIsTransitioning(true)
        setSlideDirection(direction)
        setTimeout(() => {
            setIsTransitioning(false)
            setSlideDirection(null)
        }, 500)
        setPausedElapsedTime(0)
        setLastOvertimeWarning(0)

        if (shouldRun) {
            releaseManualNavigation()
            setRoundPhase("player-turns")
            setTurnStartTime(currentTime)
            setIsRunning(true)
        } else {
            if (manual) setManualNavigation(true)
            setTurnStartTime(null)
            setIsRunning(false)
            if (roundPhase === "round-wrap-up") setRoundPhase("player-turns")
        }

        triggerSync()
    }

    const moveTimerCursor = (
        direction: 1 | -1,
        options: { autoStart?: boolean; manual?: boolean } = {},
    ) => {
        const activeIndex = players.findIndex((player) => player.isActive)
        const startIndex = activeIndex !== -1 ? activeIndex : currentPlayerIndex
        const targetIndex = getNextSelectableIndex(startIndex, direction)

        if (targetIndex === -1) {
            enterRoundWrapUp()
            triggerSync()
            return
        }

        selectPlayerIndex(targetIndex, {
            direction: direction === 1 ? "right" : "left",
            autoStart: options.autoStart,
            manual: options.manual,
        })
    }

    const switchToPlayer = (playerId: number) => {
        if (roundPhase === "round-wrap-up") return
        const targetIndex = players.findIndex((player) => player.id === playerId)
        if (targetIndex === -1) return
        if (!gameStarted) {
            setCurrentPlayerIndex(targetIndex)
            return
        }
        const target = players[targetIndex]
        if (!target || target.isActive) return

        pushUndoSnapshot()
        selectPlayerIndex(targetIndex, {
            autoStart: true,
            manual: false,
            allowOutOfRound: true,
        })
    }

    const returnToTurnPlayer = () => {
        // Legacy compatibility for older callers. The timer now uses cursor navigation:
        // arrows/card clicks select a player, and Next Turn advances one slot forward.
        if (!gameStarted || roundPhase === "round-wrap-up") return
        nextTurn()
    }

    const reopenPlayerTurn = (playerId: number) => {
        if (!gameStarted || roundPhase !== "round-wrap-up") return
        const target = players.find((p) => p.id === playerId)
        const reopenTargetIndex = players.findIndex((player) => player.id === playerId)
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
        if (reopenTargetIndex !== -1) setCurrentPlayerIndex(reopenTargetIndex)
        setTurnPlayerId(playerId)
        releaseManualNavigation()
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
        const hasActiveCursor = players.some((p) => p.isActive)
        if (availablePlayers.length === 0 && !hasActiveCursor) {
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
        if (!activePlayer || roundPhase === "round-wrap-up") return

        pushUndoSnapshot()
        clearAutoResume()
        sounds.playReveal()

        const elapsed = isRunning && turnStartTime !== null ? getCurrentTurnTime() : 0
        const currentTime = Date.now()

        setPlayers((prev) =>
            prev.map((player) => {
                if (!player.isActive) return player

                const settledPlayer = isRunning && turnStartTime !== null
                    ? freezeActiveTurn(player, elapsed)
                    : player
                const revealBase = {
                    ...settledPlayer,
                    isActive: true,
                    isOutOfRound: false,
                    isRevealing: true,
                    agentTurnsTaken: Math.min(
                        settledPlayer.agentTurnsTaken,
                        getAgentTurnLimit(settledPlayer),
                    ),
                }

                return prepareActiveTurn(revealBase, { applyTurnCredit: true })
            }),
        )

        setTurnStartTime(currentTime)
        setPausedElapsedTime(0)
        setIsRunning(true)
        setLastOvertimeWarning(0)
        releaseManualNavigation()
        triggerSync()
    }

    const markPlayerRevealed = (playerId: number) => {
        setPlayerTurnStage(playerId, "done")
    }

    const fillPlayerToStartedLevel = (
        sourcePlayers: Player[],
        playerId: number,
        requestedLevel: number,
    ): Player[] => {
        let nextPlayers = sourcePlayers
        let targetIndex = nextPlayers.findIndex((player) => player.id === playerId)
        if (targetIndex === -1) return sourcePlayers

        const safeRequestedLevel = Math.min(
            Math.max(0, requestedLevel),
            getMaxTurnLevel(nextPlayers[targetIndex]),
        )

        let guard = 0
        while (
            targetIndex !== -1 &&
            guard < 16 &&
            getStartedTurnLevel(nextPlayers[targetIndex]) < safeRequestedLevel
        ) {
            const orderIndices = getRoundOrderIndices(
                nextPlayers,
                playerOrder,
                currentOrderIndex,
            )

            if (!canStartNextSlot(nextPlayers, targetIndex, orderIndices, 1)) {
                break
            }

            nextPlayers = nextPlayers.map((player, index) =>
                index === targetIndex
                    ? startNextSlotWithoutActivating(player)
                    : player,
            )
            targetIndex = nextPlayers.findIndex((player) => player.id === playerId)
            guard += 1
        }

        return nextPlayers
    }

    const setPlayerTurnStage = (playerId: number, stage: PlayerTurnStage) => {
        const targetIndex = players.findIndex((player) => player.id === playerId)
        if (targetIndex === -1) return

        const targetPlayer = players[targetIndex]
        const targetWasActive = Boolean(targetPlayer.isActive)
        const limit = getAgentTurnLimit(targetPlayer)
        const isRevealStage = stage === "done" || stage === "reveal"
        const requestedLevel = isRevealStage
            ? getRevealCompletionLevel(targetPlayer)
            : Math.min(limit, Math.max(1, stage))

        const currentStartedLevel = getStartedTurnLevel(targetPlayer)
        if (typeof stage === "number" && requestedLevel <= currentStartedLevel) {
            return
        }

        const orderIndices = getRoundOrderIndices(
            players,
            playerOrder,
            currentOrderIndex,
        )

        if (isRevealStage) {
            if (
                requestedLevel > currentStartedLevel &&
                !canStartNextSlot(players, targetIndex, orderIndices, 1)
            ) {
                return
            }
        } else if (
            requestedLevel > currentStartedLevel &&
            !canManuallyFillTargetLevel(players, targetIndex, requestedLevel, orderIndices)
        ) {
            return
        }

        pushUndoSnapshot()
        if (targetWasActive) clearAutoResume()
        const elapsed = targetWasActive && isRunning && turnStartTime !== null
            ? getCurrentTurnTime()
            : 0

        const projectRevealDone = (sourcePlayers: Player[]) =>
            sourcePlayers.map((player) =>
                player.id === playerId
                    ? {
                          ...(player.isRevealing || player.isOutOfRound
                              ? player
                              : startRevealWithoutActivating(player)),
                          isOutOfRound: true,
                          isRevealing: false,
                          isActive: false,
                      }
                    : player,
            )

        setPlayers((prev) => {
            const settledPlayers = prev.map((player) => {
                if (player.id !== playerId) return player
                return targetWasActive && isRunning && turnStartTime !== null
                    ? freezeActiveTurn(player, elapsed)
                    : player
            })

            if (isRevealStage) {
                return projectRevealDone(settledPlayers)
            }

            const filledPlayers = fillPlayerToStartedLevel(
                settledPlayers,
                playerId,
                requestedLevel,
            )

            return filledPlayers.map((player) => {
                if (player.id !== playerId) return player

                return {
                    ...player,
                    isOutOfRound: false,
                    isRevealing: false,
                }
            })
        })

        const shouldEnterWrapUp = isRevealStage && allPlayersFinishedTurns(
            projectRevealDone(players),
        )

        if (shouldEnterWrapUp) {
            setTurnPlayerId(null)
            enterRoundWrapUp()
        } else if (targetWasActive) {
            setTurnStartTime(null)
            setPausedElapsedTime(0)
            setIsRunning(false)
            setLastOvertimeWarning(0)
        }

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
        const targetIndex = players.findIndex((player) => player.id === playerId)
        if (targetIndex === -1 || roundPhase === "round-wrap-up") return

        const target = players[targetIndex]
        const targetWasActive = Boolean(target.isActive)
        const oldLimit = getAgentTurnLimit(target)
        const wasAtRevealOrDone =
            target.isRevealing || target.isOutOfRound || target.agentTurnsTaken >= oldLimit
        const shouldStartInsertedTurn = targetWasActive && wasAtRevealOrDone
        const elapsed = shouldStartInsertedTurn && isRunning && turnStartTime !== null
            ? getCurrentTurnTime()
            : 0
        const currentTime = Date.now()

        pushUndoSnapshot()
        if (shouldStartInsertedTurn) clearAutoResume()

        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId) return player

                const settledPlayer = shouldStartInsertedTurn
                    ? freezeActiveTurn(player, elapsed)
                    : player
                const nextPlayer = {
                    ...settledPlayer,
                    extraTurnsThisRound: Math.floor(
                        Number(settledPlayer.extraTurnsThisRound ?? 0),
                    ) + 1,
                }
                const nextLimit = getAgentTurnLimit(nextPlayer)

                if (shouldStartInsertedTurn) {
                    return prepareActiveTurn(
                        {
                            ...nextPlayer,
                            isActive: true,
                            isOutOfRound: false,
                            isRevealing: false,
                            agentTurnsTaken: Math.min(
                                settledPlayer.agentTurnsTaken,
                                nextLimit,
                            ),
                        },
                        { applyTurnCredit: true },
                    )
                }

                if (wasAtRevealOrDone && nextLimit > settledPlayer.agentTurnsTaken) {
                    return {
                        ...nextPlayer,
                        isOutOfRound: false,
                        isRevealing: false,
                    }
                }

                return nextPlayer
            }),
        )

        if (shouldStartInsertedTurn) {
            setTurnStartTime(currentTime)
            setPausedElapsedTime(0)
            setIsRunning(true)
            setLastOvertimeWarning(0)
            releaseManualNavigation()
        }

        triggerSync()
    }

    const removePlayerTurn = (playerId: number) => {
        const targetIndex = players.findIndex((player) => player.id === playerId)
        if (targetIndex === -1 || roundPhase === "round-wrap-up") return

        const target = players[targetIndex]
        const oldLimit = getAgentTurnLimit(target)
        if (oldLimit <= 0) return

        const targetWasActive = Boolean(target.isActive)
        const newExtraTurns = Math.floor(Number(target.extraTurnsThisRound ?? 0)) - 1
        const newLimit = Math.max(
            0,
            BASE_AGENT_TURNS + (target.hasSwordmaster ? 1 : 0) + newExtraTurns,
        )
        const shouldMoveActiveToReveal =
            targetWasActive &&
            !target.isOutOfRound &&
            (target.isRevealing || target.agentTurnsTaken > newLimit)
        const elapsed = shouldMoveActiveToReveal && isRunning && turnStartTime !== null
            ? getCurrentTurnTime()
            : 0
        const currentTime = Date.now()

        pushUndoSnapshot()
        if (shouldMoveActiveToReveal) clearAutoResume()

        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId) return player

                const settledPlayer = shouldMoveActiveToReveal
                    ? freezeActiveTurn(player, elapsed)
                    : player
                const nextTurnsTaken = Math.min(
                    settledPlayer.agentTurnsTaken,
                    newLimit,
                )
                const nextPlayer = {
                    ...settledPlayer,
                    extraTurnsThisRound: newExtraTurns,
                    agentTurnsTaken: nextTurnsTaken,
                }

                if (settledPlayer.isOutOfRound) {
                    return {
                        ...nextPlayer,
                        isRevealing: false,
                        isOutOfRound: true,
                    }
                }

                if (shouldMoveActiveToReveal) {
                    if (settledPlayer.isRevealing) {
                        return {
                            ...nextPlayer,
                            isActive: true,
                            isRevealing: true,
                            isOutOfRound: false,
                        }
                    }

                    return prepareActiveTurn(
                        {
                            ...nextPlayer,
                            isActive: true,
                            isRevealing: false,
                            isOutOfRound: false,
                        },
                        { applyTurnCredit: true },
                    )
                }

                if (settledPlayer.isRevealing || settledPlayer.agentTurnsTaken > newLimit) {
                    return {
                        ...nextPlayer,
                        isRevealing: true,
                        isOutOfRound: false,
                    }
                }

                return nextPlayer
            }),
        )

        if (shouldMoveActiveToReveal && !target.isRevealing) {
            setTurnStartTime(currentTime)
            setPausedElapsedTime(0)
            setIsRunning(true)
            setLastOvertimeWarning(0)
            releaseManualNavigation()
        }

        triggerSync()
    }

    const skipToRoundWrapUp = () => {
        if (!gameStarted || roundPhase === "round-wrap-up") return

        pushUndoSnapshot()
        const elapsed = getCurrentTurnTime()

        setPlayers((prev) =>
            prev.map((player) => {
                const frozenPlayer = player.isActive
                    ? freezeActiveTurn(player, elapsed)
                    : player

                return {
                    ...frozenPlayer,
                    isActive: false,
                    isRevealing: false,
                    isOutOfRound: true,
                    agentTurnsTaken: getAgentTurnLimit(frozenPlayer),
                    currentTurnEfficiency: 0,
                }
            }),
        )
        setTurnPlayerId(null)
        enterRoundWrapUp()
        triggerSync()
    }

    const endRound = () => {
        clearAutoResume()
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

        const roundStarterIndex = players.findIndex((player) => player.id === roundStarterId)
        setCurrentOrderIndex(nextIndex)
        setPlayerOrder(order)
        setTurnPlayerId(roundStarterId ?? null)
        setCurrentPlayerIndex(roundStarterIndex === -1 ? 0 : roundStarterIndex)
        setRoundPhase("player-turns")
        setPlayers((prev) =>
            prev.map((player) => {
                const resetPlayer = {
                    ...player,
                    isOutOfRound: false,
                    isRevealing: false,
                    isActive: false,
                    agentTurnsTaken: 0,
                    extraTurnsThisRound: 0,
                    turnsCompleted: 0,
                    currentTurnEfficiency: 0,
                    turnStartBank: 0,
                    turnBonusAppliedThisTurn: 0,
                }

                if (player.id !== roundStarterId) return resetPlayer

                return startNextSlotWithoutActivating({
                    ...resetPlayer,
                    isActive: true,
                })
            }),
        )

        setCurrentRound((prev) => prev + 1)
        setTurnStartTime(Date.now())
        setPausedElapsedTime(0)
        setIsRunning(true)
        setLastOvertimeWarning(0)
        releaseManualNavigation()
        triggerSync()
    }

    const resetGame = () => {
        clearAutoResume()
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
        setShowSettings(false)
        setShowColorSelectors(true)
        setLastOvertimeWarning(0)
        setTurnPlayerId(null)
        setCurrentPlayerIndex(0)
        setIsTransitioning(false)
        setSlideDirection(null)
        releaseManualNavigation()
        setNextPlayerId(null)
        setPlayerOrder([])
        setCurrentOrderIndex(0)
        setUndoStack([])
        if (typeof window !== "undefined") {
            localStorage.removeItem("dune-timer-turn-start")
            localStorage.removeItem("dune-timer-paused-elapsed")
            localStorage.removeItem("dune-timer-game-start")
            localStorage.removeItem("dune-timer-round-phase")
            localStorage.removeItem("dune-timer-turn-player-id")
        }
        triggerSync()
    }

    const adjustPlayerTime = (playerId: number, adjustment: number) => {
        pushUndoSnapshot()
        const activeElapsed = getCurrentTurnTime()

        setPlayers((prev) =>
            prev.map((player) => {
                if (player.id !== playerId) return player

                if (!player.isActive) {
                    return {
                        ...player,
                        timeRemaining: Math.max(
                            0,
                            player.timeRemaining + adjustment,
                        ),
                    }
                }

                const currentRemaining = getLiveTurnTimeRemaining(
                    player,
                    activeElapsed,
                )
                const nextRemaining = Math.max(0, currentRemaining + adjustment)
                const nextTurnTotal = nextRemaining + activeElapsed
                const currentBonus = Math.max(
                    0,
                    Number(player.turnBonusAppliedThisTurn ?? 0),
                )
                const nextBonus = Math.min(currentBonus, nextTurnTotal)
                const nextTurnStartBank = Math.max(0, nextTurnTotal - nextBonus)

                return {
                    ...player,
                    timeRemaining: nextRemaining,
                    turnStartBank: nextTurnStartBank,
                    turnBonusAppliedThisTurn: nextBonus,
                }
            }),
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
        track("timer_cursor_navigation", {
            direction,
            context: gameStarted && !isRunning ? "paused" : "active",
        })

        if (!gameStarted) {
            setManualNavigation(true)
            setIsTransitioning(true)
            setSlideDirection(direction)
            setCurrentPlayerIndex((prev) =>
                prev === players.length - 1 ? 0 : prev + 1,
            )
            setTimeout(() => {
                setIsTransitioning(false)
                setSlideDirection(null)
            }, 500)
            return
        }

        if (roundPhase === "round-wrap-up") return

        pushUndoSnapshot()
        completeActiveTurn(1, { autoStartDueSlot: true, autoResumeReview: true })
    }

    const previousPlayerCard = (direction: "left" | "right" = "left") => {
        track("timer_cursor_navigation", {
            direction,
            context: gameStarted && !isRunning ? "paused" : "active",
        })

        if (!gameStarted) {
            setManualNavigation(true)
            setIsTransitioning(true)
            setSlideDirection(direction)
            setCurrentPlayerIndex((prev) =>
                prev === 0 ? players.length - 1 : prev - 1,
            )
            setTimeout(() => {
                setIsTransitioning(false)
                setSlideDirection(null)
            }, 500)
            return
        }

        if (roundPhase === "round-wrap-up") return

        pushUndoSnapshot()
        completeActiveTurn(-1, { autoStartDueSlot: false, autoResumeReview: true })
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
            if (autoResumeTimeoutRef.current)
                clearTimeout(autoResumeTimeoutRef.current)
            if (autoResumeIntervalRef.current)
                clearInterval(autoResumeIntervalRef.current)
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
        turnPlayer,
        turnPlayerIndex,
        isCorrectionMode,
        currentPlayerIndex,
        isTransitioning,
        slideDirection,
        playerOrder,
        currentOrderIndex,
        nextPlayerId,
        autoResumeSeconds,
        canUndo: undoStack.length > 0,
        getCurrentTurnTime,
        getActivePlayersCount,
        getAgentTurnLimit,
        startPauseTimer,
        switchToPlayer,
        returnToTurnPlayer,
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
        skipToRoundWrapUp,
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
