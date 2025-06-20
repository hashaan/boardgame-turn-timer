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

    const hasVictoryPoints = result.victory_points || result.finalVp || result.final_vp
    const hasResources =
      result.spice !== undefined ||
      result.finalResourcesSpice !== undefined ||
      result.final_resources_spice !== undefined ||
      result.solari !== undefined ||
      result.finalResourcesSolari !== undefined ||
      result.final_resources_solari !== undefined ||
      result.water !== undefined ||
      result.finalResourcesWater !== undefined ||
      result.final_resources_water !== undefined ||
      result.troops !== undefined ||
      result.finalResourcesTroops !== undefined ||
      result.final_resources_troops !== undefined

    const hasDeckStats =
      result.cards_trashed !== undefined ||
      result.cardsTrashed !== undefined ||
      result.cards_in_deck !== undefined ||
      result.finalDeckSize !== undefined ||
      result.final_deck_size !== undefined

    const hasArchetype = result.strategic_archetype || result.strategic_archetype_name

    if (!hasVictoryPoints && !hasResources && !hasDeckStats && !hasArchetype) {
      return (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
          No advanced stats recorded for this player
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Victory Points */}
        {hasVictoryPoints && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center text-amber-700">
              <Trophy className="w-4 h-4 mr-2" />
              Victory Points: {hasVictoryPoints}
            </h4>
          </div>
        )}

        {/* Resources */}
        {hasResources && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-slate-700">Resources</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(result.spice !== undefined ||
                result.finalResourcesSpice !== undefined ||
                result.final_resources_spice !== undefined) && (
                <div className="flex items-center">
                  <Flame className="w-3 h-3 mr-1 text-orange-500" />
                  <span>Spice: {result.spice ?? result.finalResourcesSpice ?? result.final_resources_spice}</span>
                </div>
              )}
              {(result.solari !== undefined ||
                result.finalResourcesSolari !== undefined ||
                result.final_resources_solari !== undefined) && (
                <div className="flex items-center">
                  <Coins className="w-3 h-3 mr-1 text-yellow-500" />
                  <span>Solari: {result.solari ?? result.finalResourcesSolari ?? result.final_resources_solari}</span>
                </div>
              )}
              {(result.water !== undefined ||
                result.finalResourcesWater !== undefined ||
                result.final_resources_water !== undefined) && (
                <div className="flex items-center">
                  <Droplets className="w-3 h-3 mr-1 text-blue-500" />
                  <span>Water: {result.water ?? result.finalResourcesWater ?? result.final_resources_water}</span>
                </div>
              )}
              {(result.troops !== undefined ||
                result.finalResourcesTroops !== undefined ||
                result.final_resources_troops !== undefined) && (
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1 text-red-500" />
                  <span>Troops: {result.troops ?? result.finalResourcesTroops ?? result.final_resources_troops}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deck Statistics */}
        {hasDeckStats && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center text-slate-700">
              <Cards className="w-4 h-4 mr-2" />
              Deck Stats
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              {(result.cards_trashed !== undefined || result.cardsTrashed !== undefined) && (
                <div>Cards Trashed: {result.cards_trashed ?? result.cardsTrashed}</div>
              )}
              {(result.cards_in_deck !== undefined ||
                result.finalDeckSize !== undefined ||
                result.final_deck_size !== undefined) && (
                <div>Final Deck Size: {result.cards_in_deck ?? result.finalDeckSize ?? result.final_deck_size}</div>
              )}
            </div>
          </div>
        )}

        {/* Strategic Archetype */}
        {hasArchetype && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center text-slate-700">
              <Zap className="w-4 h-4 mr-2" />
              Strategy
            </h4>
            <Badge variant="outline" className="text-xs">
              {result.strategic_archetype || result.strategic_archetype_name}
            </Badge>
          </div>
        )}
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
                        {victoryPoints && (
                          <div className="flex items-center text-sm font-semibold text-amber-700">
                            <Trophy className="w-4 h-4 mr-1" />
                            {victoryPoints} VP
                          </div>
                        )}
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
