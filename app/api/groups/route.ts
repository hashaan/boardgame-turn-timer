import { type NextRequest, NextResponse } from "next/server"
import { sql, generateUniqueGroupCode, getUserId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)

    // Get all groups the user has access to
    const groups = await sql`
      SELECT g.id, g.name, g.code, g.description, g.created_at, g.created_by
      FROM groups g
      INNER JOIN group_access ga ON g.id = ga.group_id
      WHERE ga.user_id = ${userId} AND ga.role IN ('member', 'admin')
      ORDER BY ga.accessed_at DESC
    `

    return NextResponse.json({ success: true, data: groups })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch groups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const { name, description } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check if user already has access to a group with this name
    const existingGroup = await sql`
      SELECT g.id, g.name
      FROM groups g
      INNER JOIN group_access ga ON g.id = ga.group_id
      WHERE ga.user_id = ${userId} AND LOWER(g.name) = LOWER(${trimmedName})
      LIMIT 1
    `

    if (existingGroup.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `You already have access to a group named "${existingGroup[0].name}". Please choose a different name or join the existing group.`,
        },
        { status: 400 },
      )
    }

    const code = await generateUniqueGroupCode()

    // Create the group
    const [newGroup] = await sql`
      INSERT INTO groups (name, code, description, created_by)
      VALUES (${trimmedName}, ${code}, ${description?.trim() || null}, ${userId})
      RETURNING id, name, code, description, created_at, created_by
    `

    // Grant admin access to the creator
    await sql`
      INSERT INTO group_access (group_id, user_id, role)
      VALUES (${newGroup.id}, ${userId}, 'admin')
    `

    return NextResponse.json({ success: true, data: newGroup })
  } catch (error) {
    console.error("Error creating group:", error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
        return NextResponse.json(
          { success: false, error: "A group with this name already exists. Please choose a different name." },
          { status: 400 },
        )
      }
    }

    return NextResponse.json({ success: false, error: "Failed to create group. Please try again." }, { status: 500 })
  }
}
