import { AVAILABLE_COLORS } from "@/constants"
import type { ColorOption } from "@/types"

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export const getPlayerColors = (color: string): ColorOption => {
  console.log(color)
  return AVAILABLE_COLORS.find((c) => c.value === color) || AVAILABLE_COLORS[0]
}

export const getTurnProgressColor = (secondsUsed: number): string => {
  if (secondsUsed < 30) {
    return "bg-green-500"
  } else if (secondsUsed < 50) {
    return "bg-yellow-500"
  } else {
    return "bg-red-500"
  }
}
