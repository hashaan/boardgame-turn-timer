import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const { code } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ success: false, error: "Group code is required" }, { status: 400 })
    }

    const normalizedCode = code.replace(/-/g, "").toUpperCase()

    // Find the group by code
    const [group] = await sql`
      SELECT id, name, code, description, created_at, created_by
      FROM groups
      WHERE code = ${normalizedCode}
      LIMIT 1
    `

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Invalid group code. Please check the code and try again." },
        { status: 404 },
      )
    }

    // Check if user already has access
    const [existingAccess] = await sql`
      SELECT id FROM group_access
      WHERE group_id = ${group.id} AND user_id = ${userId}
      LIMIT 1
    `

    if (existingAccess) {
      // Update access time
      await sql`
        UPDATE group_access
        SET accessed_at = NOW()
        WHERE group_id = ${group.id} AND user_id = ${userId}
      `
    } else {
      // Grant access
      await sql`
        INSERT INTO group_access (group_id, user_id, role)
        VALUES (${group.id}, ${userId}, 'member')
      `
    }

    return NextResponse.json({ success: true, data: group })
  } catch (error) {
    console.error("Error joining group:", error)
    return NextResponse.json({ success: false, error: "Failed to join group" }, { status: 500 })
  }
}
