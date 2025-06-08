export interface Group {
  id: string
  name: string
  code: string // Unique access code for the group
  createdAt: number
  createdBy: string // User identifier
  description?: string
}

export interface Game {
  id: string
  name: string
  groupId: string // Games belong to groups
  createdAt: number
  createdBy: string
}

export interface Player {
  id: string
  name: string
  groupId: string // Players are group-specific, can play multiple games
  createdAt: number
}

export interface PlaythroughPlayerResult {
  playerId: string
  playerName: string
  rank: number
}

export interface Playthrough {
  id: string
  gameId: string
  groupId: string
  timestamp: number
  results: PlaythroughPlayerResult[]
  recordedBy: string // User who recorded this playthrough
}

// Derived data for displaying a player on the main leaderboard for a game
export interface PlayerRanking {
  playerId: string
  playerName: string
  chips: number[] // An array of ranks, e.g., [1, 3, 1, 2]
  rankCounts: {
    first: number
    second: number
    third: number
    fourth: number
    other: number
  }
  totalPlaythroughs: number
  overallRank?: number
}

// Data for displaying the full leaderboard of a specific game
export interface GameLeaderboard {
  game: Game
  rankings: PlayerRanking[]
}

// Group access management
export interface GroupAccess {
  groupId: string
  hasAccess: boolean
  accessedAt: number
  role: "member" | "admin" // Future: different permission levels
}

// Group overview with all games
export interface GroupOverview {
  group: Group
  games: Game[]
  totalPlayers: number
  totalPlaythroughs: number
}
