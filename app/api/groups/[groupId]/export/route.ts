import { type NextRequest, NextResponse } from "next/server"
import { getUserId, sql } from "@/lib/db"
import { buildDuneExportFilename, buildDuneExportPayload, gameBelongsToGroup } from "@/lib/dune-export"

function firstRow<T>(rows: T[]): T | null {
  return rows[0] ?? null
}

async function canExportGroup(groupId: string, userId: string): Promise<boolean> {
  const access = firstRow(
    await sql`
      SELECT id
      FROM group_access
      WHERE group_id = ${groupId}
        AND user_id = ${userId}
        AND role IN ('member', 'admin')
      LIMIT 1
    `,
  )

  return Boolean(access)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = getUserId(request)
    const { groupId } = await params
    const gameId = request.nextUrl.searchParams.get("gameId")

    const hasAccess = await canExportGroup(groupId, userId)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    if (gameId) {
      const belongsToGroup = await gameBelongsToGroup(groupId, gameId)
      if (!belongsToGroup) {
        return NextResponse.json({ success: false, error: "Game not found in group" }, { status: 404 })
      }
    }

    const payload = await buildDuneExportPayload({ groupId, gameId })
    const filename = buildDuneExportFilename(payload.scope, payload.generatedAt)

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error exporting Dune data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export Dune data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
