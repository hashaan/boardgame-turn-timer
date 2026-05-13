export const ACQUISITION_ITEM_TYPES = [
  "imperium_card",
  "reserve_card",
  "intrigue_card",
  "tech_tile",
  "sardaukar_skill",
  "contract",
  "conflict_card",
  "navigation_card",
  "starter_card",
] as const

export type AcquisitionItemType = (typeof ACQUISITION_ITEM_TYPES)[number]

export const DUNE_ACQUISITION_DECK_IDS = [
  "Imperium",
  "Reserve",
  "Intrigue",
  "Tech",
  "Sardaukar",
  "Contracts",
  "Conflict",
  "Navigation",
  "Starter",
] as const

export type DuneAcquisitionDeckId = (typeof DUNE_ACQUISITION_DECK_IDS)[number]

export const BATTLE_ICONS = ["Crysknife", "Desert Mouse", "Ornithopter", "Wild"] as const

export type BattleIcon = (typeof BATTLE_ICONS)[number]

export const ACQUISITION_ITEM_STATUSES = [
  "not_set",
  "in_final_deck",
  "trashed",
  "played",
  "held",
  "completed",
  "won",
] as const

export type AcquisitionItemStatus = (typeof ACQUISITION_ITEM_STATUSES)[number]


export type AcquisitionCostResource =
  | "Persuasion"
  | "Spice"
  | "Solari"
  | "Water"
  | "Other"

export interface AcquisitionPrintedCost {
  resource: AcquisitionCostResource
  amount: number
  label: string
}

export interface DuneAcquisitionOption {
  itemKey: string
  itemName: string
  itemType: AcquisitionItemType
  deckId: DuneAcquisitionDeckId
  deckName?: string
  source?: string | null
  compatibility?: string | null
  printedCost?: AcquisitionPrintedCost | null
  tags: string[]
  effectText?: string
  description?: string
  vpAvailable?: number
  copyCount?: number | null
  copyScope?: "global" | "per_player" | null
  conflictLevel?: number | null
  battleIcon?: BattleIcon | null
  searchText: string
}

export interface PlaythroughResultAcquisitionInput {
  itemKey: string
  itemName: string
  itemType: AcquisitionItemType
  deckId: DuneAcquisitionDeckId | string
  source?: string | null
  acquisitionCount: number
  itemStatus?: AcquisitionItemStatus | null
  item_status?: AcquisitionItemStatus | null
  vpCount?: number | null
  vp_count?: number | null
  strengthCount?: number | null
  strength_count?: number | null
  entrySource?: "manual" | "auto" | "vp_source" | "strength_source" | null
  entry_source?: "manual" | "auto" | "vp_source" | "strength_source" | null
  acquisitionMethod?: string | null
  acquisition_method?: string | null
  notes?: string | null
}

export interface PlaythroughResultAcquisition extends PlaythroughResultAcquisitionInput {
  id?: string

  playthroughId?: string
  playthrough_id?: string

  playthroughResultId?: string
  playthrough_result_id?: string

  playerId?: string | null
  player_id?: string | null

  item_key?: string
  item_name?: string
  item_type?: AcquisitionItemType
  deck_id?: DuneAcquisitionDeckId | string

  acquisition_count?: number
  acquisition_method?: string | null

  createdAt?: string | number
  created_at?: string | number
}

// Newer item-tracking terminology. The older "acquisition" names are kept
// because existing form state and API payloads still use `acquisitions`.
export const TRACKED_ITEM_TYPES = ACQUISITION_ITEM_TYPES
export type TrackedItemType = AcquisitionItemType

export const DUNE_TRACKED_ITEM_DECK_IDS = DUNE_ACQUISITION_DECK_IDS
export type DuneTrackedItemDeckId = DuneAcquisitionDeckId

export const TRACKED_ITEM_STATUSES = ACQUISITION_ITEM_STATUSES
export type TrackedItemStatus = AcquisitionItemStatus

export type PlaythroughResultTrackedItemInput = PlaythroughResultAcquisitionInput
export type PlaythroughResultTrackedItem = PlaythroughResultAcquisition
