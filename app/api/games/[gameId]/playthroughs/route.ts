import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const userId = getUserId(request)
    const { gameId } = params

    console.log(`Fetching playthroughs for game ${gameId}`)

    // Get playthroughs with all advanced stats included
    const playthroughs = await sql`
      SELECT 
        p.id,
        p.game_id,
        p.group_id,
        p.season_id,
        p.timestamp,
        p.recorded_by,
        COALESCE(
          json_agg(
            json_build_object(
              'playerId', pr.player_id,
              'playerName', pr.player_name,
              'rank', pr.rank,
              'leader', pr.leader_name,
              'leader_name', pr.leader_name,
              'leaderId', pr.leader_id,
              'victory_points', pr.final_vp,
              'finalVp', pr.final_vp,
              'final_vp', pr.final_vp,
              'spice', pr.final_resources_spice,
              'finalResourcesSpice', pr.final_resources_spice,
              'final_resources_spice', pr.final_resources_spice,
              'solari', pr.final_resources_solari,
              'finalResourcesSolari', pr.final_resources_solari,
              'final_resources_solari', pr.final_resources_solari,
              'water', pr.final_resources_water,
              'finalResourcesWater', pr.final_resources_water,
              'final_resources_water', pr.final_resources_water,
              'troops', pr.final_resources_troops,
              'finalResourcesTroops', pr.final_resources_troops,
              'final_resources_troops', pr.final_resources_troops,
              'cards_trashed', pr.cards_trashed,
              'cardsTrashed', pr.cards_trashed,
              'cards_in_deck', pr.final_deck_size,
              'finalDeckSize', pr.final_deck_size,
              'final_deck_size', pr.final_deck_size,
              'strategic_archetype', pr.strategic_archetype_name,
              'strategic_archetype_name', pr.strategic_archetype_name,
              'strategicArchetypeId', pr.strategic_archetype_id
            ) ORDER BY pr.rank
          ) FILTER (WHERE pr.id IS NOT NULL),
          '[]'::json
        ) as results
      FROM playthroughs p
      LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
      WHERE p.game_id = ${gameId}
      GROUP BY p.id, p.game_id, p.group_id, p.season_id, p.timestamp, p.recorded_by
      ORDER BY p.timestamp DESC
    `

    console.log("Raw SQL result:", playthroughs)
    console.log("SQL result type:", typeof playthroughs)
    console.log("SQL result keys:", Object.keys(playthroughs || {}))

    // Handle different possible response structures
    let playthroughData = []

    if (Array.isArray(playthroughs)) {
      // Direct array response
      playthroughData = playthroughs
    } else if (playthroughs && playthroughs.rows && Array.isArray(playthroughs.rows)) {
      // Response with .rows property
      playthroughData = playthroughs.rows
    } else if (playthroughs && Array.isArray(playthroughs.rowCount)) {
      // Handle edge case
      playthroughData = []
    } else {
      // Fallback - treat as empty array
      console.warn("Unexpected SQL response structure:", playthroughs)
      playthroughData = []
    }

    console.log(`Found ${playthroughData.length} playthroughs for game ${gameId}`)

    // Log season_id info for debugging
    playthroughData.forEach((p, index) => {
      console.log(`Playthrough ${index}: id=${p.id}, season_id=${p.season_id}, results_count=${p.results?.length || 0}`)
    })

    return NextResponse.json({ success: true, data: playthroughData })
  } catch (error) {
    console.error("Error fetching playthroughs:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch playthroughs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const userId = getUserId(request)
    const { gameId } = params
    const body = await request.json()
    const { results } = body

    console.log("Creating playthrough for game:", gameId, "with results:", results)

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ success: false, error: "Results are required" }, { status: 400 })
    }

    // Get game info and current active season
    const gameInfoResult = await sql`
      SELECT g.id, g.group_id, g.game_type, s.id as season_id
      FROM games g
      LEFT JOIN seasons s ON g.id = s.game_id AND s.status = 'active'
      WHERE g.id = ${gameId}
      LIMIT 1
    `

    // Handle different response structures
    let gameInfo = null
    if (Array.isArray(gameInfoResult) && gameInfoResult.length > 0) {
      gameInfo = gameInfoResult[0]
    } else if (gameInfoResult && gameInfoResult.rows && gameInfoResult.rows.length > 0) {
      gameInfo = gameInfoResult.rows[0]
    }

    if (!gameInfo) {
      return NextResponse.json({ success: false, error: "Game not found" }, { status: 404 })
    }

    if (!gameInfo.season_id) {
      return NextResponse.json({ success: false, error: "No active season found for this game" }, { status: 400 })
    }

    console.log("Using season:", gameInfo.season_id, "Game type:", gameInfo.game_type)

    // Create playthrough with season_id
    const playthroughResult = await sql`
      INSERT INTO playthroughs (game_id, group_id, season_id, recorded_by, timestamp)
      VALUES (${gameId}, ${gameInfo.group_id}, ${gameInfo.season_id}, ${userId}, NOW())
      RETURNING *
    `

    // Handle different response structures for playthrough creation
    let playthrough = null
    if (Array.isArray(playthroughResult) && playthroughResult.length > 0) {
      playthrough = playthroughResult[0]
    } else if (playthroughResult && playthroughResult.rows && playthroughResult.rows.length > 0) {
      playthrough = playthroughResult.rows[0]
    }

    if (!playthrough) {
      throw new Error("Failed to create playthrough")
    }

    console.log("Created playthrough:", playthrough)

    // Process each result and handle player creation/lookup
    for (const result of results) {
      const {
        playerName,
        rank,
        leaderId,
        finalVp,
        finalResourcesSpice,
        finalResourcesSolari,
        finalResourcesWater,
        finalResourcesTroops,
        cardsTrashed,
        finalDeckSize,
        strategicArchetypeId,
        playerId,
      } = result

      let actualPlayerId = null

      // Try to use provided playerId if it's a valid UUID
      if (
        playerId &&
        typeof playerId === "string" &&
        playerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      ) {
        actualPlayerId = playerId
        console.log("Using provided player ID:", actualPlayerId)
      } else {
        // Look up existing player by name
        const existingPlayerResult = await sql`
          SELECT id FROM players
          WHERE group_id = ${gameInfo.group_id} AND LOWER(name) = LOWER(${playerName.trim()})
          LIMIT 1
        `

        let existingPlayer = null
        if (Array.isArray(existingPlayerResult) && existingPlayerResult.length > 0) {
          existingPlayer = existingPlayerResult[0]
        } else if (existingPlayerResult && existingPlayerResult.rows && existingPlayerResult.rows.length > 0) {
          existingPlayer = existingPlayerResult.rows[0]
        }

        if (existingPlayer) {
          actualPlayerId = existingPlayer.id
          console.log("Found existing player:", actualPlayerId, "for name:", playerName.trim())
        } else {
          // Create new player
          const newPlayerResult = await sql`
            INSERT INTO players (name, group_id)
            VALUES (${playerName.trim()}, ${gameInfo.group_id})
            RETURNING id
          `

          let newPlayer = null
          if (Array.isArray(newPlayerResult) && newPlayerResult.length > 0) {
            newPlayer = newPlayerResult[0]
          } else if (newPlayerResult && newPlayerResult.rows && newPlayerResult.rows.length > 0) {
            newPlayer = newPlayerResult.rows[0]
          }

          if (newPlayer) {
            actualPlayerId = newPlayer.id
            console.log("Created new player:", actualPlayerId, "for name:", playerName.trim())
          }
        }
      }

      // Prepare advanced stats for Dune games
      let leaderName = null
      let archetypeName = null

      if (gameInfo.game_type === "dune") {
        // Get leader name if leaderId is provided
        if (leaderId) {
          const leaderResult = await sql`
            SELECT name FROM leaders WHERE id = ${leaderId} LIMIT 1
          `

          let leader = null
          if (Array.isArray(leaderResult) && leaderResult.length > 0) {
            leader = leaderResult[0]
          } else if (leaderResult && leaderResult.rows && leaderResult.rows.length > 0) {
            leader = leaderResult.rows[0]
          }

          leaderName = leader?.name || null
        }

        // Get archetype name if strategicArchetypeId is provided
        if (strategicArchetypeId) {
          const archetypeResult = await sql`
            SELECT name FROM strategic_archetypes WHERE id = ${strategicArchetypeId} LIMIT 1
          `

          let archetype = null
          if (Array.isArray(archetypeResult) && archetypeResult.length > 0) {
            archetype = archetypeResult[0]
          } else if (archetypeResult && archetypeResult.rows && archetypeResult.rows.length > 0) {
            archetype = archetypeResult.rows[0]
          }

          archetypeName = archetype?.name || null
        }
      }

      // Insert playthrough result with the resolved player ID and advanced stats
      await sql`
        INSERT INTO playthrough_results (
          playthrough_id, player_id, player_name, rank,
          leader_id, leader_name, final_vp, 
          final_resources_spice, final_resources_solari, 
          final_resources_water, final_resources_troops,
          cards_trashed, final_deck_size, 
          strategic_archetype_id, strategic_archetype_name
        )
        VALUES (
          ${playthrough.id}, ${actualPlayerId}, ${playerName.trim()}, ${rank},
          ${leaderId || null}, ${leaderName}, ${finalVp || null}, 
          ${finalResourcesSpice || null}, ${finalResourcesSolari || null},
          ${finalResourcesWater || null}, ${finalResourcesTroops || null},
          ${cardsTrashed || null}, ${finalDeckSize || null},
          ${strategicArchetypeId || null}, ${archetypeName}
        )
      `
    }

    // Get the complete playthrough with results
    const completePlaythroughResult = await sql`
      SELECT 
        p.id,
        p.game_id,
        p.group_id,
        p.season_id,
        p.timestamp,
        p.recorded_by,
        COALESCE(
          json_agg(
            json_build_object(
              'playerId', pr.player_id,
              'playerName', pr.player_name,
              'rank', pr.rank,
              'leader', pr.leader_name,
              'leader_name', pr.leader_name,
              'leaderId', pr.leader_id,
              'victory_points', pr.final_vp,
              'finalVp', pr.final_vp,
              'final_vp', pr.final_vp,
              'spice', pr.final_resources_spice,
              'finalResourcesSpice', pr.final_resources_spice,
              'final_resources_spice', pr.final_resources_spice,
              'solari', pr.final_resources_solari,
              'finalResourcesSolari', pr.final_resources_solari,
              'final_resources_solari', pr.final_resources_solari,
              'water', pr.final_resources_water,
              'finalResourcesWater', pr.final_resources_water,
              'final_resources_water', pr.final_resources_water,
              'troops', pr.final_resources_troops,
              'finalResourcesTroops', pr.final_resources_troops,
              'final_resources_troops', pr.final_resources_troops,
              'cards_trashed', pr.cards_trashed,
              'cardsTrashed', pr.cards_trashed,
              'cards_in_deck', pr.final_deck_size,
              'finalDeckSize', pr.final_deck_size,
              'final_deck_size', pr.final_deck_size,
              'strategic_archetype', pr.strategic_archetype_name,
              'strategic_archetype_name', pr.strategic_archetype_name,
              'strategicArchetypeId', pr.strategic_archetype_id
            ) ORDER BY pr.rank
          ),
          '[]'::json
        ) as results
      FROM playthroughs p
      LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
      WHERE p.id = ${playthrough.id}
      GROUP BY p.id, p.game_id, p.group_id, p.season_id, p.timestamp, p.recorded_by
    `

    // Handle different response structures
    let completePlaythrough = null
    if (Array.isArray(completePlaythroughResult) && completePlaythroughResult.length > 0) {
      completePlaythrough = completePlaythroughResult[0]
    } else if (
      completePlaythroughResult &&
      completePlaythroughResult.rows &&
      completePlaythroughResult.rows.length > 0
    ) {
      completePlaythrough = completePlaythroughResult.rows[0]
    }

    console.log("Returning complete playthrough with advanced stats:", completePlaythrough)

    return NextResponse.json({ success: true, data: completePlaythrough })
  } catch (error) {
    console.error("Error creating playthrough:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create playthrough",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
