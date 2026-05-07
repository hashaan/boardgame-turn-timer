"use client"

import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MobileCardNavigationProps {
  currentIndex: number
  totalCards: number
  onPrevious: () => void
  onNext: () => void
  isActivePlayer?: boolean
  isSwitchedMode?: boolean
  turnPlayerName?: string | null
  clockPlayerName?: string | null
  gameStarted?: boolean
  isRunning?: boolean
  isPaused?: boolean
}

export const MobileCardNavigation = ({
  currentIndex,
  totalCards,
  onPrevious,
  onNext,
  isActivePlayer = false,
  gameStarted = false,
  isRunning = false,
  isPaused = false,
}: MobileCardNavigationProps) => {
  const buttonStyle =
    "border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-white/10 dark:text-zinc-500 dark:hover:bg-white/[0.05] dark:hover:text-zinc-300"

  return (
    <div className="mb-4 flex items-center justify-between lg:hidden">
      <Button
        onClick={onPrevious}
        variant="outline"
        size="sm"
        className={`transition-all duration-200 ${buttonStyle}`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="ml-1">Previous</span>
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalCards }, (_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "scale-125 bg-amber-600 dark:bg-amber-400/50" : "bg-amber-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {gameStarted && (
          <Badge
            variant="outline"
            className={`text-xs font-normal ${
              isPaused
                ? "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400"
                : isActivePlayer && isRunning
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/15 dark:bg-emerald-950/25 dark:text-emerald-200/75"
                  : isActivePlayer
                    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/15 dark:bg-amber-950/20 dark:text-amber-100/80"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-500"
            }`}
          >
            {isPaused ? (
              <>
                <Pause className="mr-1 h-3 w-3" />
                Paused
              </>
            ) : isActivePlayer ? (
              <>
                <Play className="mr-1 h-3 w-3" />
                Active
              </>
            ) : (
              <>Selected</>
            )}
          </Badge>
        )}
      </div>

      <Button
        onClick={onNext}
        variant="outline"
        size="sm"
        className={`transition-all duration-200 ${buttonStyle}`}
      >
        <span className="mr-1">Next Turn</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
