import type { SeasonSummary } from "./seasons"

export interface Group {
  id: string
  name: string
  code: string
  created_at: string | number
  created_by: string
  description?: string
}

export interface Game {
  id: string
  name: string
  group_id: string
  game_type?: string
  code?: string
  isPublic?: boolean
  is_public?: boolean
  created_at: string | number
  created_by: string
}

export interface Player {
  id: string
  name: string
  group_id: string
  created_at: string | number
}

export type NullableNumber = number | null | undefined
export type NullableBoolean = boolean | null | undefined

export interface PlaythroughPlayerResult {
  id?: string
  resultId?: string

  playerId?: string
  playerName: string
  rank: number

  leaderId?: string | null
  leaderName?: string | null
  leader_name?: string | null
  leader?: string | null

  strategicArchetypeId?: string | null
  strategicArchetypeName?: string | null
  strategic_archetype_id?: string | null
  strategic_archetype_name?: string | null
  strategic_archetype?: string | null

  score?: NullableNumber
  victory_points?: NullableNumber

  endgameSpiceCount?: NullableNumber
  endgame_spice_count?: NullableNumber
  endgameSolariCount?: NullableNumber
  endgame_solari_count?: NullableNumber
  endgameWaterCount?: NullableNumber
  endgame_water_count?: NullableNumber

  cardsTrashedCount?: NullableNumber
  cards_trashed_count?: NullableNumber
  finalDeckSize?: NullableNumber
  final_deck_size?: NullableNumber
  cards_in_deck?: NullableNumber

  turnOrderPosition?: NullableNumber
  turn_order_position?: NullableNumber

  finalConflictStrength?: NullableNumber
  final_conflict_strength?: NullableNumber
  finalConflictPlace?: NullableNumber
  final_conflict_place?: NullableNumber
  finalConflictGarrisonTroops?: NullableNumber
  final_conflict_garrison_troops?: NullableNumber
  finalConflictGarrisonCommanders?: NullableNumber
  final_conflict_garrison_commanders?: NullableNumber
  finalConflictDeployedTroops?: NullableNumber
  final_conflict_deployed_troops?: NullableNumber
  finalConflictDeployedCommanders?: NullableNumber
  final_conflict_deployed_commanders?: NullableNumber
  finalConflictDeployedSandworms?: NullableNumber
  final_conflict_deployed_sandworms?: NullableNumber
  finalConflictStrengthSourcesCommanderSkills?: NullableNumber
  final_conflict_strength_sources_commander_skills?: NullableNumber
  finalConflictStrengthSourcesIntrigue?: NullableNumber
  final_conflict_strength_sources_intrigue?: NullableNumber
  finalConflictStrengthSourcesImperium?: NullableNumber
  final_conflict_strength_sources_imperium?: NullableNumber
  finalConflictStrengthSourcesTech?: NullableNumber
  final_conflict_strength_sources_tech?: NullableNumber
  finalConflictStrengthSourcesUnaccounted?: NullableNumber
  final_conflict_strength_sources_unaccounted?: NullableNumber

  influenceEmperor?: NullableNumber
  influence_emperor?: NullableNumber
  influenceSpacingGuild?: NullableNumber
  influence_spacing_guild?: NullableNumber
  influenceBeneGesserit?: NullableNumber
  influence_bene_gesserit?: NullableNumber
  influenceFremen?: NullableNumber
  influence_fremen?: NullableNumber

  hasAllianceEmperor?: NullableBoolean
  has_alliance_emperor?: NullableBoolean
  hasAllianceSpacingGuild?: NullableBoolean
  has_alliance_spacing_guild?: NullableBoolean
  hasAllianceBeneGesserit?: NullableBoolean
  has_alliance_bene_gesserit?: NullableBoolean
  hasAllianceFremen?: NullableBoolean
  has_alliance_fremen?: NullableBoolean

  vpSourcesBase?: NullableNumber
  vp_sources_base?: NullableNumber
  vpSourcesFactions?: NullableNumber
  vp_sources_factions?: NullableNumber
  vpSourcesConflictCards?: NullableNumber
  vp_sources_conflict_cards?: NullableNumber
  vpSourcesFinalConflict?: NullableNumber
  vp_sources_final_conflict?: NullableNumber
  vpSourcesBattleIconMatches?: NullableNumber
  vp_sources_battle_icon_matches?: NullableNumber
  vpSourcesSpiceMustFlow?: NullableNumber
  vp_sources_spice_must_flow?: NullableNumber
  vpSourcesIntrigueCards?: NullableNumber
  vp_sources_intrigue_cards?: NullableNumber
  vpSourcesTechTiles?: NullableNumber
  vp_sources_tech_tiles?: NullableNumber
  vpSourcesImperiumCards?: NullableNumber
  vp_sources_imperium_cards?: NullableNumber
  vpSourcesLeaderAbilities?: NullableNumber
  vp_sources_leader_abilities?: NullableNumber
  vpSourcesUnaccounted?: NullableNumber
  vp_sources_unaccounted?: NullableNumber
  finalRoundVpDelta?: NullableNumber
  final_round_vp_delta?: NullableNumber

  intrigueCardsPlayed?: NullableNumber
  intrigue_cards_played?: NullableNumber
  intrigueCardsHeldEndgame?: NullableNumber
  intrigue_cards_held_endgame?: NullableNumber
  conflictCardsWonCount?: NullableNumber
  conflict_cards_won_count?: NullableNumber
  objectiveCard?: string | null
  objective_card?: string | null

  contractsCompletedCount?: NullableNumber
  contracts_completed_count?: NullableNumber
  contractsHeldIncomplete?: NullableNumber
  contracts_held_incomplete?: NullableNumber
  techTilesCount?: NullableNumber
  tech_tiles_count?: NullableNumber
  controlMarkerCount?: NullableNumber
  control_marker_count?: NullableNumber
  commanderSkillsCount?: NullableNumber
  commander_skills_count?: NullableNumber
  spiesOnBoardEndgame?: NullableNumber
  spies_on_board_endgame?: NullableNumber

  hasHighCouncil?: NullableBoolean
  has_high_council?: NullableBoolean
  highCouncilSeatPosition?: NullableNumber
  high_council_seat_position?: NullableNumber
  hasSwordmaster?: NullableBoolean
  has_swordmaster?: NullableBoolean
  hasMakerHooks?: NullableBoolean
  has_maker_hooks?: NullableBoolean

  notes?: string | null
  isSummary?: boolean
  hasFullDetails?: boolean

  // Legacy API aliases.
  finalVp?: NullableNumber
  final_vp?: NullableNumber
  finalResourcesSpice?: NullableNumber
  final_resources_spice?: NullableNumber
  finalResourcesSolari?: NullableNumber
  final_resources_solari?: NullableNumber
  finalResourcesWater?: NullableNumber
  final_resources_water?: NullableNumber
  cardsTrashed?: NullableNumber
  cards_trashed?: NullableNumber
  spice?: NullableNumber
  solari?: NullableNumber
  water?: NullableNumber
}

export interface Playthrough {
  id: string
  game_id: string
  group_id: string
  season_id?: string | null
  timestamp: string
  round_count?: NullableNumber
  roundCount?: NullableNumber
  notes?: string | null
  results: PlaythroughPlayerResult[]
  recorded_by: string
  isSummary?: boolean
  hasFullDetails?: boolean
}

export interface PlayerRanking {
  playerId: string
  playerName: string
  chips: number[]
  rankCounts: {
    first: number
    second: number
    third: number
    fourth: number
    other: number
  }
  totalPlaythroughs: number
  overallRank?: number
}

export interface GameLeaderboard {
  game: Game
  rankings: PlayerRanking[]
}

export interface GroupAccess {
  groupId: string
  hasAccess: boolean
  accessedAt: number
  role: "member" | "admin"
}

export interface GroupOverview {
  group: Group
  games: Game[]
  totalPlayers: number
  totalPlaythroughs: number
}

export interface LeaderboardInitialState {
  games: Game[]
  players: Player[]
  selectedGameId: string | null
  playthroughs: Playthrough[]
  currentSeasonSummary: SeasonSummary | null
  leaders: Array<{ id: string; name: string; faction?: string | null }>
  strategicArchetypes: Array<{ id: string; name: string; description?: string | null }>
}

