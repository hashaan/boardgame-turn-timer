"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Crown,
  Trophy,
  Coins,
  Droplets,
  Users,
  Sword,
  Target,
  WalletCardsIcon as Cards,
  Zap,
  TrendingUp,
  Star,
  Shield,
  Flame,
} from "lucide-react"
import { AdvancedStatsTest } from "./advanced-stats-test"

interface PlaythroughDetailsProps {
  playthrough: any
  gameType?: string
}

export const PlaythroughDetails = ({ playthrough, gameType }: PlaythroughDetailsProps) => {
  console.log("PlaythroughDetails - Full playthrough data:", JSON.stringify(playthrough, null, 2))
  console.log("PlaythroughDetails - Game type:", gameType)

  const isDuneGame = gameType === "dune"

  // Helper function to get leader icon
  const getLeaderIcon = (leaderName: string) => {
    const leaderIcons: Record<string, any> = {
      "Paul Atreides": Crown,
      "Lady Jessica": Star,
      "Gurney Halleck": Sword,
      "Duncan Idaho": Shield,
      Stilgar: Droplets,
      Chani: Target,
      "Liet Kynes": TrendingUp,
      "Count Fenring": Coins,
    }
    return leaderIcons[leaderName] || Crown
  }

  // Helper function to format advanced stats
  const formatAdvancedStats = (result: any) => {
    console.log("formatAdvancedStats - Individual result:", JSON.stringify(result, null, 2))

    if (!result) return null

    const victoryPoints = result.victory_points ?? result.finalVp ?? result.final_vp ?? null
    const spice = result.spice ?? result.finalResourcesSpice ?? result.final_resources_spice ?? null
    const solari = result.solari ?? result.finalResourcesSolari ?? result.final_resources_solari ?? null
    const water = result.water ?? result.finalResourcesWater ?? result.final_resources_water ?? null
    const troops = result.troops ?? result.finalResourcesTroops ?? result.final_resources_troops ?? null
    const cardsTrashed = result.cards_trashed ?? result.cardsTrashed ?? null
    const finalDeckSize = result.cards_in_deck ?? result.finalDeckSize ?? result.final_deck_size ?? null
    const archetype = result.strategic_archetype ?? result.strategic_archetype_name ?? null

    const hasAnyStats = victoryPoints !== null || spice !== null || solari !== null || water !== null || 
                        troops !== null || cardsTrashed !== null || finalDeckSize !== null || archetype !== null

    if (!hasAnyStats) {
      return (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
          No advanced stats recorded for this player
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Victory Points */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center text-amber-700">
            <Trophy className="w-4 h-4 mr-2" />
            {victoryPoints !== null ? `${victoryPoints} VP` : <span className="text-muted-foreground italic">VP: <span className="text-slate-400">not set</span></span>}
          </h4>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-700">Resources</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <Flame className="w-3 h-3 mr-1 text-orange-500" />
              {spice !== null ? (
                <span>Spice: {spice}</span>
              ) : (
                <span className="text-muted-foreground italic">Spice: <span className="text-slate-400">not set</span></span>
              )}
            </div>
            <div className="flex items-center">
              <Coins className="w-3 h-3 mr-1 text-yellow-500" />
              {solari !== null ? (
                <span>Solari: {solari}</span>
              ) : (
                <span className="text-muted-foreground italic">Solari: <span className="text-slate-400">not set</span></span>
              )}
            </div>
            <div className="flex items-center">
              <Droplets className="w-3 h-3 mr-1 text-blue-500" />
              {water !== null ? (
                <span>Water: {water}</span>
              ) : (
                <span className="text-muted-foreground italic">Water: <span className="text-slate-400">not set</span></span>
              )}
            </div>
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1 text-red-500" />
              {troops !== null ? (
                <span>Troops: {troops}</span>
              ) : (
                <span className="text-muted-foreground italic">Troops: <span className="text-slate-400">not set</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Deck Statistics */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center text-slate-700">
            <Cards className="w-4 h-4 mr-2" />
            Deck Stats
          </h4>
          <div className="text-xs space-y-1">
            <div>
              {cardsTrashed !== null ? (
                <>Cards Trashed: {cardsTrashed}</>
              ) : (
                <span className="text-muted-foreground italic">Cards Trashed: <span className="text-slate-400">not set</span></span>
              )}
            </div>
            <div>
              {finalDeckSize !== null ? (
                <>Final Deck Size: {finalDeckSize}</>
              ) : (
                <span className="text-muted-foreground italic">Final Deck Size: <span className="text-slate-400">not set</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Strategic Archetype */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center text-slate-700">
            <Zap className="w-4 h-4 mr-2" />
            Strategy
          </h4>
          {archetype ? (
            <Badge variant="outline" className="text-xs">
              {archetype}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">Strategy: <span className="text-slate-400">not set</span></span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="mt-3 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Game Summary */}
          <div>
            <h3 className="font-semibold text-base mb-2 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-amber-500" />
              Game Summary
            </h3>
            <div className="text-sm text-muted-foreground">
              <div>Players: {playthrough.results.length}</div>
              <div>Date: {new Date(playthrough.timestamp).toLocaleDateString()}</div>
              <div>Time: {new Date(playthrough.timestamp).toLocaleTimeString([], { timeStyle: "short" })}</div>
              {isDuneGame && <div className="text-blue-600 font-medium">Dune: Imperium (Enhanced Stats)</div>}
            </div>
          </div>

          <Separator />

          {/* Player Results with Advanced Stats */}
          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2 text-slate-600" />
              Player Results
            </h3>
            <div className="space-y-3">
              {playthrough.results
                .sort((a: any, b: any) => a.rank - b.rank)
                .map((result: any, index: number) => {
                  const leaderName = result.leader || result.leader_name
                  const LeaderIcon = leaderName ? getLeaderIcon(leaderName) : Crown
                  const victoryPoints = result.victory_points || result.finalVp || result.final_vp

                  return (
                    <div
                      key={`${playthrough.id}-${result.playerId}-${index}`}
                      className={`p-3 rounded-lg border ${
                        result.rank === 1
                          ? "bg-amber-50 border-amber-200"
                          : result.rank === 2
                            ? "bg-slate-50 border-slate-200"
                            : result.rank === 3
                              ? "bg-orange-50 border-orange-200"
                              : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {/* Player Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant={result.rank === 1 ? "default" : "outline"}
                            className={
                              result.rank === 1
                                ? "bg-amber-500 hover:bg-amber-600"
                                : result.rank === 2
                                  ? "border-gray-400 text-gray-700"
                                  : result.rank === 3
                                    ? "border-orange-400 text-orange-700"
                                    : ""
                            }
                          >
                            #{result.rank}
                          </Badge>
                          <span className="font-medium">{result.playerName}</span>
                          {leaderName && (
                            <div className="flex items-center text-sm text-slate-600">
                              <LeaderIcon className="w-4 h-4 mr-1" />
                              {leaderName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-sm font-semibold text-amber-700">
                          <Trophy className="w-4 h-4 mr-1" />
                          {victoryPoints !== null && victoryPoints !== undefined ? (
                            <span>{victoryPoints} VP</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">VP: <span className="text-slate-400">not set</span></span>
                          )}
                        </div>
                      </div>

                      {/* Advanced Stats for Dune Games */}
                      {isDuneGame && formatAdvancedStats(result)}

                      {/* Basic stats for non-Dune games */}
                      {!isDuneGame && result.score && (
                        <div className="text-sm text-muted-foreground">Score: {result.score}</div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Additional Game Notes */}
          {playthrough.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-base mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{playthrough.notes}</p>
              </div>
            </>
          )}
        </div>
        {/* Development Test Panel */}
        {process.env.NODE_ENV === "development" && <AdvancedStatsTest playthrough={playthrough} gameType={gameType} />}
      </CardContent>
    </Card>
  )
}
