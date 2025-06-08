import type { PlayerRanking } from "@/types/leaderboard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { RankChip } from "./rank-chip"
import { Trophy, ListChecks } from "lucide-react"
import { getOrdinalSuffix } from "@/utils/leaderboard-utils"

interface PlayerRankingCardProps {
  playerRanking: PlayerRanking
}

export const PlayerRankingCard = ({ playerRanking }: PlayerRankingCardProps) => {
  return (
    <Card className="w-full transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-medium">{playerRanking.playerName}</CardTitle>
        {playerRanking.overallRank && (
          <div className="flex items-center text-sm font-bold text-amber-600">
            <Trophy className="w-5 h-5 mr-1" />
            {getOrdinalSuffix(playerRanking.overallRank)}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <CardDescription className="mb-1 text-xs">Rank History (Chips):</CardDescription>
          {playerRanking.chips.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {playerRanking.chips.map((rank, index) => (
                <RankChip key={index} rank={rank} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No playthroughs recorded yet.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-sm text-foreground">{playerRanking.rankCounts.first}</p>
            <p>1st Place</p>
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{playerRanking.rankCounts.second}</p>
            <p>2nd Place</p>
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{playerRanking.rankCounts.third}</p>
            <p>3rd Place</p>
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{playerRanking.rankCounts.fourth}</p>
            <p>4th Place</p>
          </div>
        </div>
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          <ListChecks className="w-3 h-3 mr-1" />
          Total Playthroughs: {playerRanking.totalPlaythroughs}
        </div>
      </CardContent>
    </Card>
  )
}
