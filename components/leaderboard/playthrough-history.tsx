"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Calendar,
  Trash2,
  Users,
  Loader2,
  Edit,
  Crown,
  ChevronDown,
  ChevronRight,
  Eye,
  Trophy,
  Target,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { EditPlaythroughForm } from "./edit-playthrough-form"
import { PlaythroughDetails } from "./playthrough-details"
import { getOrdinalSuffix } from "@/utils/leaderboard-utils"
import type { Player } from "@/types/leaderboard"

interface PlaythroughHistoryProps {
  playthroughs: any[]
  gameId: string
  existingPlayers: Player[]
  currentSeasonId?: string
  gameType?: string
  onDeletePlaythrough: (playthroughId: string) => Promise<boolean>
  onUpdatePlaythrough: (playthroughId: string, results: any[]) => Promise<void>
  loading?: boolean
}

export const PlaythroughHistory = ({
  playthroughs,
  gameId,
  existingPlayers,
  currentSeasonId,
  gameType,
  onDeletePlaythrough,
  onUpdatePlaythrough,
  loading = false,
}: PlaythroughHistoryProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingPlaythrough, setEditingPlaythrough] = useState<any | null>(null)
  const [expandedPlaythrough, setExpandedPlaythrough] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirmDeleteId) return

    setDeletingId(confirmDeleteId)
    const success = await onDeletePlaythrough(confirmDeleteId)
    if (success) {
      setConfirmDeleteId(null)
    }
    setDeletingId(null)
  }

  const handleEdit = (playthrough: any) => {
    const playthroughWithGameType = {
      ...playthrough,
      game_type: gameType,
    }
    setEditingPlaythrough(playthroughWithGameType)
  }

  const handleUpdatePlaythrough = async (results: any[]) => {
    if (!editingPlaythrough) return
    await onUpdatePlaythrough(editingPlaythrough.id, results)
    setEditingPlaythrough(null)
  }

  const handleCancelEdit = () => {
    setEditingPlaythrough(null)
  }

  const toggleExpanded = (playthroughId: string) => {
    setExpandedPlaythrough(expandedPlaythrough === playthroughId ? null : playthroughId)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Spinner size="md" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Loading playthrough history...</p>
      </div>
    )
  }

  if (editingPlaythrough) {
    return (
      <EditPlaythroughForm
        playthrough={editingPlaythrough}
        existingPlayers={existingPlayers}
        onSubmit={handleUpdatePlaythrough}
        onCancel={handleCancelEdit}
      />
    )
  }

  if (playthroughs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Playthrough History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No playthroughs recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  // Group playthroughs by season
  const currentSeasonPlaythroughs = playthroughs.filter((p) => p.season_id === currentSeasonId)
  const pastSeasonPlaythroughs = playthroughs.filter((p) => p.season_id !== currentSeasonId)

  const renderPlaythroughCard = (playthrough: any, isPastSeason = false) => {
    const isExpanded = expandedPlaythrough === playthrough.id
    const isDuneGame = gameType === "dune"

    return (
      <div
        key={playthrough.id}
        className={`border rounded-lg transition-all duration-200 ${
          isPastSeason ? "bg-slate-50" : "bg-white"
        } ${isExpanded ? "shadow-md" : "hover:shadow-sm"}`}
      >
        {/* Main Card Content */}
        <div className={`p-4 ${isExpanded ? "pb-2" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(playthrough.timestamp).toLocaleDateString()} at{" "}
                {new Date(playthrough.timestamp).toLocaleTimeString([], { timeStyle: "short" })}
              </div>
              {isPastSeason && (
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                  <Crown className="w-3 h-3 mr-1" />
                  Past Season
                </Badge>
              )}
              {isDuneGame && (
                <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                  <Target className="w-3 h-3 mr-1" />
                  Enhanced Stats
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                onClick={() => toggleExpanded(playthrough.id)}
                disabled={!!deletingId}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => handleEdit(playthrough)}
                disabled={!!deletingId}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDeleteId(playthrough.id)}
                disabled={!!deletingId}
              >
                {deletingId === playthrough.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{playthrough.results.length} players</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              onClick={() => toggleExpanded(playthrough.id)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {isExpanded ? "Hide Details" : "View Details"}
            </Button>
          </div>

          {/* Quick Results Preview */}
          <div className="flex flex-wrap gap-2 mt-3">
            {playthrough.results
              .sort((a: any, b: any) => a.rank - b.rank)
              .slice(0, 3) // Show only top 3 in preview
              .map((result: any) => (
                <Badge
                  key={`${playthrough.id}-${result.playerId}`}
                  variant={result.rank === 1 ? "default" : "outline"}
                  className={`text-xs ${
                    result.rank === 1
                      ? "bg-amber-500 hover:bg-amber-600"
                      : result.rank === 2
                        ? "border-gray-400 text-gray-700"
                        : result.rank === 3
                          ? "border-orange-400 text-orange-700"
                          : ""
                  }`}
                >
                  {getOrdinalSuffix(result.rank)}: {result.playerName}
                  {result.victory_points && <span className="ml-1 opacity-75">({result.victory_points} VP)</span>}
                </Badge>
              ))}
            {playthrough.results.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{playthrough.results.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && <PlaythroughDetails playthrough={playthrough} gameType={gameType} />}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-amber-500" />
            Playthrough History
            <Badge variant="outline" className="ml-2 text-xs">
              {playthroughs.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Season Playthroughs */}
          {currentSeasonPlaythroughs.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-4 flex items-center">
                <Crown className="w-4 h-4 mr-2 text-amber-600" />
                Current Season ({currentSeasonPlaythroughs.length})
              </h3>
              <div className="space-y-3">
                {currentSeasonPlaythroughs.map((playthrough) => renderPlaythroughCard(playthrough, false))}
              </div>
            </div>
          )}

          {/* Past Season Playthroughs */}
          {pastSeasonPlaythroughs.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-4 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-slate-600" />
                Past Seasons ({pastSeasonPlaythroughs.length})
              </h3>
              <div className="space-y-3">
                {pastSeasonPlaythroughs.map((playthrough) => renderPlaythroughCard(playthrough, true))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playthrough</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this playthrough? This action cannot be undone and will permanently remove
              this record from the leaderboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={!!deletingId}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
