import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { TimerPhase } from "@/types"

interface HeaderProps {
    currentTurnTime: number
    currentRound: number
    activePlayersCount: number
    roundPhase?: TimerPhase
}

export const Header = ({
    currentTurnTime,
    currentRound,
    activePlayersCount,
    roundPhase = "player-turns",
}: HeaderProps) => {
    const phaseLabel =
        roundPhase === "round-wrap-up" ? "Combat & Cleanup" : "Player Turns"

    return (
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2 tracking-tight dark:text-transparent dark:bg-gradient-to-br dark:from-zinc-100 dark:via-amber-100/85 dark:to-zinc-400 dark:bg-clip-text">
                DUNE: IMPERIUM
            </h1>
            <p className="text-xl text-amber-700 dark:text-zinc-500">
                Turn Timer
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Badge
                    variant="outline"
                    className="gap-1.5 border-amber-300 bg-amber-50/70 px-3 py-1 text-sm font-medium text-amber-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:font-normal"
                >
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500/45" />
                    <span className="font-mono tabular-nums">
                        Current Turn: {currentTurnTime}s
                    </span>
                </Badge>
                <Badge
                    variant="outline"
                    className="border-amber-300 bg-white/55 px-3 py-1 text-sm font-medium text-amber-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:font-normal"
                >
                    Round {currentRound}
                </Badge>
                <Badge
                    variant="outline"
                    className="border-amber-300 bg-white/55 px-3 py-1 text-sm font-medium text-amber-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:font-normal"
                >
                    {phaseLabel}
                </Badge>
                <Badge
                    variant="outline"
                    className="border-amber-400 bg-white/55 px-3 py-1 text-sm font-medium text-amber-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:font-normal"
                >
                    {activePlayersCount} active
                </Badge>
            </div>
        </div>
    )
}
