import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"
import { createServerTiming } from "@/lib/server-timing"

function firstRow<T>(rows: T[]): T | null {
  return rows[0] ?? null
}

async function verifyGroupAccess(groupId: string, userId: string) {
  return firstRow(
    await sql`
      SELECT id
      FROM group_access
      WHERE group_id = ${groupId}
        AND user_id = ${userId}
      LIMIT 1
    `,
  )
}

async function verifyGameBelongsToGroup(gameId: string, groupId: string) {
  return firstRow(
    await sql`
      SELECT id, group_id
      FROM games
      WHERE id = ${gameId}
        AND group_id = ${groupId}
      LIMIT 1
    `,
  )
}

async function getOrCreateActiveSeason(groupId: string, gameId?: string | null) {
  if (gameId) {
    const existingGameSeason = firstRow(
      await sql`
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
          AND game_id = ${gameId}
          AND status = 'active'
        ORDER BY season_number DESC
        LIMIT 1
      `,
    )

    if (existingGameSeason) return existingGameSeason

    const [groupSeason, maxSeason] = await Promise.all([
      sql`
        SELECT
          id,
          season_number,
          start_date,
          min_games_threshold
        FROM seasons
        WHERE group_id = ${groupId}
          AND game_id IS NULL
          AND status = 'active'
        ORDER BY season_number DESC
        LIMIT 1
      `,
      sql`
        SELECT COALESCE(MAX(season_number), 0) AS max_season_number
        FROM seasons
        WHERE group_id = ${groupId}
          AND game_id = ${gameId}
      `,
    ])

    const inheritedSeason = firstRow(groupSeason)
    const maxSeasonRow = firstRow(maxSeason)
    const seasonNumber = inheritedSeason?.season_number ?? Number(maxSeasonRow?.max_season_number ?? 0) + 1
    const minGamesThreshold = inheritedSeason?.min_games_threshold ?? 10
    const startDate = inheritedSeason?.start_date ?? null

    const created = firstRow(
      await sql`
        INSERT INTO seasons (
          group_id,
          game_id,
          season_number,
          start_date,
          status,
          min_games_threshold,
          total_playthroughs
        )
        VALUES (
          ${groupId},
          ${gameId},
          ${seasonNumber},
          COALESCE(${startDate}, NOW()),
          'active',
          ${minGamesThreshold},
          0
        )
        ON CONFLICT (game_id, season_number)
        DO UPDATE SET
          status = 'active',
          end_date = NULL
        RETURNING
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
      `,
    )

    if (!created) throw new Error("Failed to create active season")
    return created
  }

  const groupSeason = firstRow(
    await sql`
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
        AND game_id IS NULL
        AND status = 'active'
      ORDER BY season_number DESC
      LIMIT 1
    `,
  )

  if (groupSeason) return groupSeason

  const maxSeason = firstRow(
    await sql`
      SELECT COALESCE(MAX(season_number), 0) AS max_season_number
      FROM seasons
      WHERE group_id = ${groupId}
        AND game_id IS NULL
    `,
  )

  const created = firstRow(
    await sql`
      INSERT INTO seasons (group_id, season_number, status, min_games_threshold, total_playthroughs)
      VALUES (${groupId}, ${Number(maxSeason?.max_season_number ?? 0) + 1}, 'active', 10, 0)
      RETURNING
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
    `,
  )

  if (!created) throw new Error("Failed to create active season")
  return created
}

async function getSeasonPlayerStats(seasonId: string) {
  return sql`
    SELECT
      pr.player_id AS "playerId",
      pr.player_name AS "playerName",
      pr.player_id AS player_id,
      pr.player_name AS player_name,
      COUNT(*)::int AS "totalGames",
      COUNT(*)::int AS games_played,
      COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::int AS "firstPlaces",
      COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::int AS wins,
      ROUND((COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 2)::float AS "winRate",
      ROUND((COUNT(CASE WHEN pr.rank = 1 THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 2)::float AS win_rate_percentage,
      ROUND(AVG(pr.rank::decimal), 2)::float AS "averageRank"
    FROM playthrough_results pr
    INNER JOIN playthroughs p ON pr.playthrough_id = p.id
    WHERE p.season_id = ${seasonId}
    GROUP BY pr.player_id, pr.player_name
    ORDER BY "firstPlaces" DESC, "winRate" DESC, "averageRank" ASC, "playerName" ASC
  `
}

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  const timing = createServerTiming()
  try {
    const userId = getUserId(request)
    const { groupId } = params
    const gameId = request.nextUrl.searchParams.get("gameId")
    const includeStats = request.nextUrl.searchParams.get("includeStats") === "true"

    const [access, game] = await Promise.all([
      verifyGroupAccess(groupId, userId),
      gameId ? verifyGameBelongsToGroup(gameId, groupId) : Promise.resolve({ id: null }),
    ])

    if (!access) {
      return timing.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    if (gameId && !game) {
      return timing.json({ success: false, error: "Game not found for this group" }, { status: 404 })
    }

    const season = await getOrCreateActiveSeason(groupId, gameId)

    const [playthroughCount, playerStats] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total
        FROM playthroughs
        WHERE season_id = ${season.id}
      `,
      includeStats ? getSeasonPlayerStats(season.id) : Promise.resolve([]),
    ])

    const totalPlaythroughs = Number(firstRow(playthroughCount)?.total ?? 0)
    const seasonWithFreshCount = {
      ...season,
      total_playthroughs: totalPlaythroughs,
    }

    return timing.json({
      success: true,
      data: {
        season: seasonWithFreshCount,
        totalPlaythroughs,
        playerStats,
        topPlayers: playerStats,
        badges: [],
        canConclude: totalPlaythroughs >= Number(season.min_games_threshold ?? 10),
      },
    })
  } catch (error) {
    console.error("Error fetching current season:", error)
    return timing.json(
      {
        success: false,
        error: "Failed to fetch current season",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
