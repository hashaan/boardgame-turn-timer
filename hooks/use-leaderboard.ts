"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type {
  Group,
  Game,
  Player,
  Playthrough,
  PlayerRanking,
  GameLeaderboard,
  GroupOverview,
} from "@/types/leaderboard"
import type { SeasonSummary } from "@/types/seasons"
import { groupApi, gameApi, playerApi, playthroughApi, seasonApi, leaderboardApi } from "@/lib/api"
import { groupStorage } from "@/lib/group-storage"
import { seedDuneReferenceData } from "@/lib/dune-reference-data"
import { track } from "@vercel/analytics/react"

const DEBUG_LEADERBOARD = process.env.NEXT_PUBLIC_DEBUG_LEADERBOARD === "true"

const debugLog = (...args: unknown[]) => {
  if (DEBUG_LEADERBOARD) console.log(...args)
}

const debugTime = (label: string) => {
  if (DEBUG_LEADERBOARD) console.time(label)
}

const debugTimeEnd = (label: string) => {
  if (DEBUG_LEADERBOARD) console.timeEnd(label)
}

type SeasonTopPlayer = SeasonSummary["topPlayers"][number]

const buildSeasonTopPlayers = (rankings: PlayerRanking[] | undefined): SeasonTopPlayer[] => {
  return (rankings ?? []).map((player) => {
    const totalGames = player.totalPlaythroughs
    const wins = player.rankCounts.first
    const winRate = totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(2)) : 0
    const averageRank =
      player.chips.length > 0
        ? Number((player.chips.reduce((sum, rank) => sum + rank, 0) / player.chips.length).toFixed(2))
        : 0

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      player_id: player.playerId,
      player_name: player.playerName,
      totalGames,
      games_played: totalGames,
      firstPlaces: wins,
      wins,
      winRate,
      win_rate_percentage: winRate,
      averageRank,
    }
  })
}


export const useLeaderboard = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [currentSeasonSummary, setCurrentSeasonSummary] = useState<SeasonSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [gameLoading, setGameLoading] = useState(false)
  const [playthroughLoading, setPlaythroughLoading] = useState(false)
  const [seasonLoading, setSeasonLoading] = useState(false)

  // Track page visit on mount
  useEffect(() => {
    track("page_visited", { page: "leaderboard" })
  }, [])

  // Load initial data
  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      loadLeaderboardInitialState(selectedGroupId, selectedGameId)
    } else {
      setGames([])
      setPlayers([])
      setPlaythroughs([])
      setSelectedGameId(null)
      setCurrentSeasonSummary(null)
    }
  }, [selectedGroupId, selectedGameId])

  const loadLeaderboardInitialState = async (groupId: string, gameId?: string | null) => {
    setGameLoading(true)
    setPlaythroughLoading(!!gameId)
    setSeasonLoading(!!gameId)

    try {
      debugTime("Load Leaderboard Initial State")
      const response = await leaderboardApi.getInitialState(groupId, gameId)
      debugTimeEnd("Load Leaderboard Initial State")

      if (!response.success || !response.data) {
        console.error("Failed to load leaderboard initial state:", response.error)
        track("error_occurred", {
          error_type: "load_leaderboard_initial_state_failed",
          error_message: response.error ?? "Unknown error",
        })
        return
      }

      const data = response.data
      setGames(data.games)
      setPlayers(data.players)
      setPlaythroughs(data.playthroughs)
      setCurrentSeasonSummary(data.currentSeasonSummary)
      seedDuneReferenceData({
        leaders: data.leaders.map((leader) => ({
          ...leader,
          faction: leader.faction ?? "",
        })),
        archetypes: data.strategicArchetypes.map((archetype) => ({
          ...archetype,
          description: archetype.description ?? undefined,
        })),
      })

      if ((data.selectedGameId ?? null) !== (gameId ?? null)) {
        setSelectedGameId(data.selectedGameId)
      }
    } catch (error) {
      console.error("Failed to load leaderboard initial state:", error)
      track("error_occurred", {
        error_type: "load_leaderboard_initial_state_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setGameLoading(false)
      setPlaythroughLoading(false)
      setSeasonLoading(false)
    }
  }

  const loadGroups = async () => {
    setLoading(true)
    try {
      debugTime("Load Groups")

      const allowedGroupIds = groupStorage.getStoredGroupIds()
      debugLog("Allowed group IDs from localStorage:", allowedGroupIds)

      const response = await groupApi.getGroups(allowedGroupIds)
      debugTimeEnd("Load Groups")

      if (response.success && response.data) {
        debugLog("Loaded groups:", response.data)
        setGroups(response.data)
      } else {
        console.error("Failed to load groups:", response.error)
        track("error_occurred", { error_type: "load_groups_failed", error_message: response.error ?? "Unknown error" })
      }
    } catch (error) {
      console.error("Failed to load groups:", error)
      track("error_occurred", {
        error_type: "load_groups_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadGamesForGroup = async (groupId: string) => {
    setGameLoading(true)
    try {
      debugTime("Load Games")
      const response = await gameApi.getGamesForGroup(groupId)
      debugTimeEnd("Load Games")
      if (response.success && response.data) {
        setGames(response.data)
      } else {
        console.error("Failed to load games:", response.error)
        track("error_occurred", { error_type: "load_games_failed", error_message: response.error ?? "Unknown error" })
      }
    } catch (error) {
      console.error("Failed to load games:", error)
      track("error_occurred", {
        error_type: "load_games_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setGameLoading(false)
    }
  }

  const loadPlayersForGroup = async (groupId: string) => {
    try {
      debugTime("Load Players")
      const response = await playerApi.getPlayersForGroup(groupId)
      debugTimeEnd("Load Players")
      if (response.success && response.data) {
        setPlayers(response.data)
      } else {
        console.error("Failed to load players:", response.error)
        track("error_occurred", { error_type: "load_players_failed", error_message: response.error ?? "Unknown error" })
      }
    } catch (error) {
      console.error("Failed to load players:", error)
      track("error_occurred", {
        error_type: "load_players_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const loadPlaythroughsForGame = async (gameId: string) => {
    setPlaythroughLoading(true)
    try {
      debugTime("Load Playthroughs")
      const response = await playthroughApi.getPlaythroughsForGame(gameId)
      debugTimeEnd("Load Playthroughs")
      if (response.success && response.data) {
        debugLog("Loaded playthroughs:", response.data)
        setPlaythroughs(response.data)
      } else {
        console.error("Failed to load playthroughs:", response.error)
        track("error_occurred", { error_type: "load_playthroughs_failed", error_message: response.error ?? "Unknown error" })
      }
    } catch (error) {
      console.error("Failed to load playthroughs:", error)
      track("error_occurred", {
        error_type: "load_playthroughs_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setPlaythroughLoading(false)
    }
  }

  const loadFullPlaythrough = async (gameId: string, playthroughId: string): Promise<Playthrough> => {
    debugTime("Load Full Playthrough")
    const response = await playthroughApi.getPlaythrough(gameId, playthroughId)
    debugTimeEnd("Load Full Playthrough")

    if (!response.success || !response.data) {
      track("error_occurred", {
        error_type: "load_playthrough_failed",
        error_message: response.error ?? "Unknown error",
      })
      throw new Error(response.error || "Failed to load playthrough")
    }

    const fullPlaythrough = response.data as Playthrough
    setPlaythroughs((prev) =>
      prev.map((playthrough) =>
        playthrough.id === playthroughId ? { ...playthrough, ...fullPlaythrough } : playthrough,
      ),
    )

    return fullPlaythrough
  }

  const loadCurrentSeasonForGame = async (groupId: string, gameId: string) => {
    setSeasonLoading(true)
    try {
      debugTime("Load Current Season")
      debugLog("Loading season for groupId:", groupId, "gameId:", gameId)

      const response = await seasonApi.getCurrentSeason(groupId, gameId)

      debugTimeEnd("Load Current Season")
      debugLog("Season API response:", response)

      if (response.success && response.data) {
        debugLog("Frontend received season ID:", response.data.season?.id)
        debugLog("Setting season summary:", response.data)
        setCurrentSeasonSummary(response.data)
      } else {
        console.error("Failed to load current season:", response.error)
        // Don't track this as an error since it might be expected for new games
        setCurrentSeasonSummary(null)
      }
    } catch (error) {
      console.error("Failed to load current season:", error)
      track("error_occurred", {
        error_type: "load_season_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      setCurrentSeasonSummary(null)
    } finally {
      setSeasonLoading(false)
    }
  }

  const createGroup = async (name: string, description?: string): Promise<Group> => {
    debugTime("Create Group")
    const response = await groupApi.createGroup(name, description)
    debugTimeEnd("Create Group")
    if (!response.success || !response.data) {
      track("error_occurred", { error_type: "create_group_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to create group")
    }

    groupStorage.storeGroupCode(response.data.id, response.data.code, response.data.name)
    debugLog("Stored group code for created group:", response.data.id)

    track("group_created", { group_name_length: response.data.name.length })

    await loadGroups()
    return response.data
  }

  const joinGroup = async (code: string): Promise<Group> => {
    debugTime("Join Group")
    const response = await groupApi.joinGroup(code)
    debugTimeEnd("Join Group")
    if (!response.success || !response.data) {
      track("error_occurred", { error_type: "join_group_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to join group")
    }

    groupStorage.storeGroupCode(response.data.id, response.data.code, response.data.name)
    debugLog("Stored group code for joined group:", response.data.id)

    track("group_joined", { has_description: !!response.data.description })

    await loadGroups()
    return response.data
  }

  const createGame = async (groupId: string, name: string, gameType = "standard"): Promise<Game> => {
    debugTime("Create Game")
    const response = await gameApi.createGame(groupId, name, gameType)
    debugTimeEnd("Create Game")
    if (!response.success || !response.data) {
      track("error_occurred", { error_type: "create_game_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to create game")
    }

    track("game_created", { game_name_length: response.data.name.length, game_type: gameType })

    await loadGamesForGroup(groupId)
    return response.data
  }

  const addPlaythrough = async (
    gameId: string,
    results: { playerName: string; rank: number }[],
    date?: string,
    roundCount?: number,
  ): Promise<Playthrough> => {
    debugTime("Add Playthrough")
    debugLog("Adding playthrough for game:", gameId, "with results:", results, "date:", date)

    const response = await playthroughApi.createPlaythrough(gameId, results, date, roundCount)
    debugTimeEnd("Add Playthrough")

    if (!response.success || !response.data) {
      track("error_occurred", { error_type: "add_playthrough_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to create playthrough")
    }

    debugLog("Playthrough created successfully:", response.data)

    track("playthrough_added", { player_count: results.length, has_game: !!gameId })

    // Force a full refresh so the UI reflects the new playthrough.
    await Promise.all([
      loadPlaythroughsForGame(gameId),
      selectedGroupId ? loadPlayersForGroup(selectedGroupId) : Promise.resolve(),
      selectedGroupId && selectedGameId ? loadCurrentSeasonForGame(selectedGroupId, selectedGameId) : Promise.resolve(),
    ])

    // Let state updates settle before refreshing.
    await new Promise((resolve) => setTimeout(resolve, 100))

    return response.data
  }

  const updatePlaythrough = async (
    gameId: string,
    playthroughId: string,
    results: { playerName: string; rank: number }[],
    date?: string,
    roundCount?: number,
  ): Promise<void> => {
    debugTime("Update Playthrough")
    debugLog("Updating playthrough:", playthroughId, "with results:", results, "date:", date)

    const response = await playthroughApi.updatePlaythrough(gameId, playthroughId, results, date, roundCount)
    debugTimeEnd("Update Playthrough")

    if (!response.success) {
      track("error_occurred", { error_type: "update_playthrough_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to update playthrough")
    }

    debugLog("Playthrough updated successfully:", response.data)

    track("playthrough_updated", { player_count: results.length, has_game: !!gameId })

    if (response.data?.id) {
      setPlaythroughs((prev) =>
        prev.map((playthrough) => (playthrough.id === playthroughId ? { ...playthrough, ...response.data } : playthrough)),
      )
    } else {
      await loadPlaythroughsForGame(gameId)
    }
  }

  const deletePlaythrough = async (gameId: string, playthroughId: string): Promise<boolean> => {
    try {
      debugTime("Delete Playthrough")
      const response = await playthroughApi.deletePlaythrough(gameId, playthroughId)
      debugTimeEnd("Delete Playthrough")

      if (!response.success) {
        track("error_occurred", { error_type: "delete_playthrough_failed", error_message: response.error ?? "Unknown error" })
        throw new Error(response.error || "Failed to delete playthrough")
      }

      track("playthrough_deleted")

      setPlaythroughs((prev) => prev.filter((p) => p.id !== playthroughId))
      if (selectedGroupId && selectedGameId) {
        loadCurrentSeasonForGame(selectedGroupId, selectedGameId)
      }
      return true
    } catch (error) {
      console.error("Failed to delete playthrough:", error)
      track("error_occurred", {
        error_type: "delete_playthrough_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      return false
    }
  }

  const concludeSeason = async (): Promise<void> => {
    if (!selectedGroupId || !selectedGameId) throw new Error("No group or game selected")

    debugTime("Conclude Season")
    const response = await seasonApi.concludeSeason(selectedGroupId)
    debugTimeEnd("Conclude Season")

    if (!response.success) {
      track("error_occurred", { error_type: "conclude_season_failed", error_message: response.error ?? "Unknown error" })
      throw new Error(response.error || "Failed to conclude season")
    }

    track("season_concluded", { season_number: response.data?.seasonNumber })

    await Promise.all([
      loadCurrentSeasonForGame(selectedGroupId, selectedGameId),
      loadPlaythroughsForGame(selectedGameId),
    ])
  }

  const fetchSeasons = async (groupId: string): Promise<any[]> => {
    const response = await seasonApi.getSeasons(groupId)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch seasons")
    }
    return response.data
  }

  const fetchSeasonBadges = async (groupId: string, seasonId: string): Promise<any[]> => {
    const response = await seasonApi.getSeasonBadges(groupId, seasonId)
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch season badges")
    }
    return response.data
  }

  const leaveGroup = (groupId: string) => {
    groupStorage.removeGroupCode(groupId)
    debugLog("Removed group code for group:", groupId)

    if (selectedGroupId === groupId) {
      setSelectedGroupId(null)
    }

    loadGroups()
  }

  const getLeaderboardForGame = useCallback(
    (gameId: string | null): GameLeaderboard | null => {
      if (!gameId) return null

      const game = games.find((g) => g.id === gameId)
      if (!game) return null

      // Filter playthroughs by current season if available
      let gamePlaythroughs = playthroughs.filter((p) => p.game_id === gameId)
      debugLog("All game playthroughs:", gamePlaythroughs)
      debugLog("Current season summary:", currentSeasonSummary)

      // If we have current season data, only show playthroughs from current season
      if (currentSeasonSummary?.season) {
        const beforeFilter = gamePlaythroughs.length
        debugLog("Frontend season ID:", currentSeasonSummary.season.id)
        debugLog(
          "Playthrough season IDs:",
          gamePlaythroughs.map((p) => p.season_id),
        )
        gamePlaythroughs = gamePlaythroughs.filter((p) => p.season_id === currentSeasonSummary.season.id)
        debugLog(
          `Filtered playthroughs for current season ${currentSeasonSummary.season.season_number}:`,
          `${beforeFilter} -> ${gamePlaythroughs.length}`,
          gamePlaythroughs.map((p) => ({ id: p.id, season_id: p.season_id, expected: currentSeasonSummary.season.id })),
        )
      }

      debugLog("Game playthroughs for leaderboard:", gamePlaythroughs)

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
    [games, playthroughs, currentSeasonSummary],
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

  const currentLeaderboard = useMemo(
    () => getLeaderboardForGame(selectedGameId),
    [getLeaderboardForGame, selectedGameId],
  )
  const currentSeasonSummaryForDisplay = useMemo(() => {
    if (!currentSeasonSummary) return null

    const totalPlaythroughs =
      currentSeasonSummary.totalPlaythroughs ??
      currentSeasonSummary.season.total_playthroughs ??
      playthroughs.filter((playthrough) => playthrough.season_id === currentSeasonSummary.season.id).length
    const topPlayers =
      currentSeasonSummary.topPlayers?.length > 0
        ? currentSeasonSummary.topPlayers
        : buildSeasonTopPlayers(currentLeaderboard?.rankings)

    return {
      ...currentSeasonSummary,
      season: {
        ...currentSeasonSummary.season,
        total_playthroughs: totalPlaythroughs,
      },
      totalPlaythroughs,
      topPlayers,
      playerStats: currentSeasonSummary.playerStats?.length ? currentSeasonSummary.playerStats : topPlayers,
      canConclude: totalPlaythroughs >= Number(currentSeasonSummary.season.min_games_threshold ?? 10),
    }
  }, [currentSeasonSummary, currentLeaderboard, playthroughs])

  const currentGroupOverview = useMemo(
    () => getGroupOverview(selectedGroupId),
    [getGroupOverview, selectedGroupId],
  )
  const currentGroupPlayers = useMemo(
    () => (selectedGroupId ? players.filter((p) => p.group_id === selectedGroupId) : []),
    [players, selectedGroupId],
  )

  return {
    // State
    groups,
    games,
    selectedGroupId,
    selectedGameId,
    loading,
    gameLoading,
    playthroughLoading,
    seasonLoading,
    playthroughs,
    currentSeasonSummary: currentSeasonSummaryForDisplay,

    // Computed
    currentLeaderboard,
    currentGroupOverview,
    currentGroupPlayers,

    // Actions
    createGroup,
    joinGroup,
    createGame,
    addPlaythrough,
    updatePlaythrough,
    setSelectedGroupId,
    setSelectedGameId,
    deletePlaythrough,
    leaveGroup,
    concludeSeason,
    fetchSeasons,
    fetchSeasonBadges,
    loadFullPlaythrough,
  }
}
