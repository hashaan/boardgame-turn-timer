"use client"

import type React from "react"
import {
    Play,
    Pause,
    Clock,
    Plus,
    GripVertical,
    AlertTriangle,
    Edit2,
    Minus,
    Swords,
    RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Player, PlayerTurnStage, TimerPhase } from "@/types"
import { formatTime, getTurnProgressColor } from "@/utils"

const BASE_AGENT_TURNS = 2
const TURN_TIME_BONUS = 60

const formatDurationCompact = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds))
    if (safeSeconds < 60) return `${safeSeconds}s`
    return formatTime(safeSeconds)
}

const formatSignedDurationCompact = (seconds: number): string => {
    const prefix = seconds >= 0 ? "+" : "−"
    return `${prefix}${formatDurationCompact(Math.abs(seconds))}`
}

const AVAILABLE_COLORS = [
    {
        value: "blue",
        label: "Blue",
        bg: "bg-blue-50 dark:bg-zinc-900/45",
        border: "border-blue-200 dark:border-zinc-700/40",
        text: "text-blue-700 dark:text-blue-300/55",
        bar: "bg-blue-500",
    },
    {
        value: "green",
        label: "Green",
        bg: "bg-green-50 dark:bg-zinc-900/45",
        border: "border-green-200 dark:border-zinc-700/40",
        text: "text-green-700 dark:text-emerald-300/55",
        bar: "bg-green-500",
    },
    {
        value: "purple",
        label: "Purple",
        bg: "bg-purple-50 dark:bg-zinc-900/45",
        border: "border-purple-200 dark:border-zinc-700/40",
        text: "text-purple-700 dark:text-violet-300/55",
        bar: "bg-purple-500",
    },
    {
        value: "rose",
        label: "Rose",
        bg: "bg-rose-50 dark:bg-zinc-900/45",
        border: "border-rose-200 dark:border-zinc-700/40",
        text: "text-rose-700 dark:text-rose-300/55",
        bar: "bg-rose-500",
    },
    {
        value: "red",
        label: "Red",
        bg: "bg-red-50 dark:bg-zinc-900/45",
        border: "border-red-200 dark:border-zinc-700/40",
        text: "text-red-700 dark:text-rose-300/55",
        bar: "bg-red-500",
    },
    {
        value: "indigo",
        label: "Indigo",
        bg: "bg-indigo-50 dark:bg-zinc-900/45",
        border: "border-indigo-200 dark:border-zinc-700/40",
        text: "text-indigo-700 dark:text-indigo-300/55",
        bar: "bg-indigo-500",
    },
    {
        value: "pink",
        label: "Pink",
        bg: "bg-pink-50 dark:bg-zinc-900/45",
        border: "border-pink-200 dark:border-zinc-700/40",
        text: "text-pink-700 dark:text-pink-300/50",
        bar: "bg-pink-500",
    },
    {
        value: "teal",
        label: "Teal",
        bg: "bg-teal-50 dark:bg-zinc-900/45",
        border: "border-teal-200 dark:border-zinc-700/40",
        text: "text-teal-700 dark:text-teal-300/55",
        bar: "bg-teal-500",
    },
]

interface PlayerCardProps {
    player: Player
    isActive: boolean
    isTurnPlayer?: boolean
    isSwitchedClock?: boolean
    currentTurnTime: number
    gameStarted: boolean
    isRunning?: boolean
    autoResumeSeconds?: number | null
    initialTime: number
    showAdjustButtons: boolean
    showColorSelectors: boolean
    editingPlayer: number | null
    editName: string
    roundPhase?: TimerPhase
    onPlayerClick?: (playerId: number) => void
    onManualSwitch?: (playerId: number) => void
    onReopenTurn?: (playerId: number) => void
    onDragStart: (playerId: number) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (targetPlayerId: number) => void
    onAdjustTime: (playerId: number, adjustment: number) => void
    onUpdateName: (playerId: number, newName: string) => void
    onUpdateColor: (playerId: number, newColor: string) => void
    onStartEdit: (playerId: number, currentName: string) => void
    onSetEditName: (name: string) => void
    onTurnStageChange?: (playerId: number, stage: PlayerTurnStage) => void
    onToggleSwordmaster?: (playerId: number) => void
    onAddTurn?: (playerId: number) => void
    onRemoveTurn?: (playerId: number) => void
}

const getPlayerColorStyles = (color: string) => {
    const normalizedColor = color === "orange" ? "rose" : color
    const colorOption =
        AVAILABLE_COLORS.find((c) => c.value === normalizedColor) || AVAILABLE_COLORS[0]
    return colorOption
}

const getAgentTurnLimit = (player: Player) => {
    return (
        BASE_AGENT_TURNS +
        (player.hasSwordmaster ? 1 : 0) +
        Math.max(0, player.extraTurnsThisRound ?? 0)
    )
}

const getCurrentTurnLabel = (player: Player) => {
    if (player.isOutOfRound) return "Done this round"
    const agentTurnLimit = getAgentTurnLimit(player)
    if (player.isRevealing) return "Reveal"
    const currentAgentTurn = Math.min(
        Math.max(1, player.agentTurnsTaken),
        agentTurnLimit,
    )
    return `Agent Turn ${currentAgentTurn}/${agentTurnLimit}`
}

const getUpcomingTurnLabel = (player: Player) => {
    if (player.isOutOfRound) return "Done this round"
    const agentTurnLimit = getAgentTurnLimit(player)
    if (player.isRevealing || player.agentTurnsTaken >= agentTurnLimit) {
        return "Reveal"
    }
    return `Agent Turn ${player.agentTurnsTaken + 1}/${agentTurnLimit}`
}

type TurnChipState = "completed" | "current" | "next" | "future"

export const PlayerCard = ({
    player,
    isActive,
    isTurnPlayer = isActive,
    isSwitchedClock = false,
    currentTurnTime,
    gameStarted,
    isRunning = false,
    autoResumeSeconds = null,
    initialTime,
    showAdjustButtons,
    showColorSelectors,
    editingPlayer,
    editName,
    roundPhase = "player-turns",
    onPlayerClick,
    onManualSwitch,
    onReopenTurn,
    onDragStart,
    onDragOver,
    onDrop,
    onAdjustTime,
    onUpdateName,
    onUpdateColor,
    onStartEdit,
    onSetEditName,
    onTurnStageChange,
    onToggleSwordmaster,
    onAddTurn,
    onRemoveTurn,
}: PlayerCardProps) => {
    const colors = getPlayerColorStyles(player.color)
    const turnProgressColor = getTurnProgressColor(currentTurnTime)
    const turnStartBank = Math.max(0, Number(player.turnStartBank ?? 0))
    const turnBonus = Math.max(0, Number(player.turnBonusAppliedThisTurn ?? 0))
    const agentTurnLimit = getAgentTurnLimit(player)
    const completedAgentTurns = Math.min(player.agentTurnsTaken, agentTurnLimit)
    const hasStartedSlot =
        gameStarted &&
        (turnBonus > 0 ||
            completedAgentTurns > 0 ||
            player.isRevealing ||
            player.isOutOfRound)
    const activeTurnBonusRemaining = Math.max(0, turnBonus - currentTurnTime)
    const inactiveTurnBonusRemaining = Math.max(0, turnBonus)
    const displayedTurnBonusRemaining =
        isActive && gameStarted
            ? activeTurnBonusRemaining
            : inactiveTurnBonusRemaining
    const isOvertime = isActive && gameStarted && currentTurnTime > turnBonus
    const turnProgressPercentage = hasStartedSlot
        ? Math.min(
              100,
              Math.max(
                  0,
                  (displayedTurnBonusRemaining / TURN_TIME_BONUS) * 100,
              ),
          )
        : 0
    const turnEfficiencyValue =
        isActive && gameStarted
            ? turnBonus - currentTurnTime
            : Number(player.currentTurnEfficiency ?? 0)
    const turnEfficiencyLabel = hasStartedSlot
        ? formatSignedDurationCompact(turnEfficiencyValue)
        : "—"
    const turnBonusLabel = !hasStartedSlot
        ? "not started"
        : displayedTurnBonusRemaining > 0
          ? `${formatDurationCompact(displayedTurnBonusRemaining)} left`
          : "0s left"
    const displayTimeRemaining =
        isActive && gameStarted
            ? Math.max(
                  0,
                  turnStartBank + turnBonus - currentTurnTime,
              )
            : player.timeRemaining
    const currentTurnLabel = getCurrentTurnLabel(player)
    const upcomingTurnLabel = getUpcomingTurnLabel(player)
    const activeAgentStage =
        player.isOutOfRound ||
        player.isRevealing ||
        completedAgentTurns === 0
            ? null
            : completedAgentTurns
    const showRemoveTurn = player.extraTurnsThisRound > 0
    const turnBadgeLabel = player.isOutOfRound
        ? "Done"
        : isActive
          ? `${isRunning ? "Now" : "Paused"}: ${currentTurnLabel}`
          : `Next: ${upcomingTurnLabel}`
    const progressLabel = player.isOutOfRound
        ? "Reveal started"
        : `${completedAgentTurns}/${agentTurnLimit} agent turns started`
    const isRoundWrapUp = roundPhase === "round-wrap-up"
    const isWaitingWhileClockRuns =
        gameStarted && isRunning && !isActive && !player.isOutOfRound
    const canReopenTurn =
        gameStarted &&
        isRoundWrapUp &&
        player.isOutOfRound &&
        Boolean(onReopenTurn)

    const getAgentChipState = (stage: number): TurnChipState => {
        if (activeAgentStage === stage) return isActive ? "current" : "completed"
        if (player.isOutOfRound || stage <= completedAgentTurns) return "completed"
        if (stage === completedAgentTurns + 1) return "next"
        return "future"
    }

    const getRevealChipState = (): TurnChipState => {
        if (player.isOutOfRound) return "completed"
        if (player.isRevealing) return isActive ? "current" : "completed"
        return "future"
    }

    const chipClass = (state: TurnChipState) => {
        const base =
            "h-8 min-w-8 rounded-full border px-2 text-xs font-semibold transition-colors touch-manipulation"

        if (state === "completed") {
            return `${base} border-slate-400 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:border-white/15 dark:bg-white/[0.12] dark:text-zinc-200 dark:hover:bg-white/[0.16]`
        }

        if (state === "current") {
            return `${base} border-amber-500 bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:border-amber-400/60 dark:bg-amber-500/80 dark:text-zinc-950`
        }

        if (state === "next") {
            return `${base} border-slate-400 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08]`
        }

        return `${base} border-slate-200 bg-white text-slate-400 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500 dark:hover:bg-white/[0.07]`
    }

    return (
        <Card
            draggable
            onDragStart={(e) => {
                onDragStart(player.id)
                e.dataTransfer.effectAllowed = "move"
            }}
            onDragOver={onDragOver}
            onDrop={(e) => {
                e.preventDefault()
                onDrop(player.id)
            }}
            onClick={() => onPlayerClick?.(player.id)}
            className={`group relative h-full overflow-hidden transition-all duration-300 cursor-default touch-manipulation ${
                isActive
                    ? "border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-[0_16px_42px_rgba(217,119,6,0.16)] text-amber-950 dark:border-amber-400/15 dark:[background-image:none] dark:bg-zinc-900/85 dark:text-zinc-100"
                    : player.isOutOfRound
                      ? "border border-slate-200 bg-slate-50/60 text-slate-400 shadow-sm hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-500 active:scale-[0.99] dark:border-zinc-700/40 dark:bg-zinc-900/45 dark:text-zinc-500 dark:hover:text-zinc-300"
                      : `border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white hover:shadow-md active:scale-[0.99] dark:border-zinc-700/45 dark:bg-zinc-900/45 dark:text-zinc-300 ${isWaitingWhileClockRuns ? "shadow-sm" : ""}`
            }`}
            style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                borderWidth: "1px",
                borderStyle: "solid",
            }}
        >
            {isActive && (
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-amber-500/85 dark:bg-amber-400/45"
                />
            )}
            <div
                className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${colors.bar} ${
                    isActive ? "opacity-30" : player.isOutOfRound ? "opacity-20" : "opacity-35"
                }`}
                aria-hidden="true"
            />
            <CardHeader className="pb-3 pl-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-gray-400 dark:text-zinc-600 cursor-grab touch-none shrink-0" />
                        <span
                            className={`h-2 w-2 rounded-full ring-2 ring-white/80 ${colors.bar} ${
                                isActive ? "opacity-75" : "opacity-45"
                            }`}
                            aria-hidden="true"
                        />
                        {editingPlayer === player.id ? (
                            <Input
                                value={editName}
                                onChange={(e) => onSetEditName(e.target.value)}
                                onBlur={() => onUpdateName(player.id, editName)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                        onUpdateName(player.id, editName)
                                    if (e.key === "Escape") onStartEdit(-1, "")
                                }}
                                className="text-xl font-semibold w-32"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <CardTitle
                                    className={`text-xl font-semibold truncate ${
                                        isActive
                                            ? "text-amber-800 dark:text-amber-100/90"
                                            : player.isOutOfRound
                                              ? "text-slate-500 dark:text-zinc-500"
                                              : "text-slate-700 dark:text-zinc-300"
                                    }`}
                                >
                                    {player.name}
                                </CardTitle>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onStartEdit(player.id, player.name)
                                    }}
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100 touch-manipulation shrink-0"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {player.isOutOfRound && (
                            <Badge className="bg-slate-200 text-slate-600 text-xs dark:bg-zinc-700/70 dark:text-zinc-300">
                                Done
                            </Badge>
                        )}
                        {player.isRevealing && !player.isOutOfRound && (
                            <Badge className="bg-purple-500 text-white text-xs dark:bg-violet-600/25 dark:text-violet-200/90 dark:font-normal">
                                Revealing
                            </Badge>
                        )}
                        {isActive && isOvertime && (
                            <Badge className="bg-red-500 text-white text-xs dark:bg-rose-600/25 dark:text-rose-200/90 dark:font-normal">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Overtime
                            </Badge>
                        )}
                        {isActive && !player.isOutOfRound && (
                            <Badge
                                className={
                                    isRunning
                                        ? "bg-amber-500 text-white text-xs dark:bg-amber-500/20 dark:text-amber-100/90 dark:font-normal"
                                        : "bg-slate-700 text-white text-xs dark:bg-white/12 dark:text-zinc-200 dark:font-normal"
                                }
                            >
                                {isRunning ? (
                                    <Play className="w-3 h-3 mr-1" />
                                ) : (
                                    <Pause className="w-3 h-3 mr-1" />
                                )}
                                {isRunning
                                    ? "Active"
                                    : autoResumeSeconds
                                      ? `Resume in ${autoResumeSeconds}s`
                                      : "Paused"}
                            </Badge>
                        )}
                        {canReopenTurn && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onReopenTurn?.(player.id)
                                }}
                                className="h-8 px-2 text-xs border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 touch-manipulation shrink-0 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
                                title="Reopen this player's Reveal turn without adding a bonus"
                            >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Reopen Reveal
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pl-6">
                <div className="space-y-4">
                    {showColorSelectors && (
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-600 dark:text-zinc-500">
                                Color:
                            </Label>
                            <Select
                                value={player.color}
                                onValueChange={(value) =>
                                    onUpdateColor(player.id, value)
                                }
                            >
                                <SelectTrigger
                                    className="w-fit h-8"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_COLORS.map((color) => (
                                        <SelectItem
                                            key={color.value}
                                            value={color.value}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full flex-shrink-0 ${color.bar}`}
                                                />
                                                {color.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="text-center">
                        <div
                            className={`text-3xl md:text-4xl font-mono font-bold tabular-nums transition-colors duration-200 ${
                                displayTimeRemaining < 60
                                    ? "text-red-600 dark:text-rose-400/65"
                                    : displayTimeRemaining < 180
                                      ? "text-orange-600 dark:text-amber-400/55"
                                      : "text-green-600 dark:text-emerald-400/55"
                            }`}
                        >
                            {formatTime(displayTimeRemaining)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-zinc-500 mt-1">
                            remaining
                        </p>

                        {showAdjustButtons && (
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAdjustTime(player.id, -60)
                                    }}
                                    className="h-8 w-8 p-0 touch-manipulation"
                                >
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-xs text-gray-500 dark:text-zinc-600 px-2">
                                    Adjust
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAdjustTime(player.id, 60)
                                    }}
                                    className="h-8 w-8 p-0 touch-manipulation"
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {gameStarted && (
                        <div
                            className="rounded-xl border border-slate-200 bg-white/70 p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-500">
                                <span className="font-semibold uppercase tracking-wide">
                                    Turn
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-zinc-300"
                                >
                                    {turnBadgeLabel}
                                </Badge>
                                <span className="ml-auto tabular-nums">
                                    {progressLabel}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {Array.from(
                                    { length: agentTurnLimit },
                                    (_, index) => {
                                        const stage = index + 1
                                        return (
                                            <Button
                                                key={stage}
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={!onTurnStageChange || isRoundWrapUp}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onTurnStageChange?.(
                                                        player.id,
                                                        stage,
                                                    )
                                                }}
                                                className={chipClass(
                                                    getAgentChipState(stage),
                                                )}
                                                aria-label={`Set ${player.name} to Agent Turn ${stage}/${agentTurnLimit}`}
                                                title={`Set ${player.name} to Agent Turn ${stage}/${agentTurnLimit}`}
                                            >
                                                {stage}
                                            </Button>
                                        )
                                    },
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!onTurnStageChange || isRoundWrapUp}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onTurnStageChange?.(player.id, "reveal")
                                    }}
                                    className={chipClass(getRevealChipState())}
                                    aria-label={`Set ${player.name} to Reveal`}
                                    title={`Set ${player.name} to Reveal`}
                                >
                                    R
                                </Button>

                                <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!onAddTurn}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAddTurn?.(player.id)
                                        }}
                                        className="h-8 px-2.5 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 touch-manipulation dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07]"
                                        title="Add one extra timed Agent turn this round"
                                    >
                                        <span className="text-xs font-medium leading-none">+ Turn</span>
                                    </Button>

                                    {showRemoveTurn && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={!onRemoveTurn}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRemoveTurn?.(player.id)
                                            }}
                                            className="h-8 px-2 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 touch-manipulation dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07]"
                                            title="Remove one manually added extra turn"
                                        >
                                            <span className="text-xs font-medium leading-none">− Turn</span>
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!onToggleSwordmaster}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onToggleSwordmaster?.(player.id)
                                        }}
                                        className={`h-8 px-2 text-xs touch-manipulation ${
                                            player.hasSwordmaster
                                                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07]"
                                        }`}
                                        title={
                                            player.hasSwordmaster
                                                ? "Remove Swordmaster turn"
                                                : "Add Swordmaster turn"
                                        }
                                    >
                                        <Swords className="mr-1 h-3.5 w-3.5" />
                                        Swordmaster
                                    </Button>

                                </div>
                            </div>
                        </div>
                    )}

                    {gameStarted && (
                        <div
                            className={`space-y-2 ${
                                isActive
                                    ? ""
                                    : player.isOutOfRound
                                      ? "opacity-55 transition-opacity group-hover:opacity-75"
                                      : "opacity-75 transition-opacity group-hover:opacity-95"
                            }`}
                        >
                            <div className="flex justify-between text-xs text-gray-600 dark:text-zinc-500">
                                <span>Turn bonus</span>
                                <span className="tabular-nums">{turnBonusLabel}</span>
                            </div>
                            <div
                                className="h-3 w-full rounded-full bg-gray-200 dark:bg-zinc-800/80"
                                aria-label="Turn bonus remaining"
                            >
                                <div
                                    className={`h-3 rounded-full transition-colors duration-200 ${
                                        isActive
                                            ? turnProgressColor
                                            : hasStartedSlot
                                              ? "bg-slate-300 dark:bg-zinc-700"
                                              : "bg-transparent"
                                    }`}
                                    style={{
                                        width: `${Math.max(0, turnProgressPercentage)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                <span>Turn efficiency</span>
                                <span
                                    className={`rounded-md px-2 py-0.5 font-semibold tabular-nums ${
                                        !hasStartedSlot
                                            ? "bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-zinc-500"
                                            : turnEfficiencyValue >= 0
                                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300/80"
                                              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300/80"
                                    }`}
                                >
                                    {turnEfficiencyLabel}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
