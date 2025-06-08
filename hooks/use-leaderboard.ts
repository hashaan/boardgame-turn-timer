"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  Group,
  Game,
  Player,
  Playthrough,
  PlayerRanking,
  GameLeaderboard,
  GroupOverview,
} from "@/types/leaderboard"
import { groupApi, gameApi, playerApi, playthroughApi } from "@/lib/api"

export const useLeaderboard = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [loading, setLoading] = useState(false)

  // Load initial data
  useEffect(() => {
    loadGroups()
  }, [])

  // Load games and players when group is selected
  useEffect(() => {
    if (selectedGroupId) {
      loadGamesForGroup(selectedGroupId)
      loadPlayersForGroup(selectedGroupId)
    } else {
      setGames([])
      setPlayers([])
      setSelectedGameId(null)
    }
  }, [selectedGroupId])

  // Load playthroughs when game is selected
  useEffect(() => {
    if (selectedGameId) {
      loadPlaythroughsForGame(selectedGameId)
    } else {
      setPlaythroughs([])
    }
  }, [selectedGameId])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const response = await groupApi.getGroups()
      if (response.success && response.data) {
        setGroups(response.data)
      } else {
        console.error("Failed to load groups:", response.error)
      }
    } catch (error) {
      console.error("Failed to load groups:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadGamesForGroup = async (groupId: string) => {
    try {
      const response = await gameApi.getGamesForGroup(groupId)
      if (response.success && response.data) {
        setGames(response.data)
      } else {
        console.error("Failed to load games:", response.error)
      }
    } catch (error) {
      console.error("Failed to load games:", error)
    }
  }

  const loadPlayersForGroup = async (groupId: string) => {
    try {
      const response = await playerApi.getPlayersForGroup(groupId)
      if (response.success && response.data) {
        setPlayers(response.data)
      } else {
        console.error("Failed to load players:", response.error)
      }
    } catch (error) {
      console.error("Failed to load players:", error)
    }
  }

  const loadPlaythroughsForGame = async (gameId: string) => {
    try {
      const response = await playthroughApi.getPlaythroughsForGame(gameId)
      if (response.success && response.data) {
        setPlaythroughs(response.data)
      } else {
        console.error("Failed to load playthroughs:", response.error)
      }
    } catch (error) {
      console.error("Failed to load playthroughs:", error)
    }
  }

  const createGroup = async (name: string, description?: string): Promise<Group> => {
    const response = await groupApi.createGroup(name, description)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to create group")
    }

    await loadGroups() // Refresh groups list
    return response.data
  }

  const joinGroup = async (code: string): Promise<Group> => {
    const response = await groupApi.joinGroup(code)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to join group")
    }

    await loadGroups() // Refresh groups list
    return response.data
  }

  const createGame = async (groupId: string, name: string): Promise<Game> => {
    const response = await gameApi.createGame(groupId, name)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to create game")
    }

    await loadGamesForGroup(groupId) // Refresh games list
    return response.data
  }

  const addPlaythrough = async (
    gameId: string,
    results: { playerName: string; rank: number }[],
  ): Promise<Playthrough> => {
    const response = await playthroughApi.createPlaythrough(gameId, results)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to create playthrough")
    }

    await loadPlaythroughsForGame(gameId) // Refresh playthroughs
    if (selectedGroupId) {
      await loadPlayersForGroup(selectedGroupId) // Refresh players in case new ones were added
    }
    return response.data
  }

  const getLeaderboardForGame = useCallback(
    (gameId: string | null): GameLeaderboard | null => {
      if (!gameId) return null

      const game = games.find((g) => g.id === gameId)
      if (!game) return null

      const gamePlaythroughs = playthroughs.filter((p) => p.game_id === gameId)
      const playerStats: Record<
        string,
        {
          playerId: string
          playerName: string
          chips: number[]
          rankCounts: PlayerRanking["rankCounts"]
          totalPlaythroughs: number
        }
      > = {}

      gamePlaythroughs.forEach((playthrough) => {
        if (playthrough.results && Array.isArray(playthrough.results)) {
          playthrough.results.forEach((result: any) => {
            if (!playerStats[result.playerId]) {
              playerStats[result.playerId] = {
                playerId: result.playerId,
                playerName: result.playerName,
                chips: [],
                rankCounts: { first: 0, second: 0, third: 0, fourth: 0, other: 0 },
                totalPlaythroughs: 0,
              }
            }
            playerStats[result.playerId].chips.push(result.rank)
            playerStats[result.playerId].totalPlaythroughs++
            if (result.rank === 1) playerStats[result.playerId].rankCounts.first++
            else if (result.rank === 2) playerStats[result.playerId].rankCounts.second++
            else if (result.rank === 3) playerStats[result.playerId].rankCounts.third++
            else if (result.rank === 4) playerStats[result.playerId].rankCounts.fourth++
            else playerStats[result.playerId].rankCounts.other++
          })
        }
      })

      let rankedPlayers: PlayerRanking[] = Object.values(playerStats).map((stats) => ({
        playerId: stats.playerId,
        playerName: stats.playerName,
        chips: stats.chips,
        rankCounts: stats.rankCounts,
        totalPlaythroughs: stats.totalPlaythroughs,
      }))

      // Sort players for overall ranking
      rankedPlayers.sort((a, b) => {
        if (a.rankCounts.first !== b.rankCounts.first) return b.rankCounts.first - a.rankCounts.first
        if (a.rankCounts.second !== b.rankCounts.second) return b.rankCounts.second - a.rankCounts.second
        if (a.rankCounts.third !== b.rankCounts.third) return b.rankCounts.third - a.rankCounts.third
        if (a.rankCounts.fourth !== b.rankCounts.fourth) return b.rankCounts.fourth - a.rankCounts.fourth
        if (a.totalPlaythroughs !== b.totalPlaythroughs) return a.totalPlaythroughs - b.totalPlaythroughs
        return a.playerName.localeCompare(b.playerName)
      })

      rankedPlayers = rankedPlayers.map((player, index) => ({ ...player, overallRank: index + 1 }))

      return { game, rankings: rankedPlayers }
    },
    [games, playthroughs],
  )

  const getGroupOverview = useCallback(
    (groupId: string | null): GroupOverview | null => {
      if (!groupId) return null

      const group = groups.find((g) => g.id === groupId)
      if (!group) return null

      const groupGames = games.filter((g) => g.group_id === groupId)
      const groupPlayers = players.filter((p) => p.group_id === groupId)
      const groupPlaythroughs = playthroughs.filter((p) => p.group_id === groupId)

      return {
        group,
        games: groupGames,
        totalPlayers: groupPlayers.length,
        totalPlaythroughs: groupPlaythroughs.length,
      }
    },
    [groups, games, players, playthroughs],
  )

  const currentLeaderboard = getLeaderboardForGame(selectedGameId)
  const currentGroupOverview = getGroupOverview(selectedGroupId)
  const currentGroupPlayers = selectedGroupId ? players.filter((p) => p.group_id === selectedGroupId) : []

  return {
    // State
    groups,
    games,
    selectedGroupId,
    selectedGameId,
    loading,

    // Computed
    currentLeaderboard,
    currentGroupOverview,
    currentGroupPlayers,

    // Actions
    createGroup,
    joinGroup,
    createGame,
    addPlaythrough,
    setSelectedGroupId,
    setSelectedGameId,
  }
}
