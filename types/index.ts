export type PlayerTurnStage = number | "reveal" | "done"
export type TimerPhase = "player-turns" | "round-wrap-up"

export interface Player {
    id: number
    name: string
    timeRemaining: number // in seconds
    totalEfficiency: number // cumulative efficiency across all turns
    currentTurnEfficiency: number // efficiency for current turn only
    turnsCompleted: number
    isActive: boolean
    color: string // unique color for each player
    isRevealing: boolean // on Reveal turn
    isOutOfRound: boolean // true if finished with round (after reveal)
    agentTurnsTaken: number // completed Agent turns this round
    extraTurnsThisRound: number // manual extra Agent turns this round
    hasSwordmaster: boolean // adds one Agent turn
    turnStartBank: number // game-time balance underneath the current turn bonus
    turnBonusAppliedThisTurn: number // remaining bonus seconds for the selected/started slot
}

export interface GameState {
    players: Player[]
    isRunning: boolean
    turnStartTime: number | null
    gameStarted: boolean
    currentRound: number
    roundPhase: TimerPhase
    initialTime: number
    showSettings: boolean
    showAdjustButtons: boolean
    showColorSelectors: boolean
    editingPlayer: number | null
    editName: string
    draggedPlayer: number | null
}

export interface ColorOption {
    value: string
    label: string
    bg: string
    border: string
    text: string
    bar: string
}

export type HostState = {
    sentAt: number
    players: Array<{
        id: number
        name: string
        color?: string
        isActive: boolean
        isRevealing: boolean
        timeRemaining: number
        isOutOfRound: boolean
        agentTurnsTaken?: number
        extraTurnsThisRound?: number
        hasSwordmaster?: boolean
        turnStartBank?: number
        turnBonusAppliedThisTurn?: number
    }>
    currentRound: number
    roundPhase: TimerPhase
    isRunning: boolean
    gameStarted: boolean
}
