import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

function firstRow<T>(rows: T[]): T | null {
  return rows[0] ?? null
}

async function getOrCreateActiveSeason(groupId: string, gameId: string) {
  const existing = firstRow(
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

  if (existing) return existing

  const [groupSeasonRows, maxSeasonRows] = await Promise.all([
    sql`
      SELECT season_number, start_date, min_games_threshold
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

  const groupSeason = firstRow(groupSeasonRows)
  const maxSeason = firstRow(maxSeasonRows)
  const seasonNumber = groupSeason?.season_number ?? Number(maxSeason?.max_season_number ?? 0) + 1
  const minGamesThreshold = groupSeason?.min_games_threshold ?? 10
  const startDate = groupSeason?.start_date ?? null

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

async function getPlaythroughSummaries(gameId: string) {
  return sql`
    SELECT
      p.id,
      p.game_id,
      p.group_id,
      p.season_id,
      p.timestamp,
      p.recorded_by,
      p.round_count,
      p.round_count AS "roundCount",
      p.notes,
      true AS "isSummary",
      false AS "hasFullDetails",
      COALESCE(
        json_agg(
          jsonb_build_object(
            'resultId', pr.id,
            'id', pr.id,
            'playerId', pr.player_id,
            'player_id', pr.player_id,
            'playerName', pr.player_name,
            'player_name', pr.player_name,
            'rank', pr.rank,
            'leader', pr.leader_name,
            'leader_name', pr.leader_name,
            'leaderName', pr.leader_name,
            'leaderId', pr.leader_id,
            'leader_id', pr.leader_id,
            'strategicArchetypeName', pr.strategic_archetype_name,
            'strategic_archetype_name', pr.strategic_archetype_name,
            'strategic_archetype', pr.strategic_archetype_name,
            'strategicArchetypeId', pr.strategic_archetype_id,
            'strategic_archetype_id', pr.strategic_archetype_id,
            'score', pr.score,
            'victory_points', pr.score,
            'finalVp', pr.score,
            'final_vp', pr.score,
            'turnOrderPosition', pr.turn_order_position,
            'turn_order_position', pr.turn_order_position,
            'isSummary', true,
            'hasFullDetails', false
          ) ORDER BY pr.rank
        ) FILTER (WHERE pr.id IS NOT NULL),
        '[]'::json
      ) as results
    FROM playthroughs p
    LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
    WHERE p.game_id = ${gameId}
    GROUP BY p.id, p.game_id, p.group_id, p.season_id, p.timestamp, p.recorded_by, p.round_count, p.notes
    ORDER BY p.timestamp DESC
  `
}

async function getCurrentSeasonSummary(groupId: string, gameId: string) {
  const season = await getOrCreateActiveSeason(groupId, gameId)
  const countRows = await sql`
    SELECT COUNT(*)::int AS total
    FROM playthroughs
    WHERE season_id = ${season.id}
  `

  const totalPlaythroughs = Number(firstRow(countRows)?.total ?? 0)
  const seasonWithFreshCount = {
    ...season,
    total_playthroughs: totalPlaythroughs,
  }

  return {
    season: seasonWithFreshCount,
    totalPlaythroughs,
    playerStats: [],
    topPlayers: [],
    badges: [],
    canConclude: totalPlaythroughs >= Number(season.min_games_threshold ?? 10),
  }
}

async function getDuneReferenceData() {
  const [leaders, strategicArchetypes] = await Promise.all([
    sql`
      SELECT id, name, COALESCE(faction, 'Other') AS faction
      FROM leaders
      ORDER BY faction ASC, name ASC
    `,
    sql`
      SELECT id, name, description
      FROM strategic_archetypes
      ORDER BY name ASC
    `,
  ])

  return { leaders, strategicArchetypes }
}

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params
    const requestedGameId = request.nextUrl.searchParams.get("gameId")

    const access = firstRow(
      await sql`
        SELECT id
        FROM group_access
        WHERE group_id = ${groupId}
          AND user_id = ${userId}
          AND role IN ('member', 'admin')
        LIMIT 1
      `,
    )

    if (!access) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const [games, players, referenceData] = await Promise.all([
      sql`
        SELECT id, name, group_id, game_type, created_at, created_by
        FROM games
        WHERE group_id = ${groupId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT id, name, group_id, created_at
        FROM players
        WHERE group_id = ${groupId}
        ORDER BY name ASC
      `,
      getDuneReferenceData(),
    ])

    const selectedGame = requestedGameId ? games.find((game) => game.id === requestedGameId) : null
    const selectedGameId = selectedGame?.id ?? null

    const [playthroughs, currentSeasonSummary] = selectedGameId
      ? await Promise.all([
          getPlaythroughSummaries(selectedGameId),
          getCurrentSeasonSummary(groupId, selectedGameId),
        ])
      : [[], null]

    return NextResponse.json({
      success: true,
      data: {
        games,
        players,
        selectedGameId,
        playthroughs,
        currentSeasonSummary,
        leaders: referenceData.leaders,
        strategicArchetypes: referenceData.strategicArchetypes,
      },
    })
  } catch (error) {
    console.error("Error fetching leaderboard initial state:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leaderboard initial state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
