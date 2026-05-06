import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createServerTiming } from "@/lib/server-timing"

export async function GET() {
  const timing = createServerTiming()
  try {
    const archetypes = await sql`
      SELECT id, name, description
      FROM strategic_archetypes
      ORDER BY name
    `

    return timing.json({ success: true, data: archetypes })
  } catch (error) {
    console.error("Error fetching strategic archetypes:", error)
    return timing.json({ success: false, error: "Failed to fetch strategic archetypes" }, { status: 500 })
  }
}
