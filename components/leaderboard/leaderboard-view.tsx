"use client"

import type { GameLeaderboard } from "@/types/leaderboard"
import { AddPlaythroughForm } from "./add-playthrough-form"
import { PlayerRankingCard } from "./player-ranking-card"
import { BarChart3, Trophy, Lock, Users } from "lucide-react"

interface LeaderboardViewProps {
  leaderboardData: GameLeaderboard | null
  existingPlayers: any[]
  onAddPlaythrough: (gameId: string, results: any[]) => void
}

export const LeaderboardView = ({ leaderboardData, existingPlayers, onAddPlaythrough }: LeaderboardViewProps) => {
  if (!leaderboardData) {
    return (
      <div className="text-center py-10">
        <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Select a game to view its leaderboard or join a game using a code.</p>
      </div>
    )
  }

  const { game, rankings } = leaderboardData

  const handlePlaythroughSubmit = (results: any[]) => {
    onAddPlaythrough(game.id, results)
  }

  // Get the group information from the game data
  const groupCode = game.group_id ? "------" : "------" // We don't have direct access to group code here

  return (
    <div className="space-y-8">
      <header className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Trophy className="w-8 h-8 mr-3 text-amber-500" />
              {game.name} Leaderboard
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-sm text-muted-foreground">
                Game in group • Created {new Date(game.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {existingPlayers.length} registered players
            </div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-sky-600" />
            Player Rankings
          </h2>
          {rankings.length > 0 ? (
            <div className="space-y-4">
              {rankings.map((playerRanking) => (
                <PlayerRankingCard key={playerRanking.playerId} playerRanking={playerRanking} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No playthroughs recorded for this game yet. Add one below!</p>
          )}
        </section>

        <section className="sticky top-4">
          <AddPlaythroughForm
            gameId={game.id}
            gameName={game.name}
            existingPlayers={existingPlayers}
            onSubmit={handlePlaythroughSubmit}
          />
        </section>
      </div>
    </div>
  )
}
