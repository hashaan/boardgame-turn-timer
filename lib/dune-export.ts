import { sql } from "@/lib/db"
import {
  DUNE_EXPORT_FORMAT,
  DUNE_EXPORT_VERSION,
  type DuneExportPayload,
  type DuneExportRow,
  type DuneExportScope,
} from "@/types/dune-export"

const asRows = (rows: unknown): DuneExportRow[] => rows as DuneExportRow[]

function shortId(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "").slice(0, 8) || "unknown"
}

function exportTimestampStamp(generatedAt: string): string {
  const date = new Date(generatedAt)

  if (Number.isNaN(date.getTime())) {
    return generatedAt.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 32) || "unknown-time"
  }

  const pad = (value: number): string => String(value).padStart(2, "0")

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("")
}

export function buildDuneExportFilename(scope: DuneExportScope, generatedAt: string): string {
  const scopePart = scope.type === "game" ? `game-${shortId(scope.gameId)}` : `group-${shortId(scope.groupId)}`
  return `boardgame-turn-timer-dune-export-${scopePart}-${exportTimestampStamp(generatedAt)}.json`
}

export async function gameBelongsToGroup(groupId: string, gameId: string): Promise<boolean> {
  const rows = await sql`
    SELECT id
    FROM games
    WHERE id = ${gameId}
      AND group_id = ${groupId}
    LIMIT 1
  `

  return rows.length > 0
}

export async function buildDuneExportPayload({
  groupId,
  gameId = null,
  generatedAt = new Date().toISOString(),
}: {
  groupId: string
  gameId?: string | null
  generatedAt?: string
}): Promise<DuneExportPayload> {
  const scope: DuneExportScope = gameId
    ? { type: "game", groupId, gameId }
    : { type: "group", groupId, gameId: null }

  const groupsPromise = sql`
    SELECT id, name, code, description, created_at, created_by
    FROM groups
    WHERE id = ${groupId}
    ORDER BY created_at ASC, id ASC
  `

  const gamesPromise = gameId
    ? sql`
        SELECT id, name, group_id, game_type, created_at, created_by
        FROM games
        WHERE group_id = ${groupId}
          AND id = ${gameId}
        ORDER BY created_at ASC, id ASC
      `
    : sql`
        SELECT id, name, group_id, game_type, created_at, created_by
        FROM games
        WHERE group_id = ${groupId}
        ORDER BY created_at ASC, id ASC
      `

  const playersPromise = sql`
    SELECT id, name, group_id, created_at
    FROM players
    WHERE group_id = ${groupId}
    ORDER BY name ASC, created_at ASC, id ASC
  `

  const seasonsPromise = gameId
    ? sql`
        SELECT
          id,
          group_id,
          game_id,
          season_number,
          start_date,
          end_date,
          status,
          min_games_threshold,
          total_playthroughs,
          created_at
        FROM seasons
        WHERE group_id = ${groupId}
          AND (game_id = ${gameId} OR game_id IS NULL)
        ORDER BY season_number ASC, created_at ASC, id ASC
      `
    : sql`
        SELECT
          id,
          group_id,
          game_id,
          season_number,
          start_date,
          end_date,
          status,
          min_games_threshold,
          total_playthroughs,
          created_at
        FROM seasons
        WHERE group_id = ${groupId}
        ORDER BY season_number ASC, created_at ASC, id ASC
      `

  const seasonBadgesPromise = gameId
    ? sql`
        SELECT
          sb.id,
          sb.season_id,
          sb.player_id,
          sb.player_name,
          sb.rank,
          sb.badge_type,
          sb.total_games,
          sb.win_rate,
          sb.awarded_at
        FROM season_badges sb
        JOIN seasons s ON s.id = sb.season_id
        WHERE s.group_id = ${groupId}
          AND (s.game_id = ${gameId} OR s.game_id IS NULL)
        ORDER BY s.season_number ASC, sb.rank ASC, sb.awarded_at ASC, sb.id ASC
      `
    : sql`
        SELECT
          sb.id,
          sb.season_id,
          sb.player_id,
          sb.player_name,
          sb.rank,
          sb.badge_type,
          sb.total_games,
          sb.win_rate,
          sb.awarded_at
        FROM season_badges sb
        JOIN seasons s ON s.id = sb.season_id
        WHERE s.group_id = ${groupId}
        ORDER BY s.season_number ASC, sb.rank ASC, sb.awarded_at ASC, sb.id ASC
      `

  const playthroughsPromise = gameId
    ? sql`
        SELECT id, game_id, group_id, season_id, timestamp, recorded_by, round_count, notes
        FROM playthroughs
        WHERE group_id = ${groupId}
          AND game_id = ${gameId}
        ORDER BY timestamp ASC, id ASC
      `
    : sql`
        SELECT id, game_id, group_id, season_id, timestamp, recorded_by, round_count, notes
        FROM playthroughs
        WHERE group_id = ${groupId}
        ORDER BY timestamp ASC, id ASC
      `

  const playthroughResultsPromise = gameId
    ? sql`
        SELECT pr.*
        FROM playthrough_results pr
        JOIN playthroughs p ON p.id = pr.playthrough_id
        WHERE p.group_id = ${groupId}
          AND p.game_id = ${gameId}
        ORDER BY p.timestamp ASC, pr.rank ASC, pr.id ASC
      `
    : sql`
        SELECT pr.*
        FROM playthrough_results pr
        JOIN playthroughs p ON p.id = pr.playthrough_id
        WHERE p.group_id = ${groupId}
        ORDER BY p.timestamp ASC, pr.rank ASC, pr.id ASC
      `

  const playthroughResultItemsPromise = gameId
    ? sql`
        SELECT pri.*
        FROM playthrough_result_items pri
        JOIN playthroughs p ON p.id = pri.playthrough_id
        WHERE p.group_id = ${groupId}
          AND p.game_id = ${gameId}
        ORDER BY
          p.timestamp ASC,
          pri.playthrough_result_id ASC,
          pri.deck_id ASC,
          pri.item_type ASC,
          pri.item_name ASC,
          pri.item_key ASC,
          pri.id ASC
      `
    : sql`
        SELECT pri.*
        FROM playthrough_result_items pri
        JOIN playthroughs p ON p.id = pri.playthrough_id
        WHERE p.group_id = ${groupId}
        ORDER BY
          p.timestamp ASC,
          pri.playthrough_result_id ASC,
          pri.deck_id ASC,
          pri.item_type ASC,
          pri.item_name ASC,
          pri.item_key ASC,
          pri.id ASC
      `

  const leadersPromise = sql`
    SELECT id, name, faction, created_at
    FROM leaders
    ORDER BY faction ASC, name ASC, id ASC
  `

  const strategicArchetypesPromise = sql`
    SELECT id, name, description, created_at
    FROM strategic_archetypes
    ORDER BY name ASC, id ASC
  `

  const [
    groups,
    games,
    players,
    seasons,
    seasonBadges,
    leaders,
    strategicArchetypes,
    playthroughs,
    playthroughResults,
    playthroughResultItems,
  ] = await Promise.all([
    groupsPromise,
    gamesPromise,
    playersPromise,
    seasonsPromise,
    seasonBadgesPromise,
    leadersPromise,
    strategicArchetypesPromise,
    playthroughsPromise,
    playthroughResultsPromise,
    playthroughResultItemsPromise,
  ])

  const data = {
    groups: asRows(groups),
    games: asRows(games),
    players: asRows(players),
    seasons: asRows(seasons),
    seasonBadges: asRows(seasonBadges),
    leaders: asRows(leaders),
    strategicArchetypes: asRows(strategicArchetypes),
    playthroughs: asRows(playthroughs),
    playthroughResults: asRows(playthroughResults),
    playthroughResultItems: asRows(playthroughResultItems),
  }

  return {
    format: DUNE_EXPORT_FORMAT,
    formatVersion: DUNE_EXPORT_VERSION,
    generatedAt,
    app: {
      name: "boardgame-turn-timer",
      exportedFrom: "leaderboard",
    },
    scope,
    counts: {
      groups: data.groups.length,
      games: data.games.length,
      players: data.players.length,
      seasons: data.seasons.length,
      seasonBadges: data.seasonBadges.length,
      leaders: data.leaders.length,
      strategicArchetypes: data.strategicArchetypes.length,
      playthroughs: data.playthroughs.length,
      playthroughResults: data.playthroughResults.length,
      playthroughResultItems: data.playthroughResultItems.length,
    },
    data,
  }
}
