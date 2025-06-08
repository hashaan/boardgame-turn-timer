"use client"

import type React from "react"

import { useState } from "react"
import type { Game } from "@/types/leaderboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Gamepad2, PlusSquare, Key, Copy, Check } from "lucide-react"
import { formatGameCode } from "@/utils/game-code-utils"
import { toast } from "sonner"

interface GameSelectorProps {
  games: Game[]
  selectedGameId: string | null
  onSelectGame: (gameId: string) => void
  onAddGame: (name: string, isPublic?: boolean) => Game | undefined
  onJoinGame: (code: string) => Game | undefined
}

export const GameSelector = ({ games, selectedGameId, onSelectGame, onAddGame, onJoinGame }: GameSelectorProps) => {
  const [newGameName, setNewGameName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null)

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newGameName.trim()) {
      setError("Game name cannot be empty.")
      return
    }
    try {
      const newGame = onAddGame(newGameName.trim(), false) // Private by default
      if (newGame) {
        onSelectGame(newGame.id)
        setNewGameName("")
        toast.success(`Game "${newGame.name}" created! Share code: ${formatGameCode(newGame.code)}`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to add game.")
    }
  }

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!gameCode.trim()) {
      setError("Game code cannot be empty.")
      return
    }
    try {
      const game = onJoinGame(gameCode.trim())
      if (game) {
        onSelectGame(game.id)
        setGameCode("")
        toast.success(`Joined game "${game.name}"!`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to join game.")
    }
  }

  const copyGameCode = async (code: string, gameId: string) => {
    try {
      await navigator.clipboard.writeText(formatGameCode(code))
      setCopiedGameId(gameId)
      toast.success("Game code copied to clipboard!")
      setTimeout(() => setCopiedGameId(null), 2000)
    } catch (err) {
      toast.error("Failed to copy game code")
    }
  }

  const selectedGame = games.find((g) => g.id === selectedGameId)

  return (
    <div className="mb-8">
      <Tabs defaultValue="select" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="select">Select Game</TabsTrigger>
          <TabsTrigger value="create">Create Game</TabsTrigger>
          <TabsTrigger value="join">Join Game</TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gamepad2 className="mr-2 h-5 w-5" />
                Your Games
              </CardTitle>
              <CardDescription>Select a game to view its leaderboard or manage playthroughs.</CardDescription>
            </CardHeader>
            <CardContent>
              {games.length > 0 ? (
                <div className="space-y-4">
                  <Select value={selectedGameId || undefined} onValueChange={onSelectGame}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a game..." />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{game.name}</span>
                            {game.isPublic && (
                              <Badge variant="secondary" className="ml-2">
                                Public
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedGame && (
                    <div className="p-3 bg-slate-50 rounded-md border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedGame.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Game Code:{" "}
                            <code className="bg-slate-200 px-1 rounded">{formatGameCode(selectedGame.code)}</code>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyGameCode(selectedGame.code, selectedGame.id)}
                        >
                          {copiedGameId === selectedGame.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No games available. Create a new game or join an existing one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlusSquare className="mr-2 h-5 w-5" />
                Create New Game
              </CardTitle>
              <CardDescription>
                Create a private game with a unique access code that you can share with others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGame} className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-game-name">Game Name</Label>
                  <Input
                    id="new-game-name"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    placeholder="e.g., Wingspan Tournament"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Game
                </Button>
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Join Existing Game
              </CardTitle>
              <CardDescription>Enter a 6-character game code to join an existing leaderboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinGame} className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="game-code">Game Code</Label>
                  <Input
                    id="game-code"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                    placeholder="e.g., ABC-123 or ABC123"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Format: ABC-123 (dashes are optional)</p>
                </div>
                <Button type="submit" className="w-full">
                  Join Game
                </Button>
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
