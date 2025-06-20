import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const archetypes = await sql`
      SELECT id, name, description
      FROM strategic_archetypes
      ORDER BY name
    `

    return NextResponse.json({ success: true, data: archetypes })
  } catch (error) {
    console.error("Error fetching strategic archetypes:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch strategic archetypes" }, { status: 500 })
  }
}
