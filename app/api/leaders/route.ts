import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Try with a direct connection (no pooling) to avoid read replica lag
    // This forces a fresh connection to the primary database
    const directSql = process.env.DATABASE_URL 
      ? neon(process.env.DATABASE_URL, { pooling: false })
      : sql

    // Query all leaders - use a more explicit query to avoid any caching issues
    const leaders = await directSql`
      SELECT id, name, faction, created_at
      FROM leaders
      ORDER BY faction, name
    `

    // Also get count separately to verify
    const countResult = await directSql`
      SELECT COUNT(*)::int as total FROM leaders
    `
    const totalCount = countResult[0]?.total || 0

    // Log for debugging
    console.log(`[Leaders API] Total count query result: ${totalCount}`)
    console.log(`[Leaders API] Fetched ${leaders.length} leaders from database`)
    console.log(`[Leaders API] All leader names:`, leaders.map(l => l.name).join(', '))

    // Also log unique factions
    const factions = [...new Set(leaders.map(l => l.faction))]
    console.log(`[Leaders API] Unique factions (${factions.length}):`, factions)
    
    // Check if we're missing any expected factions
    const expectedFactions = [
      'House Atreides', 'House Harkonnen', 'House Corrino', 'House Richese', 
      'House Thorvald', 'House Vernius', 'House Metelli', 'Fremen', 
      'Bene Gesserit', 'Spacing Guild', 'Ixians', 'Emperor'
    ]
    const missingFactions = expectedFactions.filter(f => !factions.includes(f))
    if (missingFactions.length > 0) {
      console.log(`[Leaders API] ⚠️ Missing factions:`, missingFactions)
    }

    return NextResponse.json(
      { success: true, data: leaders, meta: { total: totalCount, fetched: leaders.length } },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching leaders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch leaders" }, { status: 500 })
  }
}
