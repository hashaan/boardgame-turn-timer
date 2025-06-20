import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { gameId: string; playthroughId: string } }) {
  try {
    const userId = getUserId(request)
    const { gameId, playthroughId } = params

    // Verify user has access to this game
    const [game] = await sql`
      SELECT g.id, g.group_id
      FROM games g
      INNER JOIN group_access ga ON g.group_id = ga.group_id
      WHERE g.id = ${gameId} AND ga.user_id = ${userId}
      LIMIT 1
    `

    if (!game) {
      return NextResponse.json({ success: false, error: "Game not found or access denied" }, { status: 404 })
    }

    // Verify the playthrough exists and belongs to this game
    const [playthrough] = await sql`
      SELECT id FROM playthroughs
      WHERE id = ${playthroughId} AND game_id = ${gameId}
      LIMIT 1
    `

    if (!playthrough) {
      return NextResponse.json({ success: false, error: "Playthrough not found" }, { status: 404 })
    }

    // Delete the playthrough (cascade will handle results)
    await sql`
      DELETE FROM playthroughs
      WHERE id = ${playthroughId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting playthrough:", error)
    return NextResponse.json({ success: false, error: "Failed to delete playthrough" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { gameId: string; playthroughId: string } }) {
  try {
    const userId = getUserId(request)
    const { gameId, playthroughId } = params
    const { results } = await request.json()

    console.log("Updating playthrough:", playthroughId, "with results:", results)

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ success: false, error: "Results are required" }, { status: 400 })
    }

    // Verify user has access to this game
    const [game] = await sql`
      SELECT g.id, g.group_id, g.game_type
      FROM games g
      INNER JOIN group_access ga ON g.group_id = ga.group_id
      WHERE g.id = ${gameId} AND ga.user_id = ${userId}
      LIMIT 1
    `

    if (!game) {
      return NextResponse.json({ success: false, error: "Game not found or access denied" }, { status: 404 })
    }

    // Verify the playthrough exists and belongs to this game
    const [playthrough] = await sql`
      SELECT id, game_id, group_id, timestamp, recorded_by, season_id
      FROM playthroughs
      WHERE id = ${playthroughId} AND game_id = ${gameId}
      LIMIT 1
    `

    if (!playthrough) {
      return NextResponse.json({ success: false, error: "Playthrough not found" }, { status: 404 })
    }

    // Validate ranks
    const ranks = results.map((r: any) => r.rank)
    const uniqueRanks = new Set(ranks)
    if (ranks.length !== uniqueRanks.size) {
      return NextResponse.json({ success: false, error: "Each player must have a unique rank" }, { status: 400 })
    }

    const sortedRanks = [...ranks].sort((a, b) => a - b)
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        return NextResponse.json(
          { success: false, error: "Ranks must be consecutive starting from 1st place" },
          { status: 400 },
        )
      }
    }

    // Delete existing results
    await sql`
      DELETE FROM playthrough_results
      WHERE playthrough_id = ${playthroughId}
    `

    // Process each result
    const playthroughResults = []
    for (const result of results) {
      const { playerName, rank } = result

      // Get or create player
      let [player] = await sql`
        SELECT id FROM players
        WHERE group_id = ${game.group_id} AND LOWER(name) = LOWER(${playerName.trim()})
        LIMIT 1
      `

      if (!player) {
        console.log("Creating new player:", playerName.trim())
        ;[player] = await sql`
          INSERT INTO players (name, group_id)
          VALUES (${playerName.trim()}, ${game.group_id})
          RETURNING id
        `
      }

      // Prepare advanced stats for Dune games
      let leaderName = null
      let archetypeName = null

      if (game.game_type === "dune") {
        // Get leader name if leaderId is provided
        if (result.leaderId) {
          const [leader] = await sql`
            SELECT name FROM leaders WHERE id = ${result.leaderId} LIMIT 1
          `
          leaderName = leader?.name || null
        }

        // Get archetype name if strategicArchetypeId is provided
        if (result.strategicArchetypeId) {
          const [archetype] = await sql`
            SELECT name FROM strategic_archetypes WHERE id = ${result.strategicArchetypeId} LIMIT 1
          `
          archetypeName = archetype?.name || null
        }
      }

      // Insert new playthrough result with advanced stats
      const [playthroughResult] = await sql`
        INSERT INTO playthrough_results (
          playthrough_id, 
          player_id, 
          player_name, 
          rank,
          leader_id,
          leader_name,
          final_vp,
          final_resources_spice,
          final_resources_solari,
          final_resources_water,
          final_resources_troops,
          cards_trashed,
          final_deck_size,
          strategic_archetype_id,
          strategic_archetype_name
        )
        VALUES (
          ${playthroughId}, 
          ${player.id}, 
          ${playerName.trim()}, 
          ${rank},
          ${result.leaderId || null},
          ${leaderName},
          ${result.finalVp || null},
          ${result.finalResourcesSpice || null},
          ${result.finalResourcesSolari || null},
          ${result.finalResourcesWater || null},
          ${result.finalResourcesTroops || null},
          ${result.cardsTrashed || null},
          ${result.finalDeckSize || null},
          ${result.strategicArchetypeId || null},
          ${archetypeName}
        )
        RETURNING *
      `

      playthroughResults.push({
        playerId: playthroughResult.player_id,
        playerName: playthroughResult.player_name,
        rank: playthroughResult.rank,
        leader: playthroughResult.leader_name,
        leader_name: playthroughResult.leader_name,
        leaderId: playthroughResult.leader_id,
        victory_points: playthroughResult.final_vp,
        finalVp: playthroughResult.final_vp,
        final_vp: playthroughResult.final_vp,
        spice: playthroughResult.final_resources_spice,
        finalResourcesSpice: playthroughResult.final_resources_spice,
        final_resources_spice: playthroughResult.final_resources_spice,
        solari: playthroughResult.final_resources_solari,
        finalResourcesSolari: playthroughResult.final_resources_solari,
        final_resources_solari: playthroughResult.final_resources_solari,
        water: playthroughResult.final_resources_water,
        finalResourcesWater: playthroughResult.final_resources_water,
        final_resources_water: playthroughResult.final_resources_water,
        troops: playthroughResult.final_resources_troops,
        finalResourcesTroops: playthroughResult.final_resources_troops,
        final_resources_troops: playthroughResult.final_resources_troops,
        cards_trashed: playthroughResult.cards_trashed,
        cardsTrashed: playthroughResult.cards_trashed,
        cards_in_deck: playthroughResult.final_deck_size,
        finalDeckSize: playthroughResult.final_deck_size,
        final_deck_size: playthroughResult.final_deck_size,
        strategic_archetype: playthroughResult.strategic_archetype_name,
        strategic_archetype_name: playthroughResult.strategic_archetype_name,
        strategicArchetypeId: playthroughResult.strategic_archetype_id,
      })
    }

    const response = {
      ...playthrough,
      results: playthroughResults,
    }

    console.log("Playthrough updated successfully with advanced stats:", response)

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error("Error updating playthrough:", error)
    return NextResponse.json({ success: false, error: "Failed to update playthrough" }, { status: 500 })
  }
}
