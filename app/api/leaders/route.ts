import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const leaders = await sql`
      SELECT id, name, faction
      FROM leaders
      ORDER BY faction, name
    `

    return NextResponse.json({ success: true, data: leaders })
  } catch (error) {
    console.error("Error fetching leaders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch leaders" }, { status: 500 })
  }
}
