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

    // Get all players for this group
    const players = await sql`
      SELECT id, name, group_id, created_at
      FROM players
      WHERE group_id = ${groupId}
      ORDER BY name ASC
    `

    return NextResponse.json({ success: true, data: players })
  } catch (error) {
    console.error("Error fetching players:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch players" }, { status: 500 })
  }
}
