import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params

    // Verify user has access to this group
    const [access] = await sql`
      SELECT id FROM group_access
      WHERE group_id = ${groupId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!access) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    // Get all games for this group
    const games = await sql`
      SELECT id, name, group_id, created_at, created_by
      FROM games
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, data: games })
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch games" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const userId = getUserId(request)
    const { groupId } = params
    const { name } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Game name is required" }, { status: 400 })
    }

    // Verify user has access to this group
    const [access] = await sql`
      SELECT id FROM group_access
      WHERE group_id = ${groupId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!access) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    // Check if game already exists in this group
    const [existingGame] = await sql`
      SELECT id FROM games
      WHERE group_id = ${groupId} AND LOWER(name) = LOWER(${name.trim()})
      LIMIT 1
    `

    if (existingGame) {
      return NextResponse.json(
        { success: false, error: "Game with this name already exists in this group" },
        { status: 400 },
      )
    }

    // Create the game
    const [newGame] = await sql`
      INSERT INTO games (name, group_id, created_by)
      VALUES (${name.trim()}, ${groupId}, ${userId})
      RETURNING id, name, group_id, created_at, created_by
    `

    return NextResponse.json({ success: true, data: newGame })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json({ success: false, error: "Failed to create game" }, { status: 500 })
  }
}
