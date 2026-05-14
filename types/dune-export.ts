export const DUNE_EXPORT_FORMAT = "boardgame-turn-timer.export" as const
export const DUNE_EXPORT_VERSION = 1 as const

export type DuneExportScope =
  | {
      type: "group"
      groupId: string
      gameId: null
    }
  | {
      type: "game"
      groupId: string
      gameId: string
    }

export type DuneExportRow = Record<string, unknown>

export interface DuneExportCounts {
  groups: number
  games: number
  players: number
  seasons: number
  seasonBadges: number
  leaders: number
  strategicArchetypes: number
  playthroughs: number
  playthroughResults: number
  playthroughResultItems: number
}

export interface DuneExportPayload {
  format: typeof DUNE_EXPORT_FORMAT
  formatVersion: typeof DUNE_EXPORT_VERSION
  generatedAt: string
  app: {
    name: "boardgame-turn-timer"
    exportedFrom: "leaderboard"
  }
  scope: DuneExportScope
  counts: DuneExportCounts
  data: {
    groups: DuneExportRow[]
    games: DuneExportRow[]
    players: DuneExportRow[]
    seasons: DuneExportRow[]
    seasonBadges: DuneExportRow[]
    leaders: DuneExportRow[]
    strategicArchetypes: DuneExportRow[]
    playthroughs: DuneExportRow[]
    playthroughResults: DuneExportRow[]
    playthroughResultItems: DuneExportRow[]
  }
}
