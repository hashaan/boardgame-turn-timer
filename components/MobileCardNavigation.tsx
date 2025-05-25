"use client"

import { ChevronLeft, ChevronRight, Play, Eye, UserCheck, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MobileCardNavigationProps {
  currentIndex: number
  totalCards: number
  onPrevious: () => void
  onNext: () => void
  isActivePlayer?: boolean
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
  const getButtonText = (direction: "next" | "previous") => {
    if (isPaused) {
      return direction === "next" ? "Next Player" : "Prev Player"
    }
    if (isActivePlayer && gameStarted && isRunning) {
      return direction === "next" ? "Next Turn" : "Prev Turn"
    }
    return direction === "next" ? "Next Card" : "Prev Card"
  }

  const getButtonIcon = (direction: "next" | "previous") => {
    if (isPaused) {
      return <UserCheck className="w-4 h-4" />
    }
    if (isActivePlayer && gameStarted && isRunning) {
      return <Play className="w-4 h-4" />
    }
    return direction === "next" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
  }

  const getButtonStyle = () => {
    if (isPaused) {
      return "bg-blue-100 border-blue-500 text-blue-700 font-medium"
    }
    if (isActivePlayer && gameStarted && isRunning) {
      return "bg-amber-100 border-amber-500 text-amber-700 font-medium"
    }
    return "border-amber-400 text-amber-700 hover:bg-amber-50"
  }

  return (
    <div className="flex items-center justify-between mb-4 lg:hidden">
      <Button
        onClick={onPrevious}
        variant="outline"
        size="sm"
        className={`transition-all duration-200 ${getButtonStyle()}`}
      >
        {getButtonIcon("previous")}
        <span className="ml-1">{getButtonText("previous")}</span>
      </Button>

      <div className="flex items-center gap-3">
        {/* Card Position Indicators */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalCards }, (_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-amber-600 scale-125" : "bg-amber-300"
              }`}
            />
          ))}
        </div>

        {/* Enhanced Status Badge */}
        {gameStarted && (
          <Badge
            variant="outline"
            className={`text-xs ${
              isPaused
                ? "border-blue-500 text-blue-700 bg-blue-50"
                : isActivePlayer && isRunning
                  ? "border-green-500 text-green-700 bg-green-50"
                  : isActivePlayer
                    ? "border-amber-500 text-amber-700 bg-amber-50"
                    : "border-gray-400 text-gray-600 bg-gray-50"
            }`}
          >
            {isPaused ? (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Select Player
              </>
            ) : isActivePlayer && isRunning ? (
              <>
                <Play className="w-3 h-3 mr-1" />
                Active Turn
              </>
            ) : isActivePlayer ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Active Player
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Viewing
              </>
            )}
          </Badge>
        )}
      </div>

      <Button
        onClick={onNext}
        variant="outline"
        size="sm"
        className={`transition-all duration-200 ${getButtonStyle()}`}
      >
        <span className="mr-1">{getButtonText("next")}</span>
        {getButtonIcon("next")}
      </Button>
    </div>
  )
}
