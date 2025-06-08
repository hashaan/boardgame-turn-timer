import { Badge } from "@/components/ui/badge"
import { getOrdinalSuffix } from "@/utils/leaderboard-utils"

interface RankChipProps {
  rank: number
}

export const RankChip = ({ rank }: RankChipProps) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
  let colorClass = ""

  if (rank === 1) {
    variant = "default" // Gold-like
    colorClass = "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500"
  } else if (rank === 2) {
    variant = "default" // Silver-like
    colorClass = "bg-gray-300 hover:bg-gray-400 text-gray-800 border-gray-400"
  } else if (rank === 3) {
    variant = "default" // Bronze-like
    colorClass = "bg-orange-400 hover:bg-orange-500 text-orange-900 border-orange-500"
  } else if (rank === 4) {
    variant = "secondary"
    colorClass = "border-slate-400 text-slate-600"
  }

  return (
    <Badge variant={variant} className={`px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
      {getOrdinalSuffix(rank)}
    </Badge>
  )
}
