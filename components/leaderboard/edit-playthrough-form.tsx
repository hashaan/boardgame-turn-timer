"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Trash2, UserPlus, Loader2, CheckCircle, Edit, Calendar } from "lucide-react"
import type { Player } from "@/types/leaderboard"
import { getOrdinalSuffix } from "@/utils/leaderboard-utils"

interface EditPlaythroughFormProps {
  playthrough: any
  existingPlayers: Player[]
  onSubmit: (results: { playerName: string; rank: number }[], date?: string) => Promise<void>
  onCancel: () => void
}

interface PlayerRankInput {
  id: string
  playerName: string
  rank: string
  isNewPlayer: boolean
  leaderId?: string
  finalVp?: number
  finalResourcesSpice?: number
  finalResourcesSolari?: number
  finalResourcesWater?: number
  finalResourcesTroops?: number
  cardsTrashed?: number
  finalDeckSize?: number
  strategicArchetypeId?: string
}

export const EditPlaythroughForm = ({ playthrough, existingPlayers, onSubmit, onCancel }: EditPlaythroughFormProps) => {
  // Helper to format date from ISO string to YYYY-MM-DD format
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [playerRanks, setPlayerRanks] = useState<PlayerRankInput[]>([])
  const [gameDate, setGameDate] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState<{ [key: string]: boolean }>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [leaders, setLeaders] = useState<any[]>([])
  const [archetypes, setArchetypes] = useState<any[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)

  // Initialize form with existing playthrough data
  useEffect(() => {
    if (playthrough?.results) {
      console.log("Initializing edit form with playthrough data:", playthrough)

      // Initialize date from playthrough timestamp
      if (playthrough.timestamp) {
        setGameDate(formatDateForInput(playthrough.timestamp))
      }

      const initialRanks = playthrough.results
        .sort((a: any, b: any) => a.rank - b.rank)
        .map((result: any) => {
          console.log("Processing result for initialization:", result)

          return {
            id: crypto.randomUUID(),
            playerName: result.playerName,
            rank: result.rank.toString(),
            isNewPlayer: !existingPlayers.some((p) => p.name.toLowerCase() === result.playerName.toLowerCase()),
            // Prepopulate advanced stats - check multiple field name formats
            leaderId: result.leaderId || result.leader_id || "",
            finalVp: result.finalVp || result.final_vp || result.victory_points || undefined,
            finalResourcesSpice:
              result.finalResourcesSpice || result.final_resources_spice || result.spice || undefined,
            finalResourcesSolari:
              result.finalResourcesSolari || result.final_resources_solari || result.solari || undefined,
            finalResourcesWater:
              result.finalResourcesWater || result.final_resources_water || result.water || undefined,
            finalResourcesTroops:
              result.finalResourcesTroops || result.final_resources_troops || result.troops || undefined,
            cardsTrashed: result.cardsTrashed || result.cards_trashed || undefined,
            finalDeckSize: result.finalDeckSize || result.final_deck_size || result.cards_in_deck || undefined,
            strategicArchetypeId: result.strategicArchetypeId || result.strategic_archetype_id || "",
          }
        })

      console.log("Initialized player ranks:", initialRanks)
      setPlayerRanks(initialRanks)
    }
  }, [playthrough, existingPlayers])

  // Load leaders and archetypes for Dune games
  useEffect(() => {
    const loadData = async () => {
      if (playthrough?.game_type !== "dune") {
        setLeadersLoading(false)
        return
      }

      try {
        // Add cache-busting query parameter to force fresh data
        const timestamp = new Date().getTime()
        const [leadersRes, archetypesRes] = await Promise.all([
          fetch(`/api/leaders?t=${timestamp}`, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }),
          fetch("/api/strategic-archetypes"),
        ])

        if (leadersRes.ok) {
          const leadersData = await leadersRes.json()
          console.log(`[Edit Form] Loaded ${leadersData.data?.length || 0} leaders`)
          setLeaders(leadersData.data || [])
        }

        if (archetypesRes.ok) {
          const archetypesData = await archetypesRes.json()
          setArchetypes(archetypesData.data || [])
        }
      } catch (error) {
        console.error("Failed to load leaders/archetypes:", error)
      } finally {
        setLeadersLoading(false)
      }
    }

    loadData()
  }, [playthrough])

  const handlePlayerRankChange = (
    index: number,
    field:
      | "playerName"
      | "rank"
      | "leaderId"
      | "finalVp"
      | "finalResourcesSpice"
      | "finalResourcesSolari"
      | "finalResourcesWater"
      | "cardsTrashed"
      | "finalDeckSize"
      | "strategicArchetypeId"
      | "finalResourcesTroops",
    value: string | number | undefined,
  ) => {
    const updatedRanks = [...playerRanks]
    updatedRanks[index] = {
      ...updatedRanks[index],
      [field]: value,
      isNewPlayer:
        field === "playerName"
          ? !existingPlayers.some((p) => p.name.toLowerCase() === (value as string).toLowerCase())
          : updatedRanks[index].isNewPlayer,
    }
    setPlayerRanks(updatedRanks)
    setError(null) // Clear error when user makes changes
  }

  // Helper function to parse number input, allowing 0 as a valid value
  const parseNumberInput = (value: string): number | undefined => {
    if (value === "" || value.trim() === "") return undefined
    const parsed = Number.parseInt(value, 10)
    return isNaN(parsed) ? undefined : parsed
  }

  const selectExistingPlayer = (index: number, player: Player) => {
    const updatedRanks = [...playerRanks]
    updatedRanks[index] = {
      ...updatedRanks[index],
      playerName: player.name,
      isNewPlayer: false,
    }
    setPlayerRanks(updatedRanks)
    setShowPlayerSuggestions((prev) => ({ ...prev, [updatedRanks[index].id]: false }))
  }

  const addPlayerField = () => {
    const nextRank = playerRanks.length + 1
    setPlayerRanks([
      ...playerRanks,
      {
        id: crypto.randomUUID(),
        playerName: "",
        rank: nextRank.toString(),
        isNewPlayer: true,
      },
    ])
  }

  const removePlayerField = (index: number) => {
    if (playerRanks.length <= 1) {
      setError("Must have at least one player.")
      return
    }
    const updatedRanks = playerRanks.filter((_, i) => i !== index)
    const reassignedRanks = updatedRanks.map((player, i) => ({
      ...player,
      rank: (i + 1).toString(),
    }))
    setPlayerRanks(reassignedRanks)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitSuccess(false)

    const results: { playerName: string; rank: number }[] = []
    const playerNames = new Set<string>()
    const ranks = new Set<number>()

    for (const playerRank of playerRanks) {
      if (!playerRank.playerName.trim()) {
        setError("All player names must be filled.")
        return
      }
      if (playerNames.has(playerRank.playerName.trim().toLowerCase())) {
        setError("Player names must be unique for a single playthrough.")
        return
      }
      playerNames.add(playerRank.playerName.trim().toLowerCase())

      const rank = Number.parseInt(playerRank.rank, 10)
      if (isNaN(rank) || rank < 1) {
        setError(`Invalid rank for ${playerRank.playerName}. Must be a positive number.`)
        return
      }
      if (ranks.has(rank)) {
        setError(`Rank ${getOrdinalSuffix(rank)} is assigned to multiple players. Each rank must be unique.`)
        return
      }
      ranks.add(rank)

      const result: any = {
        playerName: playerRank.playerName.trim(),
        rank,
      }

      // Add advanced stats for Dune games
      if (playthrough?.game_type === "dune") {
        if (playerRank.leaderId) result.leaderId = playerRank.leaderId
        if (playerRank.finalVp !== undefined) result.finalVp = playerRank.finalVp
        if (playerRank.finalResourcesSpice !== undefined) result.finalResourcesSpice = playerRank.finalResourcesSpice
        if (playerRank.finalResourcesSolari !== undefined) result.finalResourcesSolari = playerRank.finalResourcesSolari
        if (playerRank.finalResourcesWater !== undefined) result.finalResourcesWater = playerRank.finalResourcesWater
        if (playerRank.finalResourcesTroops !== undefined) result.finalResourcesTroops = playerRank.finalResourcesTroops
        if (playerRank.cardsTrashed !== undefined) result.cardsTrashed = playerRank.cardsTrashed
        if (playerRank.finalDeckSize !== undefined) result.finalDeckSize = playerRank.finalDeckSize
        if (playerRank.strategicArchetypeId) result.strategicArchetypeId = playerRank.strategicArchetypeId
      }

      results.push(result)
    }

    if (results.length === 0) {
      setError("Please add at least one player's rank.")
      return
    }

    const sortedRanks = [...ranks].sort((a, b) => a - b)
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        setError("Ranks must be consecutive starting from 1st place.")
        return
      }
    }

    setSubmitting(true)
    try {
      console.log("Updating playthrough with results:", results, "date:", gameDate)
      await onSubmit(results, gameDate)

      // Show success state briefly
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        onCancel() // Close the form after successful update
      }, 1500)
    } catch (err: any) {
      console.error("Error updating playthrough:", err)
      setError(err.message || "Failed to update playthrough. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const getRankOptions = () => {
    return Array.from({ length: playerRanks.length }, (_, i) => i + 1)
  }

  const getFilteredPlayerSuggestions = (currentName: string) => {
    if (!currentName.trim()) return existingPlayers
    return existingPlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(currentName.toLowerCase()) &&
        !playerRanks.some((pr) => pr.playerName.toLowerCase() === player.name.toLowerCase()),
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Edit className="mr-2 h-5 w-5" />
          Edit Playthrough
        </CardTitle>
        <CardDescription>
          Update player names and rankings for this playthrough from{" "}
          {new Date(playthrough.timestamp).toLocaleDateString()}.
          {playthrough?.game_type === "dune" && (
            <span className="block text-blue-600 font-medium mt-1">
              Dune: Imperium - Advanced stats will be preserved
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="grid gap-1.5">
            <Label htmlFor="game-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Game Date
            </Label>
            <Input
              id="game-date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              disabled={submitting}
              className="w-full max-w-xs"
              required
            />
            <p className="text-xs text-muted-foreground">Select the date when this game was played</p>
          </div>

          {playerRanks.map((playerRank, index) => {
            const suggestions = getFilteredPlayerSuggestions(playerRank.playerName)
            const showSuggestions = showPlayerSuggestions[playerRank.id] && suggestions.length > 0

            return (
              <div key={playerRank.id} className="space-y-2">
                <div className="flex items-end gap-3 p-3 border rounded-md bg-slate-50/50">
                  <div className="grid gap-1.5 flex-grow relative">
                    <Label htmlFor={`playerName-${index}`}>
                      Player Name
                      {playerRank.isNewPlayer && playerRank.playerName && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          <UserPlus className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id={`playerName-${index}`}
                      value={playerRank.playerName}
                      onChange={(e) => handlePlayerRankChange(index, "playerName", e.target.value)}
                      onFocus={() => setShowPlayerSuggestions((prev) => ({ ...prev, [playerRank.id]: true }))}
                      onBlur={() =>
                        setTimeout(() => setShowPlayerSuggestions((prev) => ({ ...prev, [playerRank.id]: false })), 200)
                      }
                      placeholder="e.g., Alice"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-1.5 w-32">
                    <Label htmlFor={`rank-${index}`}>Final Rank</Label>
                    <Select
                      value={playerRank.rank}
                      onValueChange={(value) => handlePlayerRankChange(index, "rank", value)}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getRankOptions().map((rank) => (
                          <SelectItem key={rank} value={rank.toString()}>
                            {getOrdinalSuffix(rank)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {playthrough?.game_type === "dune" && (
                    <div className="grid gap-1.5 w-32">
                      <Label htmlFor={`leader-${index}`}>Leader</Label>
                      {leadersLoading ? (
                        <div className="flex items-center justify-center h-10">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <Select
                          value={playerRank.leaderId || "default"}
                          onValueChange={(value) => handlePlayerRankChange(index, "leaderId", value)}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Leader" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">No Leader</SelectItem>
                            {leaders.map((leader) => (
                              <SelectItem key={leader.id} value={leader.id}>
                                {leader.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePlayerField(index)}
                    disabled={playerRanks.length <= 1 || submitting}
                    aria-label="Remove player"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                {/* Player Suggestions */}
                {showSuggestions && (
                  <div className="ml-3 mr-16 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {suggestions.slice(0, 5).map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0 text-sm"
                        onMouseDown={() => selectExistingPlayer(index, player)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{player.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            Existing
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {playthrough?.game_type === "dune" && (
                  <div className="col-span-full mt-4 p-3 bg-slate-50 rounded-md">
                    <h4 className="text-sm font-medium mb-3 flex items-center">
                      Advanced Stats (Optional)
                      {(playerRank.finalVp || playerRank.finalResourcesSpice || playerRank.leaderId) && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Has Data
                        </Badge>
                      )}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`vp-${index}`} className="text-xs">
                          Victory Points
                        </Label>
                        <Input
                          id={`vp-${index}`}
                          type="number"
                          value={playerRank.finalVp ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(index, "finalVp", parseNumberInput(e.target.value))
                          }
                          placeholder="VP"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`spice-${index}`} className="text-xs">
                          Spice
                        </Label>
                        <Input
                          id={`spice-${index}`}
                          type="number"
                          value={playerRank.finalResourcesSpice ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(
                              index,
                              "finalResourcesSpice",
                              parseNumberInput(e.target.value),
                            )
                          }
                          placeholder="Spice"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`solari-${index}`} className="text-xs">
                          Solari
                        </Label>
                        <Input
                          id={`solari-${index}`}
                          type="number"
                          value={playerRank.finalResourcesSolari ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(
                              index,
                              "finalResourcesSolari",
                              parseNumberInput(e.target.value),
                            )
                          }
                          placeholder="Solari"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`water-${index}`} className="text-xs">
                          Water
                        </Label>
                        <Input
                          id={`water-${index}`}
                          type="number"
                          value={playerRank.finalResourcesWater ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(
                              index,
                              "finalResourcesWater",
                              parseNumberInput(e.target.value),
                            )
                          }
                          placeholder="Water"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`troops-${index}`} className="text-xs">
                          Troops
                        </Label>
                        <Input
                          id={`troops-${index}`}
                          type="number"
                          value={playerRank.finalResourcesTroops ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(
                              index,
                              "finalResourcesTroops",
                              parseNumberInput(e.target.value),
                            )
                          }
                          placeholder="Troops"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`trashed-${index}`} className="text-xs">
                          Cards Trashed
                        </Label>
                        <Input
                          id={`trashed-${index}`}
                          type="number"
                          value={playerRank.cardsTrashed ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(index, "cardsTrashed", parseNumberInput(e.target.value))
                          }
                          placeholder="Trashed"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`deck-${index}`} className="text-xs">
                          Deck Size
                        </Label>
                        <Input
                          id={`deck-${index}`}
                          type="number"
                          value={playerRank.finalDeckSize ?? ""}
                          onChange={(e) =>
                            handlePlayerRankChange(index, "finalDeckSize", parseNumberInput(e.target.value))
                          }
                          placeholder="Deck"
                          className="h-8 text-sm"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label htmlFor={`archetype-${index}`} className="text-xs">
                        Strategic Archetype
                      </Label>
                      <Select
                        value={playerRank.strategicArchetypeId || "default"}
                        onValueChange={(value) => handlePlayerRankChange(index, "strategicArchetypeId", value)}
                        disabled={submitting}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">No Strategy</SelectItem>
                          {archetypes.map((archetype) => (
                            <SelectItem key={archetype.id} value={archetype.id}>
                              {archetype.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" size="sm" onClick={addPlayerField} disabled={submitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Player
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || submitSuccess}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Updated!
                  </>
                ) : (
                  "Update Playthrough"
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {submitting && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-600 flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating playthrough and refreshing leaderboard...
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
