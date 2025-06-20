import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")

    console.log("Current season API called with:", { groupId, gameId, userId })

    // Verify user has access to this group
    const [access] = await sql`
      SELECT group_id FROM group_access
      WHERE group_id = ${groupId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!access) {
      console.log("Access denied for user:", userId, "group:", groupId)
      return NextResponse.json({ success: false, error: "Group not found or access denied" }, { status: 404 })
    }

    if (!gameId) {
      console.log("No gameId provided")
      return NextResponse.json({ success: false, error: "Game ID is required" }, { status: 400 })
    }

    // Get current season for the specific game
    console.log("Querying for season with groupId:", groupId, "gameId:", gameId)

    const seasonQuery = await sql`
      SELECT 
        s.id,
        s.group_id,
        s.game_id,
        s.season_number,
        s.start_date,
        s.end_date,
        s.status,
        s.min_games_threshold,
        s.total_playthroughs,
        s.created_at,
        COUNT(p.id) as actual_playthrough_count
      FROM seasons s
      LEFT JOIN playthroughs p ON s.id = p.season_id
      WHERE s.group_id = ${groupId} 
        AND s.game_id = ${gameId}
        AND s.status = 'active'
      GROUP BY s.id, s.group_id, s.game_id, s.season_number, s.start_date, s.end_date, s.status, s.min_games_threshold, s.total_playthroughs, s.created_at
      ORDER BY s.season_number DESC
      LIMIT 1
    `

    console.log("Season query result:", seasonQuery)

    if (!seasonQuery || seasonQuery.length === 0) {
      // Try to create a season if none exists
      console.log("No active season found, creating one for game:", gameId)

      try {
        await sql`
          INSERT INTO seasons (group_id, game_id, season_number, start_date, status, min_games_threshold)
          VALUES (${groupId}, ${gameId}, 1, NOW(), 'active', 10)
          ON CONFLICT (game_id, season_number) DO NOTHING
        `

        // Try the query again
        const retryQuery = await sql`
          SELECT 
            s.id,
            s.group_id,
            s.game_id,
            s.season_number,
            s.start_date,
            s.end_date,
            s.status,
            s.min_games_threshold,
            s.total_playthroughs,
            s.created_at,
            COUNT(p.id) as actual_playthrough_count
          FROM seasons s
          LEFT JOIN playthroughs p ON s.id = p.season_id
          WHERE s.group_id = ${groupId} 
            AND s.game_id = ${gameId}
            AND s.status = 'active'
          GROUP BY s.id, s.group_id, s.game_id, s.season_number, s.start_date, s.end_date, s.status, s.min_games_threshold, s.total_playthroughs, s.created_at
          LIMIT 1
        `

        if (retryQuery && retryQuery.length > 0) {
          const currentSeason = retryQuery[0]
          const seasonSummary = {
            season: {
              ...currentSeason,
              total_playthroughs: Number.parseInt(currentSeason.actual_playthrough_count || "0"),
            },
            topPlayers: [],
          }
          console.log("Created and returning new season:", seasonSummary)
          return NextResponse.json({ success: true, data: seasonSummary })
        }
      } catch (createError) {
        console.error("Failed to create season:", createError)
      }

      console.log("Still no active season found for game:", gameId, "in group:", groupId)
      return NextResponse.json({ success: false, error: "No active season found for this game" }, { status: 404 })
    }

    const currentSeason = seasonQuery[0]
    console.log("Current season ID being returned:", currentSeason.id)

    // Get top players for this season with FIXED win rate calculation
    const topPlayers = await sql`
      SELECT 
        pr.player_id,
        pr.player_name,
        COUNT(pr.id)::int as games_played,
        SUM(CASE WHEN pr.rank = 1 THEN 1 ELSE 0 END)::int as wins,
        ROUND(AVG(pr.rank::numeric), 2) as avg_rank,
        COALESCE(ROUND(AVG(pr.final_vp::numeric), 1), 0) as avg_vp,
        CASE 
          WHEN COUNT(pr.id) > 0 THEN ROUND((SUM(CASE WHEN pr.rank = 1 THEN 1 ELSE 0 END)::numeric / COUNT(pr.id)::numeric) * 100, 1)
          ELSE 0 
        END as win_rate_percentage
      FROM playthrough_results pr
      JOIN playthroughs p ON pr.playthrough_id = p.id
      WHERE p.season_id = ${currentSeason.id}
      GROUP BY pr.player_id, pr.player_name
      HAVING COUNT(pr.id) > 0
      ORDER BY wins DESC, avg_rank ASC
      LIMIT 10
    `

    console.log("Top players query result:", topPlayers)

    // Transform the data to match expected format
    const transformedTopPlayers = (topPlayers || []).map((player: any) => ({
      player_id: player.player_id,
      player_name: player.player_name,
      games_played: Number.parseInt(player.games_played),
      wins: Number.parseInt(player.wins),
      avg_rank: Number.parseFloat(player.avg_rank),
      avg_vp: Number.parseFloat(player.avg_vp),
      win_rate_percentage: Number.parseFloat(player.win_rate_percentage),
    }))

    const seasonSummary = {
      season: {
        ...currentSeason,
        total_playthroughs: Number.parseInt(currentSeason.actual_playthrough_count || "0"),
      },
      topPlayers: transformedTopPlayers,
      canConclude: Number.parseInt(currentSeason.actual_playthrough_count || "0") >= currentSeason.min_games_threshold,
    }

    console.log("Season summary being returned:", JSON.stringify(seasonSummary, null, 2))
    return NextResponse.json({ success: true, data: seasonSummary })
  } catch (error) {
    console.error("Error fetching current season:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch current season" }, { status: 500 })
  }
}
