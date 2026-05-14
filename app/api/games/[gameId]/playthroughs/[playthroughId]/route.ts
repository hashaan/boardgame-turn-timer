import { type NextRequest, NextResponse } from "next/server"
import { sql, getUserId } from "@/lib/db"
import {
  attachTrackedItemsToPlaythrough,
  getSubmittedTrackedItems,
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

function toResponseResult(row: any) {
  return {
    resultId: row.id,
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    rank: row.rank,

    leader: row.leader_name,
    leader_name: row.leader_name,
    leaderName: row.leader_name,
    leaderId: row.leader_id,

    score: row.score,
    victory_points: row.score,
    finalVp: row.score,
    final_vp: row.score,

    spice: row.endgame_spice_count,
    endgameSpiceCount: row.endgame_spice_count,
    endgame_spice_count: row.endgame_spice_count,
    finalResourcesSpice: row.endgame_spice_count,
    final_resources_spice: row.endgame_spice_count,

    solari: row.endgame_solari_count,
    endgameSolariCount: row.endgame_solari_count,
    endgame_solari_count: row.endgame_solari_count,
    finalResourcesSolari: row.endgame_solari_count,
    final_resources_solari: row.endgame_solari_count,

    water: row.endgame_water_count,
    endgameWaterCount: row.endgame_water_count,
    endgame_water_count: row.endgame_water_count,
    finalResourcesWater: row.endgame_water_count,
    final_resources_water: row.endgame_water_count,

    troops: null,
    finalResourcesTroops: null,
    final_resources_troops: null,

    cardsTrashedCount: row.cards_trashed_count,
    cards_trashed_count: row.cards_trashed_count,
    cardsTrashed: row.cards_trashed_count,
    cards_trashed: row.cards_trashed_count,

    cards_in_deck: row.final_deck_size,
    finalDeckSize: row.final_deck_size,
    final_deck_size: row.final_deck_size,

    turnOrderPosition: row.turn_order_position,
    turn_order_position: row.turn_order_position,

    strategic_archetype: row.strategic_archetype_name,
    strategic_archetype_name: row.strategic_archetype_name,
    strategicArchetypeName: row.strategic_archetype_name,
    strategicArchetypeId: row.strategic_archetype_id,

    final_conflict_strength: row.final_conflict_strength,
    final_conflict_place: row.final_conflict_place,
    final_conflict_garrison_troops: row.final_conflict_garrison_troops,
    final_conflict_garrison_commanders: row.final_conflict_garrison_commanders,
    final_conflict_deployed_troops: row.final_conflict_deployed_troops,
    final_conflict_deployed_commanders: row.final_conflict_deployed_commanders,
    final_conflict_deployed_sandworms: row.final_conflict_deployed_sandworms,
    final_conflict_strength_sources_commander_skills: row.final_conflict_strength_sources_commander_skills,
    final_conflict_strength_sources_intrigue: row.final_conflict_strength_sources_intrigue,
    final_conflict_strength_sources_imperium: row.final_conflict_strength_sources_imperium,
    final_conflict_strength_sources_tech: row.final_conflict_strength_sources_tech,
    final_conflict_strength_sources_unaccounted: row.final_conflict_strength_sources_unaccounted,

    influence_emperor: row.influence_emperor,
    influence_spacing_guild: row.influence_spacing_guild,
    influence_bene_gesserit: row.influence_bene_gesserit,
    influence_fremen: row.influence_fremen,

    has_alliance_emperor: row.has_alliance_emperor,
    has_alliance_spacing_guild: row.has_alliance_spacing_guild,
    has_alliance_bene_gesserit: row.has_alliance_bene_gesserit,
    has_alliance_fremen: row.has_alliance_fremen,

    vp_sources_base: row.vp_sources_base,
    vp_sources_factions: row.vp_sources_factions,
    vp_sources_conflict_cards: row.vp_sources_conflict_cards,
    vp_sources_final_conflict: row.vp_sources_final_conflict,
    vp_sources_battle_icon_matches: row.vp_sources_battle_icon_matches,
    vp_sources_spice_must_flow: row.vp_sources_spice_must_flow,
    vp_sources_intrigue_cards: row.vp_sources_intrigue_cards,
    vp_sources_tech_tiles: row.vp_sources_tech_tiles,
    vp_sources_imperium_cards: row.vp_sources_imperium_cards,
    vp_sources_leader_abilities: row.vp_sources_leader_abilities,
    vp_sources_unaccounted: row.vp_sources_unaccounted,
    final_round_vp_delta: row.final_round_vp_delta,

    intrigue_cards_played: row.intrigue_cards_played,
    intrigue_cards_held_endgame: row.intrigue_cards_held_endgame,
    conflict_cards_won_count: row.conflict_cards_won_count,
    objective_card: row.objective_card,

    contracts_completed_count: row.contracts_completed_count,
    contracts_held_incomplete: row.contracts_held_incomplete,
    tech_tiles_count: row.tech_tiles_count,
    control_marker_count: row.control_marker_count,
    commander_skills_count: row.commander_skills_count,
    spies_on_board_endgame: row.spies_on_board_endgame,

    has_high_council: row.has_high_council,
    highCouncilSeatPosition: row.high_council_seat_position,
    high_council_seat_position: row.high_council_seat_position,
    has_swordmaster: row.has_swordmaster,
    has_maker_hooks: row.has_maker_hooks,

    notes: row.notes,
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string; playthroughId: string }> }) {
  const timing = createServerTiming()
  try {
    const userId = getUserId(request)
    const { gameId, playthroughId } = await params

    const [game] = await sql`
      SELECT g.id, g.group_id
      FROM games g
      INNER JOIN group_access ga ON g.group_id = ga.group_id
      WHERE g.id = ${gameId} AND ga.user_id = ${userId}
      LIMIT 1
    `

    if (!game) {
      return timing.json({ success: false, error: "Game not found or access denied" }, { status: 404 })
    }

    const [playthrough] = await sql`
      SELECT
        id,
        game_id,
        group_id,
        season_id,
        timestamp,
        recorded_by,
        round_count,
        round_count AS "roundCount",
        notes
      FROM playthroughs
      WHERE id = ${playthroughId} AND game_id = ${gameId}
      LIMIT 1
    `

    if (!playthrough) {
      return timing.json({ success: false, error: "Playthrough not found" }, { status: 404 })
    }

    const results = await sql`
      SELECT *
      FROM playthrough_results
      WHERE playthrough_id = ${playthroughId}
      ORDER BY rank
    `

    const fullPlaythrough = await attachTrackedItemsToPlaythrough({
      ...playthrough,
      isSummary: false,
      hasFullDetails: true,
      results: results.map(toResponseResult),
    })

    return timing.json({ success: true, data: fullPlaythrough })
  } catch (error) {
    console.error("Error fetching playthrough:", error)
    return timing.json(
      {
        success: false,
        error: "Failed to fetch playthrough",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ gameId: string; playthroughId: string }> }) {
  const timing = createServerTiming()
  try {
    const userId = getUserId(request)
    const { gameId, playthroughId } = await params

    const [game] = await sql`
      SELECT g.id, g.group_id
      FROM games g
      INNER JOIN group_access ga ON g.group_id = ga.group_id
      WHERE g.id = ${gameId} AND ga.user_id = ${userId}
      LIMIT 1
    `

    if (!game) {
      return timing.json({ success: false, error: "Game not found or access denied" }, { status: 404 })
    }

    const [playthrough] = await sql`
      SELECT id FROM playthroughs
      WHERE id = ${playthroughId} AND game_id = ${gameId}
      LIMIT 1
    `

    if (!playthrough) {
      return timing.json({ success: false, error: "Playthrough not found" }, { status: 404 })
    }

    await sql`
      DELETE FROM playthroughs
      WHERE id = ${playthroughId}
    `

    return timing.json({ success: true })
  } catch (error) {
    console.error("Error deleting playthrough:", error)
    return timing.json({ success: false, error: "Failed to delete playthrough" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ gameId: string; playthroughId: string }> }) {
  const timing = createServerTiming()
  try {
    const userId = getUserId(request)
    const { gameId, playthroughId } = await params
    const bodyPromise = timing.time("parse_body", () => request.json())
    const contextPromise = timing.time("load_context", () => sql`
      SELECT
        g.id AS game_id,
        g.group_id,
        g.game_type,
        p.id AS playthrough_id,
        p.timestamp,
        p.recorded_by,
        p.season_id,
        p.round_count,
        p.notes
      FROM games g
      INNER JOIN group_access ga ON g.group_id = ga.group_id
      LEFT JOIN playthroughs p ON p.id = ${playthroughId} AND p.game_id = g.id
      WHERE g.id = ${gameId} AND ga.user_id = ${userId}
      LIMIT 1
    `)

    const [body, [context]] = await Promise.all([bodyPromise, contextPromise])
    const { results, date } = body

    if (!results || !Array.isArray(results) || results.length === 0) {
      return timing.json({ success: false, error: "Results are required" }, { status: 400 })
    }

    if (!context) {
      return timing.json({ success: false, error: "Game not found or access denied" }, { status: 404 })
    }

    if (!context.playthrough_id) {
      return timing.json({ success: false, error: "Playthrough not found" }, { status: 404 })
    }

    const game = {
      id: context.game_id,
      group_id: context.group_id,
      game_type: context.game_type,
    }

    const ranks = results.map((r: any) => nullableNumber(r.rank))
    if (ranks.some((rank: number | null) => rank === null)) {
      return timing.json({ success: false, error: "Each result must include a valid rank" }, { status: 400 })
    }

    const uniqueRanks = new Set(ranks)
    if (ranks.length !== uniqueRanks.size) {
      return timing.json({ success: false, error: "Each player must have a unique rank" }, { status: 400 })
    }

    const sortedRanks = [...ranks].sort((a, b) => Number(a) - Number(b))
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        return timing.json(
          { success: false, error: "Ranks must be consecutive starting from 1st place" },
          { status: 400 },
        )
      }
    }

    const playerNames = results.map((result: any) => nullableText(result.playerName))
    if (playerNames.some((playerName: string | null) => !playerName)) {
      return timing.json({ success: false, error: "Each result must include playerName and rank" }, { status: 400 })
    }

    const submittedPlayersByName = new Map<string, { id: string; name: string }>()
    for (const result of results) {
      const playerId = nullableUuid(firstDefined(result, ["playerId", "player_id"]))
      const playerName = nullableText(result.playerName)
      if (playerId && playerName) {
        submittedPlayersByName.set(playerName.toLowerCase(), { id: playerId, name: playerName })
      }
    }

    const playerNamesNeedingLookup = playerNames
      .filter((playerName): playerName is string => typeof playerName === "string" && playerName.length > 0)
      .filter((playerName) => !submittedPlayersByName.has(playerName.toLowerCase()))
    const normalisedPlayerNames = [...new Set(playerNamesNeedingLookup.map((playerName) => playerName.toLowerCase()))]
    const leaderIdsNeedingLookup = [
      ...new Set(
        results
          .filter((result: any) => !nullableText(firstDefined(result, ["leaderName", "leader_name", "leader"])))
          .map((result: any) => nullableUuid(firstDefined(result, ["leaderId", "leader_id"])))
          .filter((id: string | null): id is string => id !== null),
      ),
    ]
    const strategicArchetypeIdsNeedingLookup = [
      ...new Set(
        results
          .filter(
            (result: any) =>
              !nullableText(
                firstDefined(result, ["strategicArchetypeName", "strategic_archetype_name", "strategic_archetype"]),
              ),
          )
          .map((result: any) => nullableUuid(firstDefined(result, ["strategicArchetypeId", "strategic_archetype_id"])))
          .filter((id: string | null): id is string => id !== null),
      ),
    ]

    const [existingPlayers, leaderRows, strategicArchetypeRows] = await timing.time("load_reference_data", () => Promise.all([
      normalisedPlayerNames.length > 0
        ? timing.time("load_players", () => sql`
            SELECT id, name
            FROM players
            WHERE group_id = ${game.group_id}
              AND LOWER(name) = ANY(${normalisedPlayerNames}::text[])
          `)
        : Promise.resolve([]),
      game.game_type === "dune" && leaderIdsNeedingLookup.length > 0
        ? timing.time("load_leaders", () => sql`
            SELECT id, name
            FROM leaders
            WHERE id = ANY(${leaderIdsNeedingLookup}::uuid[])
          `)
        : Promise.resolve([]),
      game.game_type === "dune" && strategicArchetypeIdsNeedingLookup.length > 0
        ? timing.time("load_strategic_archetypes", () => sql`
            SELECT id, name
            FROM strategic_archetypes
            WHERE id = ANY(${strategicArchetypeIdsNeedingLookup}::uuid[])
          `)
        : Promise.resolve([]),
    ]))

    const playersByName = new Map<string, any>()
    for (const player of submittedPlayersByName.values()) {
      playersByName.set(String(player.name).toLowerCase(), player)
    }

    for (const player of existingPlayers) {
      playersByName.set(String(player.name).toLowerCase(), player)
    }

    const missingPlayerNames = playerNames
      .filter((playerName): playerName is string => typeof playerName === "string" && playerName.length > 0)
      .filter((playerName) => !playersByName.has(playerName.toLowerCase()))
      .filter((playerName, index, all) => all.findIndex((name) => name.toLowerCase() === playerName.toLowerCase()) === index)

    if (missingPlayerNames.length > 0) {
      const missingPlayersPayload = JSON.stringify(missingPlayerNames.map((name) => ({ name })))
      const insertedPlayers = await timing.time("insert_missing_players", () => sql`
        INSERT INTO players (name, group_id)
        SELECT player.name, ${game.group_id}
        FROM jsonb_to_recordset(${missingPlayersPayload}::jsonb) AS player(name text)
        RETURNING id, name
      `)

      for (const player of insertedPlayers) {
        playersByName.set(String(player.name).toLowerCase(), player)
      }
    }

    const leadersById = new Map<string, any>()
    for (const leader of leaderRows) {
      leadersById.set(String(leader.id), leader)
    }

    const strategicArchetypesById = new Map<string, any>()
    for (const archetype of strategicArchetypeRows) {
      strategicArchetypesById.set(String(archetype.id), archetype)
    }

    const prepareStartedAt = performance.now()
    const derivedFieldsByIndex = deriveDuneServerResultFields(results.map((result: Record<string, any>) => getDuneResultFields(result)))
    const preparedResults = results.map((result: Record<string, any>, index: number) => {
      const playerName = nullableText(result.playerName)
      const rank = nullableNumber(result.rank)

      if (!playerName || rank === null) {
        throw new Error("Each result must include playerName and rank")
      }

      const player = playersByName.get(playerName.toLowerCase())
      if (!player) {
        throw new Error(`Could not resolve player ${playerName}`)
      }

      const leaderId = nullableUuid(firstDefined(result, ["leaderId", "leader_id"]))
      const strategicArchetypeId = nullableUuid(firstDefined(result, ["strategicArchetypeId", "strategic_archetype_id"]))

      let leaderName = nullableText(firstDefined(result, ["leaderName", "leader_name", "leader"]))
      let archetypeName = nullableText(
        firstDefined(result, ["strategicArchetypeName", "strategic_archetype_name", "strategic_archetype"]),
      )

      if (game.game_type === "dune") {
        if (leaderId) leaderName = leadersById.get(leaderId)?.name ?? leaderName
        if (strategicArchetypeId) archetypeName = strategicArchetypesById.get(strategicArchetypeId)?.name ?? archetypeName
      }

      const fields = finaliseDuneServerResultFieldsForLeader(derivedFieldsByIndex[index], leaderName)

      return {
        row_index: index,
        player_id: player.id,
        player_name: playerName,
        rank,
        leader_id: leaderId,
        leader_name: leaderName,
        score: fields.score,
        turn_order_position: fields.turnOrderPosition,
        endgame_spice_count: fields.endgameSpiceCount,
        endgame_solari_count: fields.endgameSolariCount,
        endgame_water_count: fields.endgameWaterCount,
        cards_trashed_count: fields.cardsTrashedCount,
        final_deck_size: fields.finalDeckSize,
        strategic_archetype_id: strategicArchetypeId,
        strategic_archetype_name: archetypeName,
        final_conflict_strength: fields.finalConflictStrength,
        final_conflict_place: fields.finalConflictPlace,
        final_conflict_garrison_troops: fields.finalConflictGarrisonTroops,
        final_conflict_garrison_commanders: fields.finalConflictGarrisonCommanders,
        final_conflict_deployed_troops: fields.finalConflictDeployedTroops,
        final_conflict_deployed_commanders: fields.finalConflictDeployedCommanders,
        final_conflict_deployed_sandworms: fields.finalConflictDeployedSandworms,
        final_conflict_strength_sources_commander_skills: fields.finalConflictStrengthSourcesCommanderSkills,
        final_conflict_strength_sources_intrigue: fields.finalConflictStrengthSourcesIntrigue,
        final_conflict_strength_sources_imperium: fields.finalConflictStrengthSourcesImperium,
        final_conflict_strength_sources_tech: fields.finalConflictStrengthSourcesTech,
        final_conflict_strength_sources_unaccounted: fields.finalConflictStrengthSourcesUnaccounted,
        influence_emperor: fields.influenceEmperor,
        influence_spacing_guild: fields.influenceSpacingGuild,
        influence_bene_gesserit: fields.influenceBeneGesserit,
        influence_fremen: fields.influenceFremen,
        has_alliance_emperor: fields.hasAllianceEmperor,
        has_alliance_spacing_guild: fields.hasAllianceSpacingGuild,
        has_alliance_bene_gesserit: fields.hasAllianceBeneGesserit,
        has_alliance_fremen: fields.hasAllianceFremen,
        vp_sources_base: fields.vpSourcesBase,
        vp_sources_factions: fields.vpSourcesFactions,
        vp_sources_conflict_cards: fields.vpSourcesConflictCards,
        vp_sources_final_conflict: fields.vpSourcesFinalConflict,
        vp_sources_battle_icon_matches: fields.vpSourcesBattleIconMatches,
        vp_sources_spice_must_flow: fields.vpSourcesSpiceMustFlow,
        vp_sources_intrigue_cards: fields.vpSourcesIntrigueCards,
        vp_sources_tech_tiles: fields.vpSourcesTechTiles,
        vp_sources_imperium_cards: fields.vpSourcesImperiumCards,
        vp_sources_leader_abilities: fields.vpSourcesLeaderAbilities,
        vp_sources_unaccounted: fields.vpSourcesUnaccounted,
        final_round_vp_delta: fields.finalRoundVpDelta,
        intrigue_cards_played: fields.intrigueCardsPlayed,
        intrigue_cards_held_endgame: fields.intrigueCardsHeldEndgame,
        conflict_cards_won_count: fields.conflictCardsWonCount,
        objective_card: fields.objectiveCard,
        contracts_completed_count: fields.contractsCompletedCount,
        contracts_held_incomplete: fields.contractsHeldIncomplete,
        tech_tiles_count: fields.techTilesCount,
        control_marker_count: fields.controlMarkerCount,
        commander_skills_count: fields.commanderSkillsCount,
        spies_on_board_endgame: fields.spiesOnBoardEndgame,
        has_high_council: fields.hasHighCouncil,
        high_council_seat_position: fields.highCouncilSeatPosition,
        has_swordmaster: fields.hasSwordmaster,
        has_maker_hooks: fields.hasMakerHooks,
        notes: fields.notes,
      }
    })

    timing.mark("prepare_results", prepareStartedAt)

    const timestampIso = parseDateToIso(date)
    const roundCount = nullableNumber(firstDefined(body, ["roundCount", "round_count"]))
    const notes = body.notes === undefined ? undefined : nullableText(body.notes)

    const resultPayload = JSON.stringify(preparedResults)

    const updateAndDeleteRows = await timing.time("update_and_delete_results", () => sql`
      WITH updated_playthrough AS (
        UPDATE playthroughs
        SET
          timestamp = COALESCE(${timestampIso}, timestamp),
          round_count = COALESCE(${roundCount}, round_count),
          notes = CASE WHEN ${body.notes === undefined} THEN notes ELSE ${notes} END
        WHERE id = ${playthroughId}
        RETURNING id, game_id, group_id, timestamp, recorded_by, season_id, round_count, round_count AS "roundCount", notes
      ), deleted_results AS (
        DELETE FROM playthrough_results
        WHERE playthrough_id = (SELECT id FROM updated_playthrough)
      )
      SELECT *
      FROM updated_playthrough
    `)
    const [updatedPlaythrough] = updateAndDeleteRows
    const trackedItemRows = results.flatMap((result: Record<string, any>, rowIndex: number) =>
      getSubmittedTrackedItems(result).map((item) => ({
        row_index: rowIndex,
        item_key: item.itemKey,
        item_name: item.itemName,
        item_type: item.itemType,
        deck_id: item.deckId,
        source: item.source ?? null,
        acquisition_count: item.acquisitionCount,
        item_status: item.itemStatus ?? item.item_status ?? null,
        vp_count: item.vpCount ?? item.vp_count ?? 0,
        strength_count: item.strengthCount ?? item.strength_count ?? 0,
        entry_source: item.entrySource ?? item.entry_source ?? null,
        acquisition_method: item.acquisitionMethod ?? null,
        notes: item.notes ?? null,
      })),
    )
    const trackedItemPayload = JSON.stringify(trackedItemRows)

    const insertedResults = await timing.time("insert_results_and_items", () => sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${resultPayload}::jsonb) AS result(
          row_index integer,
          player_id text,
          player_name text,
          rank integer,
          leader_id text,
          leader_name text,
          score numeric,
          turn_order_position integer,
          endgame_spice_count integer,
          endgame_solari_count integer,
          endgame_water_count integer,
          cards_trashed_count integer,
          final_deck_size integer,
          strategic_archetype_id text,
          strategic_archetype_name text,
          final_conflict_strength integer,
          final_conflict_place integer,
          final_conflict_garrison_troops integer,
          final_conflict_garrison_commanders integer,
          final_conflict_deployed_troops integer,
          final_conflict_deployed_commanders integer,
          final_conflict_deployed_sandworms integer,
          final_conflict_strength_sources_commander_skills integer,
          final_conflict_strength_sources_intrigue integer,
          final_conflict_strength_sources_imperium integer,
          final_conflict_strength_sources_tech integer,
          final_conflict_strength_sources_unaccounted integer,
          influence_emperor integer,
          influence_spacing_guild integer,
          influence_bene_gesserit integer,
          influence_fremen integer,
          has_alliance_emperor boolean,
          has_alliance_spacing_guild boolean,
          has_alliance_bene_gesserit boolean,
          has_alliance_fremen boolean,
          vp_sources_base integer,
          vp_sources_factions integer,
          vp_sources_conflict_cards integer,
          vp_sources_final_conflict integer,
          vp_sources_battle_icon_matches integer,
          vp_sources_spice_must_flow integer,
          vp_sources_intrigue_cards integer,
          vp_sources_tech_tiles integer,
          vp_sources_imperium_cards integer,
          vp_sources_leader_abilities integer,
          vp_sources_unaccounted integer,
          final_round_vp_delta integer,
          intrigue_cards_played integer,
          intrigue_cards_held_endgame integer,
          conflict_cards_won_count integer,
          objective_card text,
          contracts_completed_count integer,
          contracts_held_incomplete integer,
          tech_tiles_count integer,
          control_marker_count integer,
          commander_skills_count integer,
          spies_on_board_endgame integer,
          has_high_council boolean,
          high_council_seat_position integer,
          has_swordmaster boolean,
          has_maker_hooks boolean,
          notes text
        )
      ), inserted AS (
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
        SELECT
          ${playthroughId}::uuid,
          NULLIF(input.player_id, '')::uuid,
          input.player_name,
          input.rank,
          NULLIF(input.leader_id, '')::uuid,
          input.leader_name,
          input.score,
          input.turn_order_position,
          input.endgame_spice_count,
          input.endgame_solari_count,
          input.endgame_water_count,
          input.cards_trashed_count,
          input.final_deck_size,
          NULLIF(input.strategic_archetype_id, '')::uuid,
          input.strategic_archetype_name,
          input.final_conflict_strength,
          input.final_conflict_place,
          input.final_conflict_garrison_troops,
          input.final_conflict_garrison_commanders,
          input.final_conflict_deployed_troops,
          input.final_conflict_deployed_commanders,
          input.final_conflict_deployed_sandworms,
          input.final_conflict_strength_sources_commander_skills,
          input.final_conflict_strength_sources_intrigue,
          input.final_conflict_strength_sources_imperium,
          input.final_conflict_strength_sources_tech,
          input.final_conflict_strength_sources_unaccounted,
          input.influence_emperor,
          input.influence_spacing_guild,
          input.influence_bene_gesserit,
          input.influence_fremen,
          input.has_alliance_emperor,
          input.has_alliance_spacing_guild,
          input.has_alliance_bene_gesserit,
          input.has_alliance_fremen,
          input.vp_sources_base,
          input.vp_sources_factions,
          input.vp_sources_conflict_cards,
          input.vp_sources_final_conflict,
          input.vp_sources_battle_icon_matches,
          input.vp_sources_spice_must_flow,
          input.vp_sources_intrigue_cards,
          input.vp_sources_tech_tiles,
          input.vp_sources_imperium_cards,
          input.vp_sources_leader_abilities,
          input.vp_sources_unaccounted,
          input.final_round_vp_delta,
          input.intrigue_cards_played,
          input.intrigue_cards_held_endgame,
          input.conflict_cards_won_count,
          input.objective_card,
          input.contracts_completed_count,
          input.contracts_held_incomplete,
          input.tech_tiles_count,
          input.control_marker_count,
          input.commander_skills_count,
          input.spies_on_board_endgame,
          input.has_high_council,
          input.high_council_seat_position,
          input.has_swordmaster,
          input.has_maker_hooks,
          input.notes
        FROM input
        ORDER BY input.row_index
        RETURNING *
      ), item_input AS (
        SELECT *
        FROM jsonb_to_recordset(${trackedItemPayload}::jsonb) AS item(
          row_index integer,
          item_key text,
          item_name text,
          item_type text,
          deck_id text,
          source text,
          acquisition_count integer,
          item_status text,
          vp_count integer,
          strength_count integer,
          entry_source text,
          acquisition_method text,
          notes text
        )
      ), inserted_items AS (
        INSERT INTO playthrough_result_items (
          playthrough_id,
          playthrough_result_id,
          player_id,
          item_key,
          item_name,
          item_type,
          deck_id,
          source,
          acquisition_count,
          item_status,
          vp_count,
          strength_count,
          entry_source,
          acquisition_method,
          notes
        )
        SELECT
          ${playthroughId}::uuid,
          inserted.id,
          inserted.player_id,
          item_input.item_key,
          item_input.item_name,
          item_input.item_type,
          item_input.deck_id,
          item_input.source,
          item_input.acquisition_count,
          item_input.item_status,
          item_input.vp_count,
          item_input.strength_count,
          item_input.entry_source,
          item_input.acquisition_method,
          item_input.notes
        FROM item_input
        INNER JOIN input ON input.row_index = item_input.row_index
        INNER JOIN inserted ON inserted.rank = input.rank
        ON CONFLICT (playthrough_result_id, item_key)
        DO UPDATE SET
          item_name = EXCLUDED.item_name,
          item_type = EXCLUDED.item_type,
          deck_id = EXCLUDED.deck_id,
          source = EXCLUDED.source,
          acquisition_count = EXCLUDED.acquisition_count,
          item_status = EXCLUDED.item_status,
          vp_count = EXCLUDED.vp_count,
          strength_count = EXCLUDED.strength_count,
          entry_source = EXCLUDED.entry_source,
          acquisition_method = EXCLUDED.acquisition_method,
          notes = EXCLUDED.notes
        RETURNING id
      )
      SELECT inserted.*, input.row_index
      FROM inserted
      INNER JOIN input ON input.rank = inserted.rank
      ORDER BY input.row_index
    `)

    const responseStartedAt = performance.now()
    const playthroughResults = insertedResults.map((row: any) => {
      const originalResult = results[Number(row.row_index)]
      const trackedItems = originalResult ? getSubmittedTrackedItems(originalResult) : []

      return {
        ...toResponseResult(row),
        trackedItems,
        playthroughResultItems: trackedItems,
        playthrough_result_items: trackedItems,
        acquisitions: trackedItems,
        playthroughResultAcquisitions: trackedItems,
        playthrough_result_acquisitions: trackedItems,
      }
    })

    const response = {
      ...updatedPlaythrough,
      isSummary: false,
      hasFullDetails: true,
      results: playthroughResults,
    }

    timing.mark("build_response", responseStartedAt)

    return timing.json({ success: true, data: response })
  } catch (error) {
    console.error("Error updating playthrough:", error)
    return timing.json(
      {
        success: false,
        error: "Failed to update playthrough",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
