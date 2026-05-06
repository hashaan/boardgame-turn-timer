"use client"

import { useState, useEffect, useMemo } from "react"
import { useLeaderboard } from "@/hooks/use-leaderboard"
import { AddPlaythroughForm } from "@/components/leaderboard/add-playthrough-form"
import { EnhancedAddPlaythroughForm } from "@/components/leaderboard/enhanced-add-playthrough-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Trophy, ChevronDown, ChevronUp, LogIn, Crown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface PlaythroughFormSectionProps {
  defaultOpen?: boolean
}

export function PlaythroughFormSection({ defaultOpen = false }: PlaythroughFormSectionProps) {
  const {
    groups,
    games,
    currentGroupPlayers,
    addPlaythrough,
    loading: leaderboardLoading,
    setSelectedGroupId: setHookSelectedGroupId,
    selectedGroupId: hookSelectedGroupId,
  } = useLeaderboard()

  const [showPlaythroughForm, setShowPlaythroughForm] = useState(defaultOpen)
  const [formSelectedGroupId, setFormSelectedGroupId] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  useEffect(() => {
    if (defaultOpen) setShowPlaythroughForm(true)
  }, [defaultOpen])

  // Sync form group selection with hook to trigger game loading
  useEffect(() => {
    if (formSelectedGroupId && formSelectedGroupId !== hookSelectedGroupId) {
      setHookSelectedGroupId(formSelectedGroupId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSelectedGroupId, hookSelectedGroupId])

  // Find Dune games in user's groups
  const duneGames = useMemo(() => {
    return games.filter((game) => game.game_type === "dune")
  }, [games])

  // Auto-select first group if available (when form is opened or groups are loaded)
  useEffect(() => {
    if (groups.length > 0 && !formSelectedGroupId) {
      // Prefer hook's selected group if it exists, otherwise use first group
      if (hookSelectedGroupId && groups.some((g) => g.id === hookSelectedGroupId)) {
        setFormSelectedGroupId(hookSelectedGroupId)
      } else {
        setFormSelectedGroupId(groups[0].id)
      }
    }
  }, [groups, formSelectedGroupId, hookSelectedGroupId])

  // Update selected game when group changes and games are loaded
  useEffect(() => {
    if (formSelectedGroupId) {
      // First try to find a Dune game in the selected group
      const groupDuneGame = duneGames.find((game) => game.group_id === formSelectedGroupId)
      if (groupDuneGame && groupDuneGame.id !== selectedGameId) {
        setSelectedGameId(groupDuneGame.id)
      } else if (!groupDuneGame) {
        // If no Dune game found, clear selection
        setSelectedGameId(null)
      }
    }
  }, [formSelectedGroupId, duneGames, selectedGameId])

  // Handle playthrough submission (for basic form)
  const handleAddPlaythrough = async (
    gameId: string,
    results: { playerName: string; rank: number }[],
    date?: string,
  ) => {
    try {
      await addPlaythrough(gameId, results, date)
      toast.success("Playthrough recorded successfully!")
      setShowPlaythroughForm(false)
    } catch (e: any) {
      toast.error(e.message || "Error recording playthrough.")
      throw e
    }
  }

  // Handle enhanced playthrough submission (for Dune games)
  const handleEnhancedPlaythrough = async (results: any[], date?: string) => {
    if (!selectedGameId) return
    try {
      await addPlaythrough(selectedGameId, results, date)
      toast.success("Playthrough recorded successfully!")
      setShowPlaythroughForm(false)
    } catch (e: any) {
      toast.error(e.message || "Error recording playthrough.")
      throw e
    }
  }

  // Get players for selected group
  const availablePlayers = useMemo(() => {
    if (!formSelectedGroupId) return []
    return currentGroupPlayers.filter((p) => p.group_id === formSelectedGroupId)
  }, [formSelectedGroupId, currentGroupPlayers])

  // Get selected game details (check all games, not just Dune games)
  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null
    return games.find((g) => g.id === selectedGameId) || duneGames.find((g) => g.id === selectedGameId)
  }, [selectedGameId, games, duneGames])

  // Check if selected game is a Dune game
  const isDuneGame = selectedGame?.game_type === "dune"

  // Don't render if user is not in any groups
  if (groups.length === 0) {
    return null
  }

  return (
    <Card className="mb-5 border border-amber-200/80 bg-white/45 text-amber-950 shadow-none dark:border-white/[0.08] dark:[background-image:none] dark:bg-zinc-900/45 dark:text-zinc-200">
      <Collapsible open={showPlaythroughForm} onOpenChange={setShowPlaythroughForm}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-3 transition-colors hover:bg-amber-50/80 dark:hover:bg-white/[0.04] md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-500/35" />
                <CardTitle className="text-sm font-semibold dark:text-zinc-200 md:text-base">Log Playthrough</CardTitle>
                {!showPlaythroughForm && (
                  <span className="hidden text-xs text-amber-700/70 dark:text-zinc-500 md:inline">Shown after finish</span>
                )}
              </div>
              {showPlaythroughForm ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-amber-700 dark:text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-amber-700 dark:text-zinc-500" />
              )}
            </div>
            {showPlaythroughForm && (
              <CardDescription className="text-xs dark:text-zinc-500">
                Record final results and Dune stats for the completed game.
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {groups.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-zinc-500">Select Group</label>
                <Select value={formSelectedGroupId || ""} onValueChange={setFormSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formSelectedGroupId && (
              <>
                {leaderboardLoading ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>Loading games...</p>
                  </div>
                ) : selectedGameId && selectedGame ? (
                  isDuneGame ? (
                    <div>
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-zinc-900/40 dark:border-white/[0.06]">
                        <div className="flex items-center text-amber-800 dark:text-zinc-300">
                          <Crown className="w-5 h-5 mr-2 dark:text-amber-500/30" />
                          <span className="font-semibold">Enhanced Dune: Imperium Tracking</span>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-zinc-500 mt-1">
                          Record detailed statistics including leader selection, victory points, resources, and strategic
                          archetypes.
                        </p>
                      </div>
                      <EnhancedAddPlaythroughForm
                        game={selectedGame}
                        players={availablePlayers}
                        onSubmit={handleEnhancedPlaythrough}
                        onCancel={() => setShowPlaythroughForm(false)}
                      />
                    </div>
                  ) : (
                    <AddPlaythroughForm
                      gameId={selectedGameId}
                      gameName={selectedGame.name}
                      existingPlayers={availablePlayers}
                      onSubmit={(results, date) => handleAddPlaythrough(selectedGameId, results, date)}
                    />
                  )
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 space-y-2">
                    <p>No Dune: Imperium game found in this group.</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/leaderboard">
                        <LogIn className="w-4 h-4 mr-2" />
                        Go to Leaderboard to create one
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

