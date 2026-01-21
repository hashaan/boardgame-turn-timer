import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { neon } from "@neondatabase/serverless"

// Enforce dynamic behavior to ensure fresh data on every request
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Establish a direct connection to bypass connection pooling for immediate consistency
    const directSql = process.env.DATABASE_URL
        ? neon(process.env.DATABASE_URL, { pooling: false })
        : sql

    const leaders = await directSql`
      SELECT id, name, faction, created_at
      FROM leaders
      ORDER BY faction, name
    `

    // Verify total count for monitoring
    const countResult = await directSql`
      SELECT COUNT(*)::int as total FROM leaders
    `
    const totalCount = countResult[0]?.total || 0

    // Validate presence of canonical factions
    const currentFactions = [...new Set(leaders.map((l) => l.faction))]
    const expectedFactions = [
      "House Atreides",
      "House Harkonnen",
      "House Corrino",
      "House Richese",
      "House Thorvald",
      "House Vernius",
      "House Ecaz",
      "House Moritani",
      "House Metulli",
      "House Fenring",
      "Fremen",
      "Bene Gesserit",
      "Spacing Guild",
      "Smugglers",
      "Ixian",
    ]

    const missingFactions = expectedFactions.filter((f) => !currentFactions.includes(f))

    if (process.env.NODE_ENV === "development") {
      console.log(`[Leaders API] Fetched ${leaders.length} leaders.`)
      if (missingFactions.length > 0) {
        console.warn(`[Leaders API] Missing expected factions:`, missingFactions)
      }
    }

    return NextResponse.json(
        {
          success: true,
          data: leaders,
          meta: { total: totalCount, fetched: leaders.length }
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
    )
  } catch (error) {
    console.error("[Leaders API] Error fetching leaders:", error)
    return NextResponse.json(
        { success: false, error: "Failed to fetch leaders" },
        { status: 500 }
    )
  }
}