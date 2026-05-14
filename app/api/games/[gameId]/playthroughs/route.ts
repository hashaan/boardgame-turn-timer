import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"
import {
  attachTrackedItemsToPlaythrough,
  attachTrackedItemsToPlaythroughs,
  getSubmittedTrackedItems,
  replacePlaythroughResultItems,
} from "@/lib/playthrough-result-items"
import { createServerTiming } from "@/lib/server-timing"
import {
  deriveDuneServerResultFields,
  finaliseDuneServerResultFieldsForLeader,
  firstDefined,
  getDuneResultFields,
  nullableNumber,
  nullableText,
} from "@/lib/dune/result-fields"

type Row = Record<string, any>

function firstRow<T>(rows: T[]): T | null {
  return rows[0] ?? null
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

function nullableUuid(value: unknown): string | null {
  return isUuid(value) ? value : null
}

function parseDateToIso(value: unknown): string | null {
  const text = nullableText(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

async function getOrCreateActiveSeason(gameId: string, groupId: string) {
  const existing = firstRow(
    await sql`
      SELECT *
      FROM seasons
      WHERE group_id = ${groupId}
        AND game_id = ${gameId}
        AND status = 'active'
      ORDER BY season_number DESC
      LIMIT 1
    `,
  )

  if (existing) return existing

  const groupSeason = firstRow(
    await sql`
      SELECT *
      FROM seasons
      WHERE group_id = ${groupId}
        AND game_id IS NULL
        AND status = 'active'
      ORDER BY season_number DESC
      LIMIT 1
    `,
  )

  const maxSeason = firstRow(
    await sql`
      SELECT COALESCE(MAX(season_number), 0) AS max_season_number
      FROM seasons
      WHERE group_id = ${groupId}
        AND game_id = ${gameId}
    `,
  )

  const seasonNumber = groupSeason?.season_number ?? Number(maxSeason?.max_season_number ?? 0) + 1
  const minGamesThreshold = groupSeason?.min_games_threshold ?? 10
  const startDate = groupSeason?.start_date ?? null

  const created = firstRow(
    await sql`
      INSERT INTO seasons (
        group_id,
        game_id,
        season_number,
        start_date,
        status,
        min_games_threshold,
        total_playthroughs
      )
      VALUES (
        ${groupId},
        ${gameId},
        ${seasonNumber},
        COALESCE(${startDate}, NOW()),
        'active',
        ${minGamesThreshold},
        0
      )
      ON CONFLICT (game_id, season_number)
      DO UPDATE SET
        status = 'active',
        end_date = NULL
      RETURNING *
    `,
  )

  if (!created) {
    throw new Error("Failed to create active season")
  }

  return created
}


async function fetchCompletePlaythrough(playthroughId: string) {
  const rows = await sql`
    SELECT 
      p.id,
      p.game_id,
      p.group_id,
      p.season_id,
      p.timestamp,
      p.recorded_by,
      p.round_count,
      p.notes,
      COALESCE(
        json_agg(
          (
            jsonb_build_object(
              'resultId', pr.id,
              'id', pr.id,
              'playerId', pr.player_id,
              'playerName', pr.player_name,
              'rank', pr.rank,
              'leader', pr.leader_name,
              'leader_name', pr.leader_name,
              'leaderName', pr.leader_name,
              'leaderId', pr.leader_id,
              'score', pr.score,
              'victory_points', pr.score,
              'finalVp', pr.score,
              'spice', pr.endgame_spice_count,
              'endgameSpiceCount', pr.endgame_spice_count,
              'solari', pr.endgame_solari_count,
              'endgameSolariCount', pr.endgame_solari_count,
              'water', pr.endgame_water_count,
              'endgameWaterCount', pr.endgame_water_count,
              'cardsTrashedCount', pr.cards_trashed_count,
              'cardsTrashed', pr.cards_trashed_count,
              'finalDeckSize', pr.final_deck_size,
              'cards_in_deck', pr.final_deck_size,
              'turnOrderPosition', pr.turn_order_position,
              'strategicArchetypeName', pr.strategic_archetype_name,
              'strategic_archetype', pr.strategic_archetype_name,
              'strategicArchetypeId', pr.strategic_archetype_id,
              'final_conflict_strength', pr.final_conflict_strength,
              'final_conflict_place', pr.final_conflict_place,
              'finalConflictStrength', pr.final_conflict_strength,
              'finalConflictPlace', pr.final_conflict_place,
              'finalConflictGarrisonTroops', pr.final_conflict_garrison_troops,
              'final_conflict_garrison_troops', pr.final_conflict_garrison_troops,
              'finalConflictGarrisonCommanders', pr.final_conflict_garrison_commanders,
              'final_conflict_garrison_commanders', pr.final_conflict_garrison_commanders,
              'finalConflictDeployedTroops', pr.final_conflict_deployed_troops,
              'final_conflict_deployed_troops', pr.final_conflict_deployed_troops,
              'finalConflictDeployedCommanders', pr.final_conflict_deployed_commanders,
              'final_conflict_deployed_commanders', pr.final_conflict_deployed_commanders,
              'finalConflictDeployedSandworms', pr.final_conflict_deployed_sandworms,
              'final_conflict_deployed_sandworms', pr.final_conflict_deployed_sandworms
            ) ||
            jsonb_build_object(
              'finalConflictStrengthSourcesCommanderSkills', pr.final_conflict_strength_sources_commander_skills,
              'final_conflict_strength_sources_commander_skills', pr.final_conflict_strength_sources_commander_skills,
              'finalConflictStrengthSourcesIntrigue', pr.final_conflict_strength_sources_intrigue,
              'final_conflict_strength_sources_intrigue', pr.final_conflict_strength_sources_intrigue,
              'finalConflictStrengthSourcesImperium', pr.final_conflict_strength_sources_imperium,
              'final_conflict_strength_sources_imperium', pr.final_conflict_strength_sources_imperium,
              'finalConflictStrengthSourcesTech', pr.final_conflict_strength_sources_tech,
              'final_conflict_strength_sources_tech', pr.final_conflict_strength_sources_tech,
              'finalConflictStrengthSourcesUnaccounted', pr.final_conflict_strength_sources_unaccounted,
              'final_conflict_strength_sources_unaccounted', pr.final_conflict_strength_sources_unaccounted,
              'hasAllianceEmperor', pr.has_alliance_emperor,
              'has_alliance_emperor', pr.has_alliance_emperor,
              'hasAllianceSpacingGuild', pr.has_alliance_spacing_guild,
              'has_alliance_spacing_guild', pr.has_alliance_spacing_guild,
              'hasAllianceBeneGesserit', pr.has_alliance_bene_gesserit,
              'has_alliance_bene_gesserit', pr.has_alliance_bene_gesserit,
              'hasAllianceFremen', pr.has_alliance_fremen,
              'has_alliance_fremen', pr.has_alliance_fremen,
              'vpSourcesBase', pr.vp_sources_base,
              'vp_sources_base', pr.vp_sources_base,
              'vpSourcesFactions', pr.vp_sources_factions,
              'vp_sources_factions', pr.vp_sources_factions,
              'vpSourcesConflictCards', pr.vp_sources_conflict_cards,
              'vp_sources_conflict_cards', pr.vp_sources_conflict_cards,
              'vpSourcesFinalConflict', pr.vp_sources_final_conflict,
              'vp_sources_final_conflict', pr.vp_sources_final_conflict,
              'vpSourcesBattleIconMatches', pr.vp_sources_battle_icon_matches,
              'vp_sources_battle_icon_matches', pr.vp_sources_battle_icon_matches,
              'vpSourcesSpiceMustFlow', pr.vp_sources_spice_must_flow,
              'vp_sources_spice_must_flow', pr.vp_sources_spice_must_flow,
              'vpSourcesIntrigueCards', pr.vp_sources_intrigue_cards,
              'vp_sources_intrigue_cards', pr.vp_sources_intrigue_cards,
              'vpSourcesTechTiles', pr.vp_sources_tech_tiles,
              'vp_sources_tech_tiles', pr.vp_sources_tech_tiles,
              'vpSourcesImperiumCards', pr.vp_sources_imperium_cards,
              'vp_sources_imperium_cards', pr.vp_sources_imperium_cards,
              'vpSourcesLeaderAbilities', pr.vp_sources_leader_abilities,
              'vp_sources_leader_abilities', pr.vp_sources_leader_abilities,
              'finalRoundVpDelta', pr.final_round_vp_delta,
              'final_round_vp_delta', pr.final_round_vp_delta
            ) ||
            jsonb_build_object(
              'intrigueCardsPlayed', pr.intrigue_cards_played,
              'intrigue_cards_played', pr.intrigue_cards_played,
              'intrigueCardsHeldEndgame', pr.intrigue_cards_held_endgame,
              'intrigue_cards_held_endgame', pr.intrigue_cards_held_endgame,
              'conflictCardsWonCount', pr.conflict_cards_won_count,
              'conflict_cards_won_count', pr.conflict_cards_won_count,
              'objectiveCard', pr.objective_card,
              'objective_card', pr.objective_card,
              'contractsCompletedCount', pr.contracts_completed_count,
              'contracts_completed_count', pr.contracts_completed_count,
              'contractsHeldIncomplete', pr.contracts_held_incomplete,
              'contracts_held_incomplete', pr.contracts_held_incomplete,
              'techTilesCount', pr.tech_tiles_count,
              'tech_tiles_count', pr.tech_tiles_count,
              'controlMarkerCount', pr.control_marker_count,
              'control_marker_count', pr.control_marker_count,
              'commanderSkillsCount', pr.commander_skills_count,
              'commander_skills_count', pr.commander_skills_count,
              'spiesOnBoardEndgame', pr.spies_on_board_endgame,
              'spies_on_board_endgame', pr.spies_on_board_endgame,
              'hasHighCouncil', pr.has_high_council,
              'has_high_council', pr.has_high_council,
              'hasSwordmaster', pr.has_swordmaster,
              'has_swordmaster', pr.has_swordmaster,
              'hasMakerHooks', pr.has_maker_hooks,
              'has_maker_hooks', pr.has_maker_hooks,
              'influence_emperor', pr.influence_emperor,
              'influence_spacing_guild', pr.influence_spacing_guild,
              'influence_bene_gesserit', pr.influence_bene_gesserit,
              'influence_fremen', pr.influence_fremen,
              'vp_sources_unaccounted', pr.vp_sources_unaccounted,
              'notes', pr.notes
            )
          ) ORDER BY pr.rank
        ) FILTER (WHERE pr.id IS NOT NULL),
        '[]'::json
      ) as results
    FROM playthroughs p
    LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
    WHERE p.id = ${playthroughId}
    GROUP BY p.id, p.game_id, p.group_id, p.season_id, p.timestamp, p.recorded_by, p.round_count, p.notes
  `

  return attachTrackedItemsToPlaythrough(firstRow(rows))
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const timing = createServerTiming()
  try {
    const { gameId } = await params
    const includeDetails = ["1", "true", "full", "details"].includes(
      request.nextUrl.searchParams.get("includeDetails")?.toLowerCase() ?? "",
    )

    if (includeDetails) {
      const playthroughRows = await sql`
        SELECT id
        FROM playthroughs
        WHERE game_id = ${gameId}
        ORDER BY timestamp DESC
      `

      const completePlaythroughs = []
      for (const playthrough of playthroughRows) {
        const completePlaythrough = await fetchCompletePlaythrough(playthrough.id)
        if (completePlaythrough) {
          completePlaythroughs.push({
            ...completePlaythrough,
            isSummary: false,
            hasFullDetails: true,
          })
        }
      }

      return timing.json({ success: true, data: completePlaythroughs })
    }

    const playthroughs = await sql`
      SELECT 
        p.id,
        p.game_id,
        p.group_id,
        p.season_id,
        p.timestamp,
        p.recorded_by,
        p.round_count,
        p.round_count AS "roundCount",
        p.notes,
        true AS "isSummary",
        false AS "hasFullDetails",
        COALESCE(
          json_agg(
            jsonb_build_object(
              'resultId', pr.id,
              'id', pr.id,
              'playerId', pr.player_id,
              'player_id', pr.player_id,
              'playerName', pr.player_name,
              'player_name', pr.player_name,
              'rank', pr.rank,
              'leader', pr.leader_name,
              'leader_name', pr.leader_name,
              'leaderName', pr.leader_name,
              'leaderId', pr.leader_id,
              'leader_id', pr.leader_id,
              'strategicArchetypeName', pr.strategic_archetype_name,
              'strategic_archetype_name', pr.strategic_archetype_name,
              'strategic_archetype', pr.strategic_archetype_name,
              'strategicArchetypeId', pr.strategic_archetype_id,
              'strategic_archetype_id', pr.strategic_archetype_id,
              'score', pr.score,
              'victory_points', pr.score,
              'finalVp', pr.score,
              'final_vp', pr.score,
              'turnOrderPosition', pr.turn_order_position,
              'turn_order_position', pr.turn_order_position,
              'isSummary', true,
              'hasFullDetails', false
            ) ORDER BY pr.rank
          ) FILTER (WHERE pr.id IS NOT NULL),
          '[]'::json
        ) as results
      FROM playthroughs p
      LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
      WHERE p.game_id = ${gameId}
      GROUP BY p.id, p.game_id, p.group_id, p.season_id, p.timestamp, p.recorded_by, p.round_count, p.notes
      ORDER BY p.timestamp DESC
    `

    return timing.json({ success: true, data: playthroughs })
  } catch (error) {
    console.error("Error fetching playthroughs:", error)
    return timing.json(
      {
        success: false,
        error: "Failed to fetch playthroughs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const timing = createServerTiming()
  try {
    const userId = getUserId(request)
    const { gameId } = await params
    const body = await request.json()
    const { results } = body

    if (!results || !Array.isArray(results) || results.length === 0) {
      return timing.json({ success: false, error: "Results are required" }, { status: 400 })
    }

    const gameInfo = firstRow(
      await sql`
        SELECT g.id, g.group_id, g.game_type
        FROM games g
        WHERE g.id = ${gameId}
        LIMIT 1
      `,
    )

    if (!gameInfo) {
      return timing.json({ success: false, error: "Game not found" }, { status: 404 })
    }

    const season = await getOrCreateActiveSeason(gameId, gameInfo.group_id)
    const timestampIso = parseDateToIso(firstDefined(body, ["date", "timestamp"])) ?? new Date().toISOString()
    const roundCount = nullableNumber(firstDefined(body, ["roundCount", "round_count"]))
    const notes = nullableText(body.notes)

    const playthrough = firstRow(
      await sql`
        INSERT INTO playthroughs (game_id, group_id, season_id, recorded_by, timestamp, round_count, notes)
        VALUES (${gameId}, ${gameInfo.group_id}, ${season.id}, ${userId}, ${timestampIso}, ${roundCount}, ${notes})
        RETURNING *
      `,
    )

    if (!playthrough) throw new Error("Failed to create playthrough")

    const derivedFieldsByIndex = deriveDuneServerResultFields(results.map((result: Record<string, any>) => getDuneResultFields(result)))

    for (const [index, result] of results.entries()) {
      const playerName = nullableText(result.playerName)
      const rank = nullableNumber(result.rank)

      if (!playerName || rank === null) {
        throw new Error("Each result must include playerName and rank")
      }

      let actualPlayerId: string | null = null

      if (isUuid(result.playerId)) {
        actualPlayerId = result.playerId
      } else {
        const existingPlayer = firstRow(
          await sql`
            SELECT id FROM players
            WHERE group_id = ${gameInfo.group_id} AND LOWER(name) = LOWER(${playerName})
            LIMIT 1
          `,
        )

        if (existingPlayer) {
          actualPlayerId = existingPlayer.id
        } else {
          const newPlayer = firstRow(
            await sql`
              INSERT INTO players (name, group_id)
              VALUES (${playerName}, ${gameInfo.group_id})
              RETURNING id
            `,
          )
          actualPlayerId = newPlayer?.id ?? null
        }
      }

      let leaderName = nullableText(firstDefined(result, ["leaderName", "leader_name", "leader"]))
      let archetypeName = nullableText(
        firstDefined(result, ["strategicArchetypeName", "strategic_archetype_name", "strategic_archetype"]),
      )

      const leaderId = nullableUuid(result.leaderId)
      const strategicArchetypeId = nullableUuid(result.strategicArchetypeId)

      if (gameInfo.game_type === "dune") {
        if (leaderId) {
          const leader = firstRow(await sql`SELECT name FROM leaders WHERE id = ${leaderId} LIMIT 1`)
          leaderName = leader?.name ?? leaderName
        }

        if (strategicArchetypeId) {
          const archetype = firstRow(
            await sql`SELECT name FROM strategic_archetypes WHERE id = ${strategicArchetypeId} LIMIT 1`,
          )
          archetypeName = archetype?.name ?? archetypeName
        }
      }

      const fields = finaliseDuneServerResultFieldsForLeader(derivedFieldsByIndex[index], leaderName)

      const insertedResult = firstRow(
        await sql`
        INSERT INTO playthrough_results (
          playthrough_id,
          player_id,
          player_name,
          rank,
          leader_id,
          leader_name,
          score,
          turn_order_position,
          endgame_spice_count,
          endgame_solari_count,
          endgame_water_count,
          cards_trashed_count,
          final_deck_size,
          strategic_archetype_id,
          strategic_archetype_name,
          final_conflict_strength,
          final_conflict_place,
          final_conflict_garrison_troops,
          final_conflict_garrison_commanders,
          final_conflict_deployed_troops,
          final_conflict_deployed_commanders,
          final_conflict_deployed_sandworms,
          final_conflict_strength_sources_commander_skills,
          final_conflict_strength_sources_intrigue,
          final_conflict_strength_sources_imperium,
          final_conflict_strength_sources_tech,
          final_conflict_strength_sources_unaccounted,
          influence_emperor,
          influence_spacing_guild,
          influence_bene_gesserit,
          influence_fremen,
          has_alliance_emperor,
          has_alliance_spacing_guild,
          has_alliance_bene_gesserit,
          has_alliance_fremen,
          vp_sources_base,
          vp_sources_factions,
          vp_sources_conflict_cards,
          vp_sources_final_conflict,
          vp_sources_battle_icon_matches,
          vp_sources_spice_must_flow,
          vp_sources_intrigue_cards,
          vp_sources_tech_tiles,
          vp_sources_imperium_cards,
          vp_sources_leader_abilities,
          vp_sources_unaccounted,
          final_round_vp_delta,
          intrigue_cards_played,
          intrigue_cards_held_endgame,
          conflict_cards_won_count,
          objective_card,
          contracts_completed_count,
          contracts_held_incomplete,
          tech_tiles_count,
          control_marker_count,
          commander_skills_count,
          spies_on_board_endgame,
          has_high_council,
          high_council_seat_position,
          has_swordmaster,
          has_maker_hooks,
          notes
        )
        VALUES (
          ${playthrough.id},
          ${actualPlayerId},
          ${playerName},
          ${rank},
          ${leaderId},
          ${leaderName},
          ${fields.score},
          ${fields.turnOrderPosition},
          ${fields.endgameSpiceCount},
          ${fields.endgameSolariCount},
          ${fields.endgameWaterCount},
          ${fields.cardsTrashedCount},
          ${fields.finalDeckSize},
          ${strategicArchetypeId},
          ${archetypeName},
          ${fields.finalConflictStrength},
          ${fields.finalConflictPlace},
          ${fields.finalConflictGarrisonTroops},
          ${fields.finalConflictGarrisonCommanders},
          ${fields.finalConflictDeployedTroops},
          ${fields.finalConflictDeployedCommanders},
          ${fields.finalConflictDeployedSandworms},
          ${fields.finalConflictStrengthSourcesCommanderSkills},
          ${fields.finalConflictStrengthSourcesIntrigue},
          ${fields.finalConflictStrengthSourcesImperium},
          ${fields.finalConflictStrengthSourcesTech},
          ${fields.finalConflictStrengthSourcesUnaccounted},
          ${fields.influenceEmperor},
          ${fields.influenceSpacingGuild},
          ${fields.influenceBeneGesserit},
          ${fields.influenceFremen},
          ${fields.hasAllianceEmperor},
          ${fields.hasAllianceSpacingGuild},
          ${fields.hasAllianceBeneGesserit},
          ${fields.hasAllianceFremen},
          ${fields.vpSourcesBase},
          ${fields.vpSourcesFactions},
          ${fields.vpSourcesConflictCards},
          ${fields.vpSourcesFinalConflict},
          ${fields.vpSourcesBattleIconMatches},
          ${fields.vpSourcesSpiceMustFlow},
          ${fields.vpSourcesIntrigueCards},
          ${fields.vpSourcesTechTiles},
          ${fields.vpSourcesImperiumCards},
          ${fields.vpSourcesLeaderAbilities},
          ${fields.vpSourcesUnaccounted},
          ${fields.finalRoundVpDelta},
          ${fields.intrigueCardsPlayed},
          ${fields.intrigueCardsHeldEndgame},
          ${fields.conflictCardsWonCount},
          ${fields.objectiveCard},
          ${fields.contractsCompletedCount},
          ${fields.contractsHeldIncomplete},
          ${fields.techTilesCount},
          ${fields.controlMarkerCount},
          ${fields.commanderSkillsCount},
          ${fields.spiesOnBoardEndgame},
          ${fields.hasHighCouncil},
          ${fields.highCouncilSeatPosition},
          ${fields.hasSwordmaster},
          ${fields.hasMakerHooks},
          ${fields.notes}
        )
        RETURNING id
      `,
      )

      if (!insertedResult?.id) {
        throw new Error("Failed to create playthrough result")
      }

      await replacePlaythroughResultItems({
        playthroughId: playthrough.id,
        playthroughResultId: insertedResult.id,
        playerId: actualPlayerId,
        items: getSubmittedTrackedItems(result),
      })
    }

    const completePlaythrough = await fetchCompletePlaythrough(playthrough.id)

    return timing.json({
      success: true,
      data: completePlaythrough
        ? { ...completePlaythrough, isSummary: false, hasFullDetails: true }
        : completePlaythrough,
    })
  } catch (error) {
    console.error("Error creating playthrough:", error)
    return timing.json(
      {
        success: false,
        error: "Failed to create playthrough",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
