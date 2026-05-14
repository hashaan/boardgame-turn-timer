import type { LeaderboardInitialState } from "@/types/leaderboard"

// Updated API functions to use the real backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface Group {
  id: string
  name: string
  code: string
  created_at: number
  created_by: string
  description?: string
}

interface Game {
  id: string
  name: string
  group_id: string
  game_type: string
  created_at: number
  created_by: string
}

interface Player {
  id: string
  name: string
  group_id: string
  created_at: number
}

export const groupApi = {
  async createGroup(name: string, description?: string): Promise<ApiResponse<Group>> {
    try {
      const response = await fetch(`${API_BASE}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async joinGroup(code: string): Promise<ApiResponse<Group>> {
    try {
      const response = await fetch(`${API_BASE}/groups/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async getGroups(allowedGroupIds: string[] = []): Promise<ApiResponse<Group[]>> {
    try {
      const headers: Record<string, string> = {}

      // Send allowed group IDs in header
      if (allowedGroupIds.length > 0) {
        headers["x-allowed-group-ids"] = allowedGroupIds.join(",")
      }

      const response = await fetch(`${API_BASE}/groups`, { headers })
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}

export const gameApi = {
  async createGame(groupId: string, name: string, gameType = "standard"): Promise<ApiResponse<Game>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gameType }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async getGamesForGroup(groupId: string): Promise<ApiResponse<Game[]>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/games`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}

export const playerApi = {
  async getPlayersForGroup(groupId: string): Promise<ApiResponse<Player[]>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/players`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}

export const leaderboardApi = {
  async getInitialState(groupId: string, gameId?: string | null): Promise<ApiResponse<LeaderboardInitialState>> {
    try {
      const params = new URLSearchParams()
      if (gameId) params.set("gameId", gameId)

      const query = params.toString()
      const response = await fetch(`${API_BASE}/groups/${groupId}/leaderboard-initial-state${query ? `?${query}` : ""}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}

export const playthroughApi = {
  async getPlaythroughsForGame(
    gameId: string,
    options: { includeDetails?: boolean } = {},
  ): Promise<ApiResponse<any[]>> {
    try {
      const params = options.includeDetails ? "?includeDetails=true" : ""
      const response = await fetch(`${API_BASE}/games/${gameId}/playthroughs${params}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async getPlaythrough(gameId: string, playthroughId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/games/${gameId}/playthroughs/${playthroughId}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async createPlaythrough(gameId: string, results: any[], date?: string, roundCount?: number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/games/${gameId}/playthroughs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, date, roundCount }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async updatePlaythrough(gameId: string, playthroughId: string, results: any[], date?: string, roundCount?: number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/games/${gameId}/playthroughs/${playthroughId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, date, roundCount }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async deletePlaythrough(gameId: string, playthroughId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE}/games/${gameId}/playthroughs/${playthroughId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}

interface ExportDownloadResult {
  filename: string
}

function filenameFromContentDisposition(header: string | null): string {
  if (!header) return "boardgame-turn-timer-dune-export.json"

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const quotedMatch = header.match(/filename="([^\"]+)"/i)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const bareMatch = header.match(/filename=([^;]+)/i)
  return bareMatch?.[1]?.trim() || "boardgame-turn-timer-dune-export.json"
}

async function readExportError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === "string") return data.error
    if (typeof data?.details === "string") return data.details
  } catch {
    // Ignore non-JSON error bodies.
  }

  return `Export failed (${response.status})`
}

export const dataExportApi = {
  async downloadGroupExport(
    groupId: string,
    options: { gameId?: string | null } = {},
  ): Promise<ApiResponse<ExportDownloadResult>> {
    try {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return { success: false, error: "Downloads are only available in the browser" }
      }

      const params = new URLSearchParams()
      if (options.gameId) params.set("gameId", options.gameId)

      const query = params.toString()
      const response = await fetch(`${API_BASE}/groups/${groupId}/export${query ? `?${query}` : ""}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        return { success: false, error: await readExportError(response) }
      }

      const blob = await response.blob()
      const filename = filenameFromContentDisposition(response.headers.get("Content-Disposition"))
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = objectUrl
      link.download = filename
      link.rel = "noopener"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      return { success: true, data: { filename } }
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: error instanceof Error ? error.message : "Network error" }
    }
  },
}
// New Season API functions
export const seasonApi = {
  async getCurrentSeason(
    groupId: string,
    gameId?: string | null,
    options: { includeStats?: boolean } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams()
      if (gameId) params.set("gameId", gameId)
      if (options.includeStats) params.set("includeStats", "true")

      const query = params.toString()
      const response = await fetch(`${API_BASE}/groups/${groupId}/seasons/current${query ? `?${query}` : ""}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async getSeasons(groupId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/seasons`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async concludeSeason(groupId: string, gameId?: string | null): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/seasons/conclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameId ? { gameId } : {}),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },

  async getSeasonBadges(groupId: string, seasonId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/seasons/${seasonId}/badges`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Network error" }
    }
  },
}
