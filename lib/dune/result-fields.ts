type Row = Record<string, any>

export const DUNE_RESULT_FIELD_ALIASES = {
  score: ["score", "finalVp", "final_vp", "victory_points"],
  turnOrderPosition: ["turnOrderPosition", "turn_order_position", "turnOrder"],
  highCouncilSeatPosition: ["highCouncilSeatPosition", "high_council_seat_position"],
  trackedItems: [
    "trackedItems",
    "playthroughResultItems",
    "playthrough_result_items",
    "items",
    "acquisitions",
    "playthroughResultAcquisitions",
    "playthrough_result_acquisitions",
    "cardAcquisitions",
    "card_acquisitions",
  ],
} as const

export const DUNE_RESULT_DB_COLUMNS = [
  "score",
  "turn_order_position",
  "endgame_spice_count",
  "endgame_solari_count",
  "endgame_water_count",
  "cards_trashed_count",
  "final_deck_size",
  "final_conflict_strength",
  "final_conflict_place",
  "final_conflict_garrison_troops",
  "final_conflict_garrison_commanders",
  "final_conflict_deployed_troops",
  "final_conflict_deployed_commanders",
  "final_conflict_deployed_sandworms",
  "final_conflict_strength_sources_commander_skills",
  "final_conflict_strength_sources_intrigue",
  "final_conflict_strength_sources_imperium",
  "final_conflict_strength_sources_tech",
  "final_conflict_strength_sources_unaccounted",
  "influence_emperor",
  "influence_spacing_guild",
  "influence_bene_gesserit",
  "influence_fremen",
  "has_alliance_emperor",
  "has_alliance_spacing_guild",
  "has_alliance_bene_gesserit",
  "has_alliance_fremen",
  "vp_sources_base",
  "vp_sources_factions",
  "vp_sources_conflict_cards",
  "vp_sources_final_conflict",
  "vp_sources_battle_icon_matches",
  "vp_sources_spice_must_flow",
  "vp_sources_intrigue_cards",
  "vp_sources_tech_tiles",
  "vp_sources_imperium_cards",
  "vp_sources_leader_abilities",
  "vp_sources_unaccounted",
  "final_round_vp_delta",
  "intrigue_cards_played",
  "intrigue_cards_held_endgame",
  "conflict_cards_won_count",
  "objective_card",
  "contracts_completed_count",
  "contracts_held_incomplete",
  "tech_tiles_count",
  "control_marker_count",
  "commander_skills_count",
  "spies_on_board_endgame",
  "has_high_council",
  "high_council_seat_position",
  "has_swordmaster",
  "has_maker_hooks",
  "notes",
] as const

export function firstDefined<T = unknown>(source: Row, keys: string[]): T | undefined {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key] as T
  }
  return undefined
}

export function nullableText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

export function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function nullableBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1

  const text = String(value).trim().toLowerCase()
  if (["true", "1", "yes", "y"].includes(text)) return true
  if (["false", "0", "no", "n"].includes(text)) return false

  return null
}

export function normaliseHasHighCouncil(source: Row): boolean | null {
  const seatPosition = nullableNumber(
    firstDefined(source, ["highCouncilSeatPosition", "high_council_seat_position"]),
  )

  if (seatPosition !== null) return true

  return nullableBoolean(firstDefined(source, ["hasHighCouncil", "has_high_council"]))
}

export function normaliseHighCouncilSeatPosition(source: Row, hasHighCouncil: boolean | null): number | null {
  if (hasHighCouncil === false) return null

  const seatPosition = nullableNumber(
    firstDefined(source, ["highCouncilSeatPosition", "high_council_seat_position"]),
  )

  if (seatPosition === null) return null
  if (!Number.isInteger(seatPosition)) return null
  if (seatPosition < 1 || seatPosition > 4) return null

  return seatPosition
}

export function getDuneResultFields(result: Row) {
  return {
    score: nullableNumber(firstDefined(result, ["score", "finalVp", "final_vp", "victory_points"])),
    turnOrderPosition: nullableNumber(firstDefined(result, ["turnOrderPosition", "turn_order_position", "turnOrder"])),

    endgameSpiceCount: nullableNumber(
      firstDefined(result, [
        "endgameSpiceCount",
        "endgame_spice_count",
        "finalResourcesSpice",
        "final_resources_spice",
        "spice",
      ]),
    ),
    endgameSolariCount: nullableNumber(
      firstDefined(result, [
        "endgameSolariCount",
        "endgame_solari_count",
        "finalResourcesSolari",
        "final_resources_solari",
        "solari",
      ]),
    ),
    endgameWaterCount: nullableNumber(
      firstDefined(result, [
        "endgameWaterCount",
        "endgame_water_count",
        "finalResourcesWater",
        "final_resources_water",
        "water",
      ]),
    ),

    cardsTrashedCount: nullableNumber(
      firstDefined(result, ["cardsTrashedCount", "cards_trashed_count", "cardsTrashed", "cards_trashed"]),
    ),
    finalDeckSize: nullableNumber(firstDefined(result, ["finalDeckSize", "final_deck_size", "cards_in_deck"])),

    finalConflictStrength: nullableNumber(firstDefined(result, ["finalConflictStrength", "final_conflict_strength"])),
    finalConflictPlace: nullableNumber(firstDefined(result, ["finalConflictPlace", "final_conflict_place"])),
    finalConflictGarrisonTroops: nullableNumber(
      firstDefined(result, ["finalConflictGarrisonTroops", "final_conflict_garrison_troops"]),
    ),
    finalConflictGarrisonCommanders: nullableNumber(
      firstDefined(result, ["finalConflictGarrisonCommanders", "final_conflict_garrison_commanders"]),
    ),
    finalConflictDeployedTroops: nullableNumber(
      firstDefined(result, ["finalConflictDeployedTroops", "final_conflict_deployed_troops"]),
    ),
    finalConflictDeployedCommanders: nullableNumber(
      firstDefined(result, ["finalConflictDeployedCommanders", "final_conflict_deployed_commanders"]),
    ),
    finalConflictDeployedSandworms: nullableNumber(
      firstDefined(result, ["finalConflictDeployedSandworms", "final_conflict_deployed_sandworms"]),
    ),

    finalConflictStrengthSourcesCommanderSkills: nullableNumber(
      firstDefined(result, [
        "finalConflictStrengthSourcesCommanderSkills",
        "final_conflict_strength_sources_commander_skills",
      ]),
    ),
    finalConflictStrengthSourcesIntrigue: nullableNumber(
      firstDefined(result, ["finalConflictStrengthSourcesIntrigue", "final_conflict_strength_sources_intrigue"]),
    ),
    finalConflictStrengthSourcesImperium: nullableNumber(
      firstDefined(result, ["finalConflictStrengthSourcesImperium", "final_conflict_strength_sources_imperium"]),
    ),
    finalConflictStrengthSourcesTech: nullableNumber(
      firstDefined(result, ["finalConflictStrengthSourcesTech", "final_conflict_strength_sources_tech"]),
    ),
    finalConflictStrengthSourcesUnaccounted: nullableNumber(
      firstDefined(result, ["finalConflictStrengthSourcesUnaccounted", "final_conflict_strength_sources_unaccounted"]),
    ),

    influenceEmperor: nullableNumber(firstDefined(result, ["influenceEmperor", "influence_emperor"])),
    influenceSpacingGuild: nullableNumber(firstDefined(result, ["influenceSpacingGuild", "influence_spacing_guild"])),
    influenceBeneGesserit: nullableNumber(firstDefined(result, ["influenceBeneGesserit", "influence_bene_gesserit"])),
    influenceFremen: nullableNumber(firstDefined(result, ["influenceFremen", "influence_fremen"])),

    hasAllianceEmperor: nullableBoolean(firstDefined(result, ["hasAllianceEmperor", "has_alliance_emperor"])),
    hasAllianceSpacingGuild: nullableBoolean(
      firstDefined(result, ["hasAllianceSpacingGuild", "has_alliance_spacing_guild"]),
    ),
    hasAllianceBeneGesserit: nullableBoolean(
      firstDefined(result, ["hasAllianceBeneGesserit", "has_alliance_bene_gesserit"]),
    ),
    hasAllianceFremen: nullableBoolean(firstDefined(result, ["hasAllianceFremen", "has_alliance_fremen"])),

    vpSourcesBase: nullableNumber(firstDefined(result, ["vpSourcesBase", "vp_sources_base"])),
    vpSourcesFactions: nullableNumber(firstDefined(result, ["vpSourcesFactions", "vp_sources_factions"])),
    vpSourcesConflictCards: nullableNumber(firstDefined(result, ["vpSourcesConflictCards", "vp_sources_conflict_cards"])),
    vpSourcesFinalConflict: nullableNumber(firstDefined(result, ["vpSourcesFinalConflict", "vp_sources_final_conflict"])),
    vpSourcesBattleIconMatches: nullableNumber(
      firstDefined(result, ["vpSourcesBattleIconMatches", "vp_sources_battle_icon_matches"]),
    ),
    vpSourcesSpiceMustFlow: nullableNumber(firstDefined(result, ["vpSourcesSpiceMustFlow", "vp_sources_spice_must_flow"])),
    vpSourcesIntrigueCards: nullableNumber(firstDefined(result, ["vpSourcesIntrigueCards", "vp_sources_intrigue_cards"])),
    vpSourcesTechTiles: nullableNumber(firstDefined(result, ["vpSourcesTechTiles", "vp_sources_tech_tiles"])),
    vpSourcesImperiumCards: nullableNumber(firstDefined(result, ["vpSourcesImperiumCards", "vp_sources_imperium_cards"])),
    vpSourcesLeaderAbilities: nullableNumber(firstDefined(result, ["vpSourcesLeaderAbilities", "vp_sources_leader_abilities"])),
    vpSourcesUnaccounted: nullableNumber(firstDefined(result, ["vpSourcesUnaccounted", "vp_sources_unaccounted"])),
    finalRoundVpDelta: nullableNumber(firstDefined(result, ["finalRoundVpDelta", "final_round_vp_delta"])),

    intrigueCardsPlayed: nullableNumber(firstDefined(result, ["intrigueCardsPlayed", "intrigue_cards_played"])),
    intrigueCardsHeldEndgame: nullableNumber(
      firstDefined(result, ["intrigueCardsHeldEndgame", "intrigue_cards_held_endgame"]),
    ),
    conflictCardsWonCount: nullableNumber(firstDefined(result, ["conflictCardsWonCount", "conflict_cards_won_count"])),
    objectiveCard: nullableText(firstDefined(result, ["objectiveCard", "objective_card"])),

    contractsCompletedCount: nullableNumber(firstDefined(result, ["contractsCompletedCount", "contracts_completed_count"])),
    contractsHeldIncomplete: nullableNumber(firstDefined(result, ["contractsHeldIncomplete", "contracts_held_incomplete"])),
    techTilesCount: nullableNumber(firstDefined(result, ["techTilesCount", "tech_tiles_count"])),
    controlMarkerCount: nullableNumber(firstDefined(result, ["controlMarkerCount", "control_marker_count"])),
    commanderSkillsCount: nullableNumber(firstDefined(result, ["commanderSkillsCount", "commander_skills_count"])),
    spiesOnBoardEndgame: nullableNumber(firstDefined(result, ["spiesOnBoardEndgame", "spies_on_board_endgame"])),

    hasHighCouncil: normaliseHasHighCouncil(result),
    highCouncilSeatPosition: normaliseHighCouncilSeatPosition(result, normaliseHasHighCouncil(result)),
    hasSwordmaster: nullableBoolean(firstDefined(result, ["hasSwordmaster", "has_swordmaster"])),
    hasMakerHooks: nullableBoolean(firstDefined(result, ["hasMakerHooks", "has_maker_hooks"])),

    notes: nullableText(firstDefined(result, ["notes"])),
  }
}

export type DuneResultFields = ReturnType<typeof getDuneResultFields>
export type MutableDuneResultFields = DuneResultFields & Record<string, any>

const SERVER_FACTIONS = [
  { influenceField: "influenceEmperor", allianceField: "hasAllianceEmperor" },
  { influenceField: "influenceSpacingGuild", allianceField: "hasAllianceSpacingGuild" },
  { influenceField: "influenceBeneGesserit", allianceField: "hasAllianceBeneGesserit" },
  { influenceField: "influenceFremen", allianceField: "hasAllianceFremen" },
] as const

function isBlankServerValue(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function influenceVp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 2 ? 1 : 0
}

function allianceVp(value: unknown): number {
  return value === true ? 1 : 0
}

function isSteersmanLeader(leaderName: string | null): boolean {
  return /steersman|y['’]?rkoon|yrkoon/i.test(leaderName ?? "")
}

function applyCountImpliedZeroesServer(fields: MutableDuneResultFields): MutableDuneResultFields {
  const next = { ...fields }

  if (next.techTilesCount === 0) {
    if (isBlankServerValue(next.vpSourcesTechTiles)) next.vpSourcesTechTiles = 0
    if (isBlankServerValue(next.finalConflictStrengthSourcesTech)) next.finalConflictStrengthSourcesTech = 0
  }

  if (next.commanderSkillsCount === 0 && isBlankServerValue(next.finalConflictStrengthSourcesCommanderSkills)) {
    next.finalConflictStrengthSourcesCommanderSkills = 0
  }

  if (next.intrigueCardsPlayed === 0 && next.intrigueCardsHeldEndgame === 0 && isBlankServerValue(next.vpSourcesIntrigueCards)) {
    next.vpSourcesIntrigueCards = 0
  }

  return next
}

function inferServerAlliances(rows: MutableDuneResultFields[]): MutableDuneResultFields[] {
  const nextRows = rows.map((row) => ({ ...row }))

  for (const faction of SERVER_FACTIONS) {
    const values = nextRows.map((row) => row[faction.influenceField])
    const numericValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const maxInfluence = numericValues.length > 0 ? Math.max(...numericValues) : -Infinity

    if (maxInfluence < 4) {
      for (const row of nextRows) row[faction.allianceField] = false
      continue
    }

    const winners = nextRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row[faction.influenceField] === maxInfluence)

    for (const row of nextRows) row[faction.allianceField] = false

    if (winners.length === 1) {
      winners[0].row[faction.allianceField] = true
    } else {
      for (const winner of winners) winner.row[faction.allianceField] = null
    }
  }

  return nextRows
}

function calculateServerFactionVp(fields: MutableDuneResultFields): number {
  return (
    influenceVp(fields.influenceEmperor) +
    influenceVp(fields.influenceSpacingGuild) +
    influenceVp(fields.influenceBeneGesserit) +
    influenceVp(fields.influenceFremen) +
    allianceVp(fields.hasAllianceEmperor) +
    allianceVp(fields.hasAllianceSpacingGuild) +
    allianceVp(fields.hasAllianceBeneGesserit) +
    allianceVp(fields.hasAllianceFremen)
  )
}

function enforceServerFinalConflictWithinTotal(fields: MutableDuneResultFields): MutableDuneResultFields {
  const finalVp = fields.vpSourcesFinalConflict
  if (typeof finalVp !== "number" || !Number.isFinite(finalVp) || finalVp <= 0) return fields

  const totalVp = fields.vpSourcesConflictCards
  if (typeof totalVp === "number" && Number.isFinite(totalVp) && totalVp >= finalVp) return fields

  return { ...fields, vpSourcesConflictCards: finalVp }
}

function calculateServerKnownVp(fields: MutableDuneResultFields): number {
  return (
    asNumber(fields.vpSourcesBase) +
    calculateServerFactionVp(fields) +
    asNumber(fields.vpSourcesConflictCards) +
    asNumber(fields.vpSourcesBattleIconMatches) +
    asNumber(fields.vpSourcesSpiceMustFlow) +
    asNumber(fields.vpSourcesIntrigueCards) +
    asNumber(fields.vpSourcesTechTiles) +
    asNumber(fields.vpSourcesImperiumCards) +
    asNumber(fields.vpSourcesLeaderAbilities)
  )
}

function calculateServerKnownStrength(fields: MutableDuneResultFields): number {
  return (
    asNumber(fields.finalConflictDeployedTroops) * 2 +
    asNumber(fields.finalConflictDeployedCommanders) * 2 +
    asNumber(fields.finalConflictDeployedSandworms) * 3 +
    asNumber(fields.finalConflictStrengthSourcesCommanderSkills) +
    asNumber(fields.finalConflictStrengthSourcesIntrigue) +
    asNumber(fields.finalConflictStrengthSourcesImperium) +
    asNumber(fields.finalConflictStrengthSourcesTech)
  )
}

function calculateServerConflictPlace(rows: MutableDuneResultFields[], index: number): number | null {
  const strength = rows[index]?.finalConflictStrength
  if (typeof strength !== "number" || !Number.isFinite(strength)) return null

  const strongerPlayers = rows.filter((row) => {
    const otherStrength = row.finalConflictStrength
    return typeof otherStrength === "number" && Number.isFinite(otherStrength) && otherStrength > strength
  }).length

  return strongerPlayers + 1
}

function zeroBlankServerVpSourcesWhenBalanced(fields: MutableDuneResultFields): MutableDuneResultFields {
  if (typeof fields.score !== "number" || !Number.isFinite(fields.score)) return fields
  if (fields.score - calculateServerKnownVp(fields) !== 0) return fields

  const next = { ...fields }
  for (const field of [
    "vpSourcesBase",
    "vpSourcesConflictCards",
    "vpSourcesBattleIconMatches",
    "vpSourcesSpiceMustFlow",
    "vpSourcesIntrigueCards",
    "vpSourcesTechTiles",
    "vpSourcesImperiumCards",
    "vpSourcesLeaderAbilities",
  ]) {
    if (isBlankServerValue(next[field])) next[field] = 0
  }

  return next
}

function zeroBlankServerStrengthSourcesWhenBalanced(fields: MutableDuneResultFields): MutableDuneResultFields {
  if (typeof fields.finalConflictStrength !== "number" || !Number.isFinite(fields.finalConflictStrength)) return fields
  if (fields.finalConflictStrength - calculateServerKnownStrength(fields) !== 0) return fields

  const next = { ...fields }
  for (const field of [
    "finalConflictStrengthSourcesCommanderSkills",
    "finalConflictStrengthSourcesIntrigue",
    "finalConflictStrengthSourcesImperium",
    "finalConflictStrengthSourcesTech",
  ]) {
    if (isBlankServerValue(next[field])) next[field] = 0
  }

  return next
}

export function deriveDuneServerResultFields(rawFields: DuneResultFields[]): MutableDuneResultFields[] {
  let rows = rawFields.map((fields) => applyCountImpliedZeroesServer(fields as MutableDuneResultFields))
  rows = inferServerAlliances(rows)
  rows = rows.map(enforceServerFinalConflictWithinTotal)

  return rows.map((row, index) => {
    let next = { ...row, finalConflictPlace: calculateServerConflictPlace(rows, index) }
    next.vpSourcesFactions = calculateServerFactionVp(next)
    next.finalConflictStrengthSourcesUnaccounted =
      typeof next.finalConflictStrength === "number" && Number.isFinite(next.finalConflictStrength)
        ? next.finalConflictStrength - calculateServerKnownStrength(next)
        : null
    next.vpSourcesUnaccounted =
      typeof next.score === "number" && Number.isFinite(next.score) ? next.score - calculateServerKnownVp(next) : null
    next = zeroBlankServerVpSourcesWhenBalanced(next)
    next = zeroBlankServerStrengthSourcesWhenBalanced(next)
    next.vpSourcesFactions = calculateServerFactionVp(next)
    next.finalConflictStrengthSourcesUnaccounted =
      typeof next.finalConflictStrength === "number" && Number.isFinite(next.finalConflictStrength)
        ? next.finalConflictStrength - calculateServerKnownStrength(next)
        : null
    next.vpSourcesUnaccounted =
      typeof next.score === "number" && Number.isFinite(next.score) ? next.score - calculateServerKnownVp(next) : null
    return next
  })
}

export function finaliseDuneServerResultFieldsForLeader(fields: MutableDuneResultFields, leaderName: string | null): MutableDuneResultFields {
  let next = { ...fields }
  if (!isSteersmanLeader(leaderName) && isBlankServerValue(next.vpSourcesLeaderAbilities)) {
    next.vpSourcesLeaderAbilities = 0
  }
  next = zeroBlankServerVpSourcesWhenBalanced(next)
  next.vpSourcesFactions = calculateServerFactionVp(next)
  next.vpSourcesUnaccounted =
    typeof next.score === "number" && Number.isFinite(next.score) ? next.score - calculateServerKnownVp(next) : null
  return next
}