"use client"

import { useState } from "react"
import type { TimerPhase } from "@/types"
import { Play, Pause, RotateCcw, Settings, Trophy, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import JoinRoomModal from "./JoinRoomModal"

interface ControlPanelProps {
    isRunning: boolean
    gameStarted: boolean
    roundPhase: TimerPhase
    currentRound: number
    activePlayer: any
    turnPlayerName?: string | null
    activePlayerName?: string | null
    isSwitchedMode?: boolean
    roomCode: string | null
    timerDark?: boolean
    canUndo?: boolean
    onStartPause: () => void
    onNextTurn: () => void
    onStartReveal: () => void
    onUndo?: () => void
    onEndRound: () => void
    onFinishGameAndLog?: () => void
    onReset: () => void
    onToggleSettings: () => void
}

type PendingConfirmation = "finish-log" | "reset" | null

export const ControlPanel = ({
    isRunning,
    gameStarted,
    roundPhase,
    currentRound,
    activePlayer,
    roomCode,
    timerDark = false,
    canUndo = false,
    onStartPause,
    onNextTurn,
    onStartReveal,
    onUndo,
    onEndRound,
    onFinishGameAndLog,
    onReset,
    onToggleSettings,
}: ControlPanelProps) => {
    const isRoundWrapUp = gameStarted && roundPhase === "round-wrap-up"
    const [pendingConfirmation, setPendingConfirmation] =
        useState<PendingConfirmation>(null)

    const requestConfirmation = (
        confirmation: Exclude<PendingConfirmation, null>,
    ) => {
        if (confirmation === "reset" && !gameStarted) {
            onReset()
            return
        }
        setPendingConfirmation(confirmation)
    }

    const confirmation = (() => {
        if (pendingConfirmation === "finish-log") {
            return {
                title: "Log playthrough?",
                body: "Open the playthrough form without clearing the timer. You can use the timer state while entering the result.",
                confirmLabel: "Open form",
                confirmClass:
                    "border-amber-500 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-400/40 dark:bg-amber-500/90 dark:text-zinc-950",
                onConfirm: onFinishGameAndLog,
            }
        }

        if (pendingConfirmation === "reset") {
            return {
                title: "Reset game?",
                body: "Timers and turn slots will be cleared.",
                confirmLabel: "Reset game",
                confirmClass:
                    "border-red-400 bg-red-600 text-white hover:bg-red-700 dark:border-rose-400/40 dark:bg-rose-500/90 dark:text-white",
                onConfirm: onReset,
            }
        }

        return null
    })()

    const startPauseLabel = !gameStarted
        ? "Start new game"
        : isRunning
          ? "Pause"
          : "Resume"
    const startPauseIcon = !gameStarted || !isRunning ? (
        <Play className="mr-2 h-4 w-4" />
    ) : (
        <Pause className="mr-2 h-4 w-4" />
    )
    const nextLabel = isRoundWrapUp ? `Start round ${currentRound + 1}` : "Next turn"

    const primaryButtonClass =
        "h-14 min-w-[11rem] px-8 text-base font-semibold shadow-md"
    const quietPrimaryClass =
        "h-14 min-w-[11rem] border border-amber-500 bg-white/85 px-8 text-base font-semibold text-amber-800 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08] dark:hover:text-white dark:disabled:border-zinc-800 dark:disabled:text-zinc-600 dark:disabled:bg-zinc-950/50 dark:disabled:opacity-100"
    const solidPrimaryClass =
        "h-14 min-w-[11rem] bg-amber-600 px-8 text-base font-semibold text-white shadow-md hover:bg-amber-700 dark:border-0 dark:bg-gradient-to-b dark:from-amber-500/90 dark:to-amber-600/95 dark:text-white dark:shadow-[0_0_32px_-8px_rgba(217,119,6,0.28)] dark:hover:from-amber-500 dark:hover:to-amber-600"
    const utilityButtonClass =
        "h-9 px-3.5 border-slate-300 bg-white/60 text-sm text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white dark:disabled:border-zinc-800 dark:disabled:text-zinc-600 dark:disabled:bg-zinc-950/50 dark:disabled:opacity-100"

    return (
        <Card className="mb-5 border-amber-200 bg-amber-50/60 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/65 dark:shadow-none">
            <CardContent className="p-4 md:p-5">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                            onClick={onStartPause}
                            disabled={isRoundWrapUp}
                            size="lg"
                            variant={isRunning ? "outline" : "default"}
                            className={
                                isRunning
                                    ? quietPrimaryClass
                                    : `${primaryButtonClass} bg-amber-600 text-white hover:bg-amber-700 dark:border-0 dark:bg-gradient-to-b dark:from-amber-500/90 dark:to-amber-600/95 dark:text-white`
                            }
                        >
                            {startPauseIcon}
                            {startPauseLabel}
                        </Button>

                        <Button
                            onClick={onNextTurn}
                            disabled={!gameStarted}
                            size="lg"
                            className={
                                isRoundWrapUp || isRunning
                                    ? solidPrimaryClass
                                    : quietPrimaryClass
                            }
                        >
                            {nextLabel}
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            onClick={onUndo}
                            disabled={!gameStarted || !canUndo || !onUndo}
                            size="sm"
                            variant="outline"
                            className={utilityButtonClass}
                            title="Undo last turn change"
                        >
                            <Undo2 className="mr-1.5 h-4 w-4" />
                            Undo
                        </Button>
                        {!isRoundWrapUp && activePlayer && !activePlayer.isRevealing && (
                            <Button
                                onClick={onStartReveal}
                                disabled={!gameStarted}
                                size="sm"
                                variant="outline"
                                className={utilityButtonClass}
                                title="Start the active player’s Reveal turn"
                            >
                                Reveal turn
                            </Button>
                        )}


                        {gameStarted && onFinishGameAndLog && (
                            <Button
                                onClick={() => requestConfirmation("finish-log")}
                                size="sm"
                                variant="outline"
                                className={utilityButtonClass}
                                title="End the timer and open the playthrough form"
                            >
                                <Trophy className="mr-1.5 h-4 w-4" />
                                End game
                            </Button>
                        )}

                        <Button
                            onClick={() => requestConfirmation("reset")}
                            size="sm"
                            variant="outline"
                            className="h-9 border-red-200 bg-white/50 px-3.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 dark:border-rose-500/15 dark:bg-white/[0.03] dark:text-rose-300/70 dark:hover:bg-rose-950/20 dark:hover:text-rose-200/90"
                        >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Reset game
                        </Button>

                        {gameStarted && (
                            <Button
                                onClick={onToggleSettings}
                                size="sm"
                                variant="outline"
                                className="h-9 border-blue-300 bg-white/60 px-3.5 text-sm text-blue-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                            >
                                <Settings className="mr-1.5 h-4 w-4" />
                                Settings
                            </Button>
                        )}

                        <JoinRoomModal roomCode={roomCode} timerDark={timerDark}>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 border-orange-300 bg-white/60 px-3.5 text-sm text-orange-600 hover:bg-white hover:text-orange-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                            >
                                Join room
                            </Button>
                        </JoinRoomModal>
                    </div>

                    {confirmation && (
                        <div className="mt-1 w-full max-w-2xl rounded-xl border border-amber-300 bg-white/85 p-4 text-left shadow-sm dark:border-white/10 dark:bg-zinc-950/80">
                            <div className="font-semibold text-amber-950 dark:text-zinc-100">
                                {confirmation.title}
                            </div>
                            <div className="mt-1 text-sm text-amber-800/80 dark:text-zinc-400">
                                {confirmation.body}
                            </div>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPendingConfirmation(null)}
                                    className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const action = confirmation.onConfirm
                                        setPendingConfirmation(null)
                                        action?.()
                                    }}
                                    className={confirmation.confirmClass}
                                >
                                    {confirmation.confirmLabel}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-2 text-center text-xs text-amber-700/90 dark:text-zinc-500 [&_strong]:dark:text-zinc-300">
                    <p>
                        <strong>Shortcuts:</strong> Space pause/resume · Enter/→ next turn · ← previous player · Ctrl/Cmd+Z undo
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
