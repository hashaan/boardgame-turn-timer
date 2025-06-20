import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params

    // Verify user has access to this group
    const [access] = await sql`
      SELECT group_id FROM group_access
      WHERE group_id = ${groupId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!access) {
      return NextResponse.json({ success: false, error: "Group not found or access denied" }, { status: 404 })
    }

    try {
      // Try to get games with game_type column
      const games = await sql`
        SELECT id, name, group_id, game_type, created_at, created_by
        FROM games
        WHERE group_id = ${groupId}
        ORDER BY created_at DESC
      `

      return NextResponse.json({ success: true, data: games })
    } catch (error: any) {
      // If game_type column doesn't exist, fall back to basic query
      if (error.message?.includes("game_type") && error.message?.includes("does not exist")) {
        console.log("game_type column doesn't exist, using fallback query")
        const games = await sql`
          SELECT id, name, group_id, created_at, created_by, 'standard' as game_type
          FROM games
          WHERE group_id = ${groupId}
          ORDER BY created_at DESC
        `

        return NextResponse.json({ success: true, data: games })
      }
      throw error
    }
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch games" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params
    const { name, gameType = "standard" } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Game name is required" }, { status: 400 })
    }

    // Verify user has access to this group
    const [access] = await sql`
      SELECT group_id FROM group_access
      WHERE group_id = ${groupId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!access) {
      return NextResponse.json({ success: false, error: "Group not found or access denied" }, { status: 404 })
    }

    let game
    try {
      // Try to create game with game_type column
      ;[game] = await sql`
        INSERT INTO games (name, group_id, game_type, created_by)
        VALUES (${name.trim()}, ${groupId}, ${gameType}, ${userId})
        RETURNING *
      `
    } catch (error: any) {
      // If game_type column doesn't exist, fall back to basic insert
      if (error.message?.includes("game_type") && error.message?.includes("does not exist")) {
        console.log("game_type column doesn't exist, using fallback insert")
        ;[game] = await sql`
          INSERT INTO games (name, group_id, created_by)
          VALUES (${name.trim()}, ${groupId}, ${userId})
          RETURNING *, 'standard' as game_type
        `
      } else {
        throw error
      }
    }

    // Auto-create Season 1 for the new game
    try {
      await sql`
        INSERT INTO seasons (group_id, game_id, season_number, start_date, status, min_games_threshold)
        VALUES (${groupId}, ${game.id}, 1, NOW(), 'active', 10)
        ON CONFLICT (game_id, season_number) DO NOTHING
      `
      console.log("Created Season 1 for new game:", game.id)
    } catch (seasonError) {
      console.error("Failed to create season for new game:", seasonError)
      // Don't fail the game creation if season creation fails
    }

    return NextResponse.json({ success: true, data: game })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json({ success: false, error: "Failed to create game" }, { status: 500 })
  }
}
