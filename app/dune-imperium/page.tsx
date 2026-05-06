"use client"

import type React from "react"
import { useGameTimer } from "@/hooks/useGameTimer"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useOrientation } from "@/hooks/useOrientation"
import { Header } from "@/components/Header"
import { SettingsPanel } from "@/components/SettingsPanel"
import { ControlPanel } from "@/components/ControlPanel"
import { PlayerCard } from "@/components/PlayerCard"
import { GameInfo } from "@/components/GameInfo"
import { MobileCardNavigation } from "@/components/MobileCardNavigation"
import { PlaythroughFormSection } from "@/components/leaderboard/playthrough-form-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Home, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Toaster, toast } from "sonner"
import { useHostRoomSync } from "@/hooks/useHostRoomSync"

const TIMER_DARK_STORAGE_KEY = "dune-imperium-timer-dark"

export default function DuneImperiumTimer() {
    const {
        hydrated,
        // State
        players,
        isRunning,
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
        activePlayer,
        currentPlayerIndex,
        canUndo,
        isTransitioning,
        slideDirection,
        // Computed values
        getCurrentTurnTime,
        getActivePlayersCount,
        // Actions
        startPauseTimer,
        switchToPlayer,
        reopenPlayerTurn,
        nextTurn,
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
        // Setters
        setInitialTime,
        setShowSettings,
        setShowAdjustButtons,
        setShowColorSelectors,
        setSoundEnabled,
        setEditingPlayer,
        setEditName,
        setManualNavigation,
        setCurrentPlayerIndex,
        syncSignal,
    } = useGameTimer()

    const { roomCode } = useHostRoomSync({
        syncSignal,
        snapshotInputs: {
            players,
            currentRound,
            roundPhase,
            isRunning,
            gameStarted,
        },
        onNextTurn: nextTurn,
        onPauseResume: startPauseTimer,
        onRevealTurn: startRevealTurn,
        onMarkPlayerRevealed: markPlayerRevealed,
    })

    const isLandscape = useOrientation()

    const [timerDark, setTimerDark] = useState(() => {
        if (typeof window === "undefined") return false
        return window.localStorage.getItem(TIMER_DARK_STORAGE_KEY) === "1"
    })

    const [showPlaythroughLog, setShowPlaythroughLog] = useState(false)
    const playthroughLogRef = useRef<HTMLDivElement | null>(null)

    const toggleTimerDark = () => {
        setTimerDark((prev) => {
            const next = !prev
            window.localStorage.setItem(
                TIMER_DARK_STORAGE_KEY,
                next ? "1" : "0",
            )
            return next
        })
    }

    // Add new state for next player index
    const [nextPlayerIndex, setNextPlayerIndex] = useState(currentPlayerIndex)

    // Update currentPlayerIndex after transition is complete
    useEffect(() => {
        if (!isTransitioning) {
            setCurrentPlayerIndex(nextPlayerIndex)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTransitioning, nextPlayerIndex])

    useKeyboardShortcuts({
        onNextTurn: nextTurn,
        onToggleTimer: startPauseTimer,
        onUndo: undoLastAction,
        gameStarted,
    })

    if (!hydrated) return null

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleStartEdit = (playerId: number, currentName: string) => {
        setEditingPlayer(playerId)
        setEditName(currentName)
    }

    // Enhanced mobile view detection
    const isMobileView =
        typeof window !== "undefined" &&
        window.innerWidth < 1024 &&
        !isLandscape

    // Updated mobile navigation handlers to use nextPlayerIndex for transitions
    const handleMobileNext = () => {
        const currentPlayer = players[currentPlayerIndex]
        const isPaused = gameStarted && !isRunning

        if (isPaused) {
            // Directly set nextPlayerIndex for paused state
            setNextPlayerIndex((currentPlayerIndex + 1) % players.length)
            return
        }

        if (currentPlayer?.isActive && gameStarted && isRunning) {
            // Set nextPlayerIndex before calling nextTurn
            setNextPlayerIndex((currentPlayerIndex + 1) % players.length)
            console.log("mobile next turn")
            nextTurn()
        }
    }

    const handleMobilePrevious = () => {
        const currentPlayer = players[currentPlayerIndex]
        const isPaused = gameStarted && !isRunning

        if (isPaused) {
            // Directly set nextPlayerIndex for paused state
            setNextPlayerIndex(
                (currentPlayerIndex - 1 + players.length) % players.length,
            )
            return
        }

        if (currentPlayer?.isActive && gameStarted && isRunning) {
            undoLastAction()
        }
    }

    const focusPlayerCard = (playerId: number) => {
        const index = players.findIndex((player) => player.id === playerId)
        if (index === -1) return
        setNextPlayerIndex(index)
        setCurrentPlayerIndex(index)
    }

    const handleManualSwitch = (playerId: number) => {
        switchToPlayer(playerId)
        toast.message("Manual switch — no +1:00 added", {
            description: "Use Next Turn for normal turn advancement.",
        })
    }


    const handleFinishGameAndLog = () => {
        setShowPlaythroughLog(true)
        toast.success("Game finished — log the playthrough when ready.")
        window.setTimeout(() => {
            playthroughLogRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            })
        }, 50)
    }

    return (
        <div className={cn(timerDark && "dark")}>
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-3 md:p-4 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_90%_60%_at_50%_-8%,rgba(251,191,36,0.06),transparent_52%)]">
                <Toaster richColors />
                <div className="max-w-6xl mx-auto">
                    {/* Navigation Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <Button
                            asChild
                            variant="ghost"
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.05]"
                        >
                            <Link href="/">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={toggleTimerDark}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-100"
                                aria-label={
                                    timerDark
                                        ? "Use light timer theme"
                                        : "Use dark timer theme"
                                }
                                title={timerDark ? "Light mode" : "Dark mode"}
                            >
                                {timerDark ? (
                                    <Sun className="w-4 h-4" />
                                ) : (
                                    <Moon className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-100"
                            >
                                <Link href="/">
                                    <Home className="w-4 h-4 mr-2" />
                                    Home
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-100"
                            >
                                <Link href="/leaderboard">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Leaderboard
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Header
                        currentTurnTime={getCurrentTurnTime()}
                        currentRound={currentRound}
                        activePlayersCount={getActivePlayersCount()}
                        roundPhase={roundPhase}
                    />

                    <SettingsPanel
                        showSettings={showSettings || !gameStarted}
                        gameStarted={gameStarted}
                        initialTime={initialTime}
                        showAdjustButtons={showAdjustButtons}
                        showColorSelectors={showColorSelectors}
                        soundEnabled={soundEnabled}
                        onInitialTimeChange={setInitialTime}
                        onToggleAdjustButtons={() =>
                            setShowAdjustButtons(!showAdjustButtons)
                        }
                        onToggleColorSelectors={() =>
                            setShowColorSelectors(!showColorSelectors)
                        }
                        onToggleSound={() => setSoundEnabled(!soundEnabled)}
                    />

                    <ControlPanel
                        isRunning={isRunning}
                        gameStarted={gameStarted}
                        roundPhase={roundPhase}
                        currentRound={currentRound}
                        activePlayer={activePlayer}
                        timerDark={timerDark}
                        onStartPause={startPauseTimer}
                        onNextTurn={nextTurn}
                        onStartReveal={startRevealTurn}
                        canUndo={canUndo}
                        onUndo={undoLastAction}
                        onEndRound={endRound}
                        onFinishGameAndLog={handleFinishGameAndLog}
                        onReset={resetGame}
                        onToggleSettings={() => setShowSettings(!showSettings)}
                        roomCode={roomCode}
                    />

                    {showPlaythroughLog && (
                        <div ref={playthroughLogRef} className="scroll-mt-4">
                            <PlaythroughFormSection defaultOpen />
                        </div>
                    )}

                    {isMobileView ? (
                        <div className="lg:hidden">
                            <MobileCardNavigation
                                currentIndex={currentPlayerIndex}
                                totalCards={players.length}
                                onPrevious={handleMobilePrevious}
                                onNext={handleMobileNext}
                                isActivePlayer={
                                    players[currentPlayerIndex]?.isActive
                                }
                                gameStarted={gameStarted}
                                isRunning={isRunning}
                                isPaused={gameStarted && !isRunning}
                            />

                            <div className="relative h-[700px] overflow-hidden md:h-[640px]">
                                <div className="relative w-full h-full">
                                    {players.map((player, index) => {
                                        const offset =
                                            index - currentPlayerIndex
                                        const isActive =
                                            index === currentPlayerIndex

                                        let translateX = offset * 100
                                        if (isTransitioning && slideDirection) {
                                            if (slideDirection === "right") {
                                                translateX -= 100
                                            } else if (
                                                slideDirection === "left"
                                            ) {
                                                translateX += 100
                                            }
                                        }

                                        return (
                                            <div
                                                key={`mobile-card-${player.id}-${currentPlayerIndex}`}
                                                className={`absolute inset-0 transition-transform ${
                                                    isTransitioning
                                                        ? "duration-500 ease-out"
                                                        : "duration-300 ease-in-out"
                                                }`}
                                                style={{
                                                    transform: `translateX(${translateX}%)`,
                                                    zIndex: isActive ? 20 : 10,
                                                    opacity:
                                                        Math.abs(offset) > 1
                                                            ? 0
                                                            : 1,
                                                }}
                                            >
                                                <div className="w-full h-full p-2">
                                                    <PlayerCard
                                                        player={player}
                                                        isActive={
                                                            player.isActive
                                                        }
                                                        currentTurnTime={getCurrentTurnTime()}
                                                        gameStarted={
                                                            gameStarted
                                                        }
                                                        isRunning={isRunning}
                                                        initialTime={
                                                            initialTime
                                                        }
                                                        showAdjustButtons={
                                                            showAdjustButtons
                                                        }
                                                        showColorSelectors={
                                                            showColorSelectors
                                                        }
                                                        editingPlayer={
                                                            editingPlayer
                                                        }
                                                        editName={editName}
                                                        roundPhase={roundPhase}
                                                        onPlayerClick={
                                                            focusPlayerCard
                                                        }
                                                        onManualSwitch={
                                                            handleManualSwitch
                                                        }
                                                        onReopenTurn={
                                                            reopenPlayerTurn
                                                        }
                                                        onDragStart={
                                                            handleDragStart
                                                        }
                                                        onDragOver={
                                                            handleDragOver
                                                        }
                                                        onDrop={handleDrop}
                                                        onAdjustTime={
                                                            adjustPlayerTime
                                                        }
                                                        onUpdateName={
                                                            updatePlayerName
                                                        }
                                                        onUpdateColor={
                                                            updatePlayerColor
                                                        }
                                                        onStartEdit={
                                                            handleStartEdit
                                                        }
                                                        onSetEditName={
                                                            setEditName
                                                        }
                                                        onTurnStageChange={
                                                            setPlayerTurnStage
                                                        }
                                                        onToggleSwordmaster={
                                                            togglePlayerSwordmaster
                                                        }
                                                        onAddTurn={
                                                            addPlayerTurn
                                                        }
                                                        onRemoveTurn={
                                                            removePlayerTurn
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                    {players.map((player, index) => (
                                        <div
                                            key={`mobile-indicator-${index}`}
                                            className={`relative transition-all duration-300 ${
                                                index === currentPlayerIndex
                                                    ? "scale-125"
                                                    : "hover:scale-110"
                                            }`}
                                        >
                                            <div
                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                    index === currentPlayerIndex
                                                        ? "bg-amber-600 shadow-lg ring-2 ring-amber-300 dark:bg-amber-400/70 dark:shadow-none dark:ring-1 dark:ring-amber-400/25"
                                                        : player.isActive
                                                          ? "bg-amber-400 shadow-md dark:bg-amber-500/35 dark:shadow-none"
                                                          : "bg-amber-200 hover:bg-amber-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                                                }`}
                                            />
                                            {player.isActive &&
                                                index !==
                                                    currentPlayerIndex && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 dark:bg-emerald-400/50 rounded-full animate-pulse" />
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 px-1 md:px-0">
                            {players.map((player) => (
                                <div
                                    key={`desktop-card-${player.id}`}
                                    className={`transition-all duration-300 ease-out ${
                                        player.isActive
                                            ? "transform scale-[1.02] md:scale-105 z-10 shadow-xl dark:shadow-[0_0_48px_-14px_rgba(251,191,36,0.12)]"
                                            : "transform scale-100 hover:scale-[1.01] z-0 hover:shadow-md dark:hover:shadow-none"
                                    }`}
                                    style={{
                                        transitionProperty:
                                            "transform, box-shadow, border-color",
                                        transitionTimingFunction:
                                            "cubic-bezier(0.4, 0, 0.2, 1)",
                                    }}
                                >
                                    <PlayerCard
                                        player={player}
                                        isActive={player.isActive}
                                        currentTurnTime={getCurrentTurnTime()}
                                        gameStarted={gameStarted}
                                        isRunning={isRunning}
                                        initialTime={initialTime}
                                        showAdjustButtons={showAdjustButtons}
                                        showColorSelectors={showColorSelectors}
                                        editingPlayer={editingPlayer}
                                        editName={editName}
                                        roundPhase={roundPhase}
                                        onPlayerClick={focusPlayerCard}
                                        onManualSwitch={handleManualSwitch}
                                        onReopenTurn={reopenPlayerTurn}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onAdjustTime={adjustPlayerTime}
                                        onUpdateName={updatePlayerName}
                                        onUpdateColor={updatePlayerColor}
                                        onStartEdit={handleStartEdit}
                                        onSetEditName={setEditName}
                                        onTurnStageChange={setPlayerTurnStage}
                                        onToggleSwordmaster={
                                            togglePlayerSwordmaster
                                        }
                                        onAddTurn={addPlayerTurn}
                                        onRemoveTurn={removePlayerTurn}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <GameInfo />
                </div>
            </div>
        </div>
    )
}
