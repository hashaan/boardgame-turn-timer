"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Crown, Users, BarChart3, Calendar } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

interface Leader {
  id: string
  name: string
  faction: string
}

interface StrategicArchetype {
  id: string
  name: string
  description: string
}

interface PlayerResult {
  playerName: string
  rank: number
  leaderId?: string
  finalVp?: number
  finalResourcesSpice?: number
  finalResourcesSolari?: number
  finalResourcesWater?: number
  finalResourcesTroops?: number
  cardsTrashed?: number
  finalDeckSize?: number
  strategicArchetypeId?: string
  playerId?: string
}

interface EnhancedAddPlaythroughFormProps {
  game: any
  players: any[]
  onSubmit: (results: PlayerResult[], date?: string) => void
  onCancel: () => void
}

const factionIcons: Record<string, string> = {
  "Spacing Guild": "🚀",
  Fremen: "🏜️",
  "House Harkonnen": "⚔️",
  "Bene Gesserit": "🔮",
  Ixians: "⚙️",
  "House Atreides": "🦅",
  Emperor: "👑",
}

export const EnhancedAddPlaythroughForm = ({ game, players, onSubmit, onCancel }: EnhancedAddPlaythroughFormProps) => {
  // Initialize date to today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [results, setResults] = useState<PlayerResult[]>([{ playerName: "", rank: 1 }])
  const [gameDate, setGameDate] = useState<string>(getTodayDate())
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [archetypes, setArchetypes] = useState<StrategicArchetype[]>([])
  const [loading, setLoading] = useState(false)
  const [leadersLoading, setLeadersLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("basic")
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState<{ [key: string]: boolean }>({})

  const selectExistingPlayer = (index: number, player: any) => {
    const newResults = [...results]
    newResults[index] = {
      ...newResults[index],
      playerName: player.name,
    }
    setResults(newResults)
    setShowPlayerSuggestions((prev) => ({ ...prev, [`player-${index}`]: false }))
  }

  const getFilteredPlayerSuggestions = (currentName: string) => {
    if (!currentName.trim()) return players
    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(currentName.toLowerCase()) &&
        !results.some((r) => r.playerName.toLowerCase() === player.name.toLowerCase()),
    )
  }

  // Load leaders and archetypes
  useEffect(() => {
    const loadData = async () => {
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
          console.log(`[Enhanced Form] Loaded ${leadersData.data?.length || 0} leaders`)
          setLeaders(leadersData.data || [])
        } else {
          console.error("Failed to fetch leaders:", leadersRes.status, leadersRes.statusText)
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
  }, [])

  const addPlayer = () => {
    setResults([...results, { playerName: "", rank: results.length + 1 }])
  }

  const removePlayer = (index: number) => {
    const newResults = results.filter((_, i) => i !== index)
    // Reassign ranks
    const updatedResults = newResults.map((result, i) => ({
      ...result,
      rank: i + 1,
    }))
    setResults(updatedResults)
  }

  const updatePlayer = (index: number, field: keyof PlayerResult, value: any) => {
    const newResults = [...results]
    newResults[index] = { ...newResults[index], [field]: value }
    setResults(newResults)
  }

  // Helper function to parse number input, allowing 0 as a valid value
  const parseNumberInput = (value: string): number | undefined => {
    if (value === "" || value.trim() === "") return undefined
    const parsed = Number.parseInt(value, 10)
    return isNaN(parsed) ? undefined : parsed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (results.some((r) => !r.playerName.trim())) {
      alert("Please fill in all player names")
      return
    }

    setLoading(true)
    try {
      // Resolve player IDs for existing players
      const resultsWithPlayerIds = results.map((result) => {
        const existingPlayer = players.find((p) => p.name.toLowerCase() === result.playerName.trim().toLowerCase())
        return {
          ...result,
          playerId: existingPlayer?.id || result.playerName.trim(), // Use ID if found, otherwise use name
          playerName: result.playerName.trim(),
        }
      })

      await onSubmit(resultsWithPlayerIds, gameDate)
      // Reset form
      setResults([{ playerName: "", rank: 1 }])
      setGameDate(getTodayDate())
      setActiveTab("basic")
    } catch (error) {
      console.error("Failed to submit playthrough:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group leaders by faction
  const leadersByFaction = leaders.reduce(
    (acc, leader) => {
      if (!acc[leader.faction]) acc[leader.faction] = []
      acc[leader.faction].push(leader)
      return acc
    },
    {} as Record<string, Leader[]>,
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="w-5 h-5 mr-2 text-amber-500" />
          Add Dune: Imperium Playthrough
        </CardTitle>
        <CardDescription>Record a game with enhanced statistics and leader tracking</CardDescription>
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
              disabled={loading}
              className="w-full max-w-xs"
              required
            />
            <p className="text-xs text-muted-foreground">Select the date when this game was played</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Advanced Stats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                      {result.rank}
                    </div>

                    <div className="flex-1 relative">
                      <Label htmlFor={`player-${index}`}>Player Name</Label>
                      <Input
                        id={`player-${index}`}
                        value={result.playerName}
                        onChange={(e) => updatePlayer(index, "playerName", e.target.value)}
                        onFocus={() => setShowPlayerSuggestions((prev) => ({ ...prev, [`player-${index}`]: true }))}
                        onBlur={() =>
                          setTimeout(
                            () => setShowPlayerSuggestions((prev) => ({ ...prev, [`player-${index}`]: false })),
                            200,
                          )
                        }
                        placeholder="e.g., Alice"
                        required
                        disabled={loading}
                      />

                      {/* Player Suggestions Dropdown */}
                      {showPlayerSuggestions[`player-${index}`] &&
                        getFilteredPlayerSuggestions(result.playerName).length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto z-10">
                            {getFilteredPlayerSuggestions(result.playerName)
                              .slice(0, 5)
                              .map((player) => (
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
                    </div>

                    <div className="flex-1">
                      <Label htmlFor={`leader-${index}`}>Leader</Label>
                      {leadersLoading ? (
                        <div className="flex items-center justify-center h-10">
                          <Spinner size="sm" />
                        </div>
                      ) : (
                        <Select
                          value={result.leaderId || "no-leader"}
                          onValueChange={(value) => updatePlayer(index, "leaderId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select leader" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(leadersByFaction).map(([faction, factionLeaders]) => (
                              <div key={faction}>
                                <div className="px-2 py-1 text-sm font-semibold text-muted-foreground flex items-center">
                                  <span className="mr-2">{factionIcons[faction]}</span>
                                  {faction}
                                </div>
                                {factionLeaders.map((leader) => (
                                  <SelectItem key={leader.id} value={leader.id}>
                                    {leader.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {results.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removePlayer(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addPlayer} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Player
              </Button>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-bold mr-3">
                        {result.rank}
                      </div>
                      <h4 className="font-semibold">{result.playerName || `Player ${index + 1}`}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`vp-${index}`}>Victory Points</Label>
                        <Input
                          id={`vp-${index}`}
                          type="number"
                          value={result.finalVp ?? ""}
                          onChange={(e) => updatePlayer(index, "finalVp", parseNumberInput(e.target.value))}
                          placeholder="Final VP"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`archetype-${index}`}>Strategy</Label>
                        <Select
                          value={result.strategicArchetypeId || "no-archetype"}
                          onValueChange={(value) => updatePlayer(index, "strategicArchetypeId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select strategy" />
                          </SelectTrigger>
                          <SelectContent>
                            {archetypes.map((archetype) => (
                              <SelectItem key={archetype.id} value={archetype.id}>
                                {archetype.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`spice-${index}`}>Spice</Label>
                        <Input
                          id={`spice-${index}`}
                          type="number"
                          value={result.finalResourcesSpice ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "finalResourcesSpice", parseNumberInput(e.target.value))
                          }
                          placeholder="Final spice"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`solari-${index}`}>Solari</Label>
                        <Input
                          id={`solari-${index}`}
                          type="number"
                          value={result.finalResourcesSolari ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "finalResourcesSolari", parseNumberInput(e.target.value))
                          }
                          placeholder="Final solari"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`water-${index}`}>Water</Label>
                        <Input
                          id={`water-${index}`}
                          type="number"
                          value={result.finalResourcesWater ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "finalResourcesWater", parseNumberInput(e.target.value))
                          }
                          placeholder="Final water"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`troops-${index}`}>Troops</Label>
                        <Input
                          id={`troops-${index}`}
                          type="number"
                          value={result.finalResourcesTroops ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "finalResourcesTroops", parseNumberInput(e.target.value))
                          }
                          placeholder="Final troops"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`trashed-${index}`}>Cards Trashed</Label>
                        <Input
                          id={`trashed-${index}`}
                          type="number"
                          value={result.cardsTrashed ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "cardsTrashed", parseNumberInput(e.target.value))
                          }
                          placeholder="Cards trashed"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`deck-${index}`}>Final Deck Size</Label>
                        <Input
                          id={`deck-${index}`}
                          type="number"
                          value={result.finalDeckSize ?? ""}
                          onChange={(e) =>
                            updatePlayer(index, "finalDeckSize", parseNumberInput(e.target.value))
                          }
                          placeholder="Deck size"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex space-x-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Recording...
                </>
              ) : (
                "Record Playthrough"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
