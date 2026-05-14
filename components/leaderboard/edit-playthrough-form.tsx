"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { AcquisitionsEditor } from "@/components/leaderboard/acquisitions-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ChevronDown, ChevronRight, ChevronUp, Edit, Flag, Gem, Landmark, Loader2, NotebookText, PlusCircle, ScrollText, Shield, Swords, Trash2, Trophy, Zap } from "lucide-react"
import { DUNE_ACQUISITION_OPTIONS } from "@/lib/dune-acquisition-inventory"
import { calculateBattleIconVpForResult } from "@/lib/dune-battle-icons"
import { getDuneReferenceData } from "@/lib/dune-reference-data"
import type { Player } from "@/types/leaderboard"
import type { AcquisitionItemStatus, AcquisitionItemType, PlaythroughResultAcquisitionInput } from "@/types/dune-acquisitions"
import { getOrdinalSuffix } from "@/utils/leaderboard-utils"

interface EditPlaythroughFormProps {
  playthrough: any
  existingPlayers: Player[]
  onSubmit: (results: PlaythroughSubmitResult[], date?: string, roundCount?: number) => Promise<void>
  onCancel: () => void
}

interface PlayerRankInput {
  id: string
  playerId?: string
  playerName: string
  rank: string
  isNewPlayer: boolean
  leaderId?: string
  leaderName?: string
  strategicArchetypeId?: string
  strategicArchetypeName?: string

  score?: number
  turnOrderPosition?: number

  vpSourcesBase?: number
  vpSourcesConflictCards?: number
  vpSourcesFinalConflict?: number
  vpSourcesBattleIconMatches?: number
  vpSourcesSpiceMustFlow?: number
  vpSourcesIntrigueCards?: number
  vpSourcesTechTiles?: number
  vpSourcesImperiumCards?: number
  vpSourcesLeaderAbilities?: number
  vpSourcesFactions?: number
  vpSourcesUnaccounted?: number

  endgameSpiceCount?: number
  endgameSolariCount?: number
  endgameWaterCount?: number

  influenceEmperor?: number
  influenceSpacingGuild?: number
  influenceBeneGesserit?: number
  influenceFremen?: number
  hasAllianceEmperor?: boolean
  hasAllianceSpacingGuild?: boolean
  hasAllianceBeneGesserit?: boolean
  hasAllianceFremen?: boolean

  finalConflictStrength?: number
  finalConflictPlace?: number
  finalConflictGarrisonTroops?: number
  finalConflictGarrisonCommanders?: number
  finalConflictDeployedTroops?: number
  finalConflictDeployedCommanders?: number
  finalConflictDeployedSandworms?: number
  finalConflictStrengthSourcesCommanderSkills?: number
  finalConflictStrengthSourcesIntrigue?: number
  finalConflictStrengthSourcesImperium?: number
  finalConflictStrengthSourcesTech?: number
  finalConflictStrengthSourcesUnaccounted?: number

  cardsTrashedCount?: number
  finalDeckSize?: number
  intrigueCardsPlayed?: number
  intrigueCardsHeldEndgame?: number
  conflictCardsWonCount?: number
  objectiveCard?: string

  contractsCompletedCount?: number
  contractsHeldIncomplete?: number
  techTilesCount?: number
  controlMarkerCount?: number
  commanderSkillsCount?: number
  spiesOnBoardEndgame?: number
  hasHighCouncil?: boolean
  highCouncilSeatPosition?: number
  hasSwordmaster?: boolean
  hasMakerHooks?: boolean

  acquisitions?: PlaythroughResultAcquisitionInput[]

  notes?: string
}


type PlaythroughSubmitResult = Omit<PlayerRankInput, "id" | "isNewPlayer" | "rank"> & {
  playerName: string
  rank: number
}

type PlayerField = keyof PlayerRankInput

const numberFields: PlayerField[] = [
  "score",
  "turnOrderPosition",
  "vpSourcesBase",
  "vpSourcesConflictCards",
  "vpSourcesFinalConflict",
  "vpSourcesBattleIconMatches",
  "vpSourcesSpiceMustFlow",
  "vpSourcesIntrigueCards",
  "vpSourcesTechTiles",
  "vpSourcesImperiumCards",
  "vpSourcesLeaderAbilities",
  "vpSourcesFactions",
  "vpSourcesUnaccounted",
  "endgameSpiceCount",
  "endgameSolariCount",
  "endgameWaterCount",
  "influenceEmperor",
  "influenceSpacingGuild",
  "influenceBeneGesserit",
  "influenceFremen",
  "finalConflictStrength",
  "finalConflictPlace",
  "finalConflictGarrisonTroops",
  "finalConflictGarrisonCommanders",
  "finalConflictDeployedTroops",
  "finalConflictDeployedCommanders",
  "finalConflictDeployedSandworms",
  "finalConflictStrengthSourcesCommanderSkills",
  "finalConflictStrengthSourcesIntrigue",
  "finalConflictStrengthSourcesImperium",
  "finalConflictStrengthSourcesTech",
  "finalConflictStrengthSourcesUnaccounted",
  "cardsTrashedCount",
  "finalDeckSize",
  "intrigueCardsPlayed",
  "intrigueCardsHeldEndgame",
  "conflictCardsWonCount",
  "contractsCompletedCount",
  "contractsHeldIncomplete",
  "techTilesCount",
  "controlMarkerCount",
  "commanderSkillsCount",
  "spiesOnBoardEndgame",
  "highCouncilSeatPosition",
]

const boolFields: PlayerField[] = [
  "hasAllianceEmperor",
  "hasAllianceSpacingGuild",
  "hasAllianceBeneGesserit",
  "hasAllianceFremen",
  "hasHighCouncil",
  "hasSwordmaster",
  "hasMakerHooks",
]


function hasAdvancedData(result: PlayerRankInput) {
  if ((result.acquisitions?.length ?? 0) > 0) return true

  const advancedFields: PlayerField[] = [
    ...numberFields,
    ...boolFields,
    "leaderName",
    "strategicArchetypeId",
    "objectiveCard",
    "notes",
  ]

  return advancedFields.some((field) => {
    const value = result[field]
    return value !== undefined && value !== null && value !== ""
  })
}

function getNumber(result: any, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = result?.[key]
    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }
  }
  return undefined
}

function getText(result: any, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = result?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value)
  }
  return undefined
}

function getBoolean(result: any, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = result?.[key]
    if (value === true || value === false) return value
    if (value === 1 || value === "1" || value === "true") return true
    if (value === 0 || value === "0" || value === "false") return false
  }
  return undefined
}

function parseNumberInput(value: string): number | undefined {
  if (value.trim() === "") return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normaliseSelectId(value: string): string | undefined {
  return value === "none" ? undefined : value
}

const OBJECTIVE_OPTIONS = [
  { value: "desert_mouse", label: "Desert Mouse" },
  { value: "desert_mouse_first_player", label: "Desert Mouse (First Player)" },
  { value: "ornithopter", label: "Ornithopter" },
  { value: "crysknife", label: "Crysknife" },
]

type FactionKey = "emperor" | "spacingGuild" | "beneGesserit" | "fremen"

const FACTIONS: Array<{
  key: FactionKey
  influenceField: string
  allianceField: string
}> = [
  { key: "emperor", influenceField: "influenceEmperor", allianceField: "hasAllianceEmperor" },
  { key: "spacingGuild", influenceField: "influenceSpacingGuild", allianceField: "hasAllianceSpacingGuild" },
  { key: "beneGesserit", influenceField: "influenceBeneGesserit", allianceField: "hasAllianceBeneGesserit" },
  { key: "fremen", influenceField: "influenceFremen", allianceField: "hasAllianceFremen" },
]

function getFactionForInfluenceField(field: string): FactionKey | undefined {
  return FACTIONS.find((faction) => faction.influenceField === field)?.key
}

function getFactionConfig(key: FactionKey) {
  return FACTIONS.find((faction) => faction.key === key)!
}


function numericValue(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function vpFromInfluence(value: number | undefined): number {
  return typeof value === "number" && value >= 2 ? 1 : 0
}

function vpFromAlliance(value: boolean | undefined): number {
  return value === true ? 1 : 0
}

function calculateFactionVp(result: Record<string, any>): number {
  return (
    vpFromInfluence(result.influenceEmperor) +
    vpFromInfluence(result.influenceSpacingGuild) +
    vpFromInfluence(result.influenceBeneGesserit) +
    vpFromInfluence(result.influenceFremen) +
    vpFromAlliance(result.hasAllianceEmperor) +
    vpFromAlliance(result.hasAllianceSpacingGuild) +
    vpFromAlliance(result.hasAllianceBeneGesserit) +
    vpFromAlliance(result.hasAllianceFremen)
  )
}

function enforceFinalConflictWithinTotal<T extends Record<string, any>>(result: T): T {
  const finalVp = result.vpSourcesFinalConflict

  // A positive final-conflict VP is a lower bound on total conflict reward VP.
  // A zero final-conflict VP means “no VP from the final conflict”, not
  // “no VP from earlier conflict rewards”, so it must not erase total conflict reward VP.
  if (typeof finalVp !== "number" || !Number.isFinite(finalVp) || finalVp <= 0) return result

  const totalVp = result.vpSourcesConflictCards
  if (typeof totalVp === "number" && Number.isFinite(totalVp) && totalVp >= finalVp) return result

  return { ...result, vpSourcesConflictCards: finalVp }
}

function wasConflictVpDerivedFromFinalConflict(result: Record<string, any>): boolean {
  const finalVp = result.vpSourcesFinalConflict
  const conflictVp = result.vpSourcesConflictCards

  return (
    typeof finalVp === "number" &&
    Number.isFinite(finalVp) &&
    finalVp > 0 &&
    typeof conflictVp === "number" &&
    Number.isFinite(conflictVp) &&
    conflictVp === finalVp
  )
}

function syncConflictVpForFinalConflictChange<T extends Record<string, any>>(previous: T, updated: T): T {
  const nextFinalVp = updated.vpSourcesFinalConflict
  const previousConflictVp = previous.vpSourcesConflictCards
  const conflictWasDerived = wasConflictVpDerivedFromFinalConflict(previous)

  if (typeof nextFinalVp === "number" && Number.isFinite(nextFinalVp) && nextFinalVp > 0) {
    if (
      conflictWasDerived ||
      typeof previousConflictVp !== "number" ||
      !Number.isFinite(previousConflictVp) ||
      previousConflictVp < nextFinalVp
    ) {
      return { ...updated, vpSourcesConflictCards: nextFinalVp }
    }

    return updated
  }

  if (conflictWasDerived) {
    return { ...updated, vpSourcesConflictCards: undefined }
  }

  return updated
}

function itemisedVpMinimum(result: Record<string, any>, itemTypes: AcquisitionItemType[]): number {
  return sumAcquisitionVp(result.acquisitions ?? [], itemTypes)
}

function effectiveVpSourceTotal(result: Record<string, any>, value: number | null | undefined, itemTypes: AcquisitionItemType[]): number {
  return Math.max(numericValue(value), itemisedVpMinimum(result, itemTypes))
}

function effectiveIntrigueVpSourceTotal(result: Record<string, any>): number {
  return Math.max(numericValue(result.vpSourcesIntrigueCards), sumSupportedIntrigueVp(result))
}

function calculateKnownVp(result: Record<string, any>): number {
  return (
    numericValue(result.vpSourcesBase) +
    calculateFactionVp(result) +
    effectiveVpSourceTotal(result, result.vpSourcesConflictCards, ["conflict_card"]) +
    numericValue(result.vpSourcesBattleIconMatches) +
    numericValue(result.vpSourcesSpiceMustFlow) +
    effectiveIntrigueVpSourceTotal(result) +
    effectiveVpSourceTotal(result, result.vpSourcesTechTiles, ["tech_tile"]) +
    effectiveVpSourceTotal(result, result.vpSourcesImperiumCards, ["imperium_card", "reserve_card", "starter_card"]) +
    numericValue(
      isSteersmanLeader(result)
        ? Math.max(numericValue(result.vpSourcesLeaderAbilities), itemisedVpMinimum(result, ["navigation_card"]))
        : undefined,
    )
  )
}

function calculateFinalConflictKnownStrength(result: Record<string, any>): number {
  return (
    numericValue(result.finalConflictDeployedTroops) * 2 +
    numericValue(result.finalConflictDeployedCommanders) * 2 +
    numericValue(result.finalConflictDeployedSandworms) * 3 +
    numericValue(result.finalConflictStrengthSourcesCommanderSkills) +
    numericValue(result.finalConflictStrengthSourcesIntrigue) +
    numericValue(result.finalConflictStrengthSourcesImperium) +
    numericValue(result.finalConflictStrengthSourcesTech)
  )
}

function calculateConflictPlace(results: Array<Record<string, any>>, resultIndex: number): number | undefined {
  const strength = results[resultIndex]?.finalConflictStrength
  if (typeof strength !== "number" || !Number.isFinite(strength)) return undefined

  const strongerPlayers = results.filter((result) => {
    const otherStrength = result.finalConflictStrength
    return typeof otherStrength === "number" && Number.isFinite(otherStrength) && otherStrength > strength
  }).length

  return strongerPlayers + 1
}



function getAcquisitionsFromResult(result: any): PlaythroughResultAcquisitionInput[] {
  const raw =
    result?.acquisitions ??
    result?.resultAcquisitions ??
    result?.result_acquisitions ??
    result?.playthroughResultAcquisitions ??
    result?.playthrough_result_acquisitions

  if (!Array.isArray(raw)) return []

  return raw.map((item: any) => ({
    itemKey: item.itemKey ?? item.item_key,
    itemName: item.itemName ?? item.item_name,
    itemType: item.itemType ?? item.item_type,
    deckId: item.deckId ?? item.deck_id,
    source: item.source,
    acquisitionCount: getNumber(item, "acquisitionCount", "acquisition_count") ?? 1,
    itemStatus: item.itemStatus ?? item.item_status ?? undefined,
    vpCount: getNumber(item, "vpCount", "vp_count"),
    entrySource: item.entrySource ?? item.entry_source ?? "manual",
    notes: item.notes,
  })).filter((item: PlaythroughResultAcquisitionInput) => item.itemKey && item.itemName && item.itemType && item.deckId)
}

function acquisitionCount(item: PlaythroughResultAcquisitionInput): number {
  return typeof item.acquisitionCount === "number" && Number.isFinite(item.acquisitionCount) && item.acquisitionCount > 0
    ? Math.trunc(item.acquisitionCount)
    : 1
}

function acquisitionStatus(item: PlaythroughResultAcquisitionInput): AcquisitionItemStatus | undefined {
  return item.itemStatus ?? item.item_status ?? undefined
}

function hasAcquisitionType(items: PlaythroughResultAcquisitionInput[], itemType: AcquisitionItemType): boolean {
  return items.some((item) => item.itemType === itemType)
}

function countAcquisitions(
  items: PlaythroughResultAcquisitionInput[],
  itemType: AcquisitionItemType,
  statuses?: AcquisitionItemStatus[],
): number {
  const allowedStatuses = statuses ? new Set(statuses) : null

  return items.reduce((total, item) => {
    if (item.itemType !== itemType) return total
    if (allowedStatuses && !allowedStatuses.has(acquisitionStatus(item) ?? "not_set")) return total
    return total + acquisitionCount(item)
  }, 0)
}

function countAcquisitionsForTypes(
  items: PlaythroughResultAcquisitionInput[],
  itemTypes: AcquisitionItemType[],
  statuses?: AcquisitionItemStatus[],
): number {
  const allowedTypes = new Set(itemTypes)
  const allowedStatuses = statuses ? new Set(statuses) : null

  return items.reduce((total, item) => {
    if (!allowedTypes.has(item.itemType)) return total
    if (allowedStatuses && !allowedStatuses.has(acquisitionStatus(item) ?? "not_set")) return total
    return total + acquisitionCount(item)
  }, 0)
}

function validNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined
}

function syncSummaryCount(
  currentValue: number | undefined,
  previousValue: number | undefined,
  previousFloor: number,
  nextFloor: number,
): number | undefined {
  void previousValue
  void previousFloor
  void nextFloor

  // Count summaries are partial-record totals. Itemised rows are evidence,
  // not proof that the full count is known.
  return validNumber(currentValue)
}

function syncStrictSummaryCount(
  currentValue: number | undefined,
  previousValue: number | undefined,
  previousFloor: number,
  nextFloor: number,
): number | undefined {
  const current = validNumber(currentValue)

  if (typeof current === "number") {
    if (previousFloor > 0 && current === previousFloor && nextFloor !== previousFloor) {
      return nextFloor > 0 ? nextFloor : undefined
    }
    return current
  }

  if (nextFloor > 0) return nextFloor
  return undefined
}

function summaryTotal(...values: Array<number | undefined>): number | undefined {
  const validValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (validValues.length === 0) return undefined
  return validValues.reduce((total, value) => total + Math.max(0, Math.trunc(value)), 0)
}

function isSpiceMustFlowAcquisition(item: PlaythroughResultAcquisitionInput): boolean {
  return (
    (item.itemType === "reserve_card" || item.itemType === "imperium_card") &&
    /the spice must flow/i.test(item.itemName)
  )
}

function countSpiceMustFlowAcquisitions(items: PlaythroughResultAcquisitionInput[]): number {
  return items.reduce((total, item) => {
    if (!isSpiceMustFlowAcquisition(item)) return total
    return total + acquisitionCount(item)
  }, 0)
}

function getAcquisitionOption(item: PlaythroughResultAcquisitionInput) {
  return DUNE_ACQUISITION_OPTIONS.find((option) => option.itemKey === item.itemKey)
}

function acquisitionOptionText(item: PlaythroughResultAcquisitionInput): string {
  const option = getAcquisitionOption(item)
  return [option?.effectText, option?.description, option?.searchText].filter(Boolean).join(" ")
}

function isTrashThisCardVpAcquisition(item: PlaythroughResultAcquisitionInput): boolean {
  if (item.itemType !== "imperium_card" && item.itemType !== "reserve_card") return false
  return /trash\s+this\s+card/i.test(acquisitionOptionText(item))
}

function acquisitionVpCount(item: PlaythroughResultAcquisitionInput): number {
  const option = getAcquisitionOption(item)
  if (!option?.vpAvailable || option.vpAvailable <= 0) return 0
  if (isSpiceMustFlowAcquisition(item)) return 0

  const raw = item.vpCount ?? item.vp_count
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return 0

  const value = Math.trunc(raw)

  if (isTrashThisCardVpAcquisition(item)) {
    return Math.min(value, Math.trunc(option.vpAvailable))
  }

  // The row editor owns context-sensitive conflict reward caps, including
  // sandworm doubling via Maker Hooks. Preserve the entered row value here.
  if (item.itemType === "conflict_card") return value

  // Some Imperium card abilities can be triggered more than once, so do not
  // cap their VP entry at the printed metadata flag.
  if (item.itemType === "imperium_card") return value

  return Math.min(value, Math.trunc(option.vpAvailable))
}

function hasVpTrackedAcquisitions(items: PlaythroughResultAcquisitionInput[], itemTypes: AcquisitionItemType[]): boolean {
  const allowedTypes = new Set(itemTypes)
  return items.some((item) => allowedTypes.has(item.itemType) && acquisitionVpCount(item) > 0)
}

function sumAcquisitionVp(items: PlaythroughResultAcquisitionInput[], itemTypes: AcquisitionItemType[]): number {
  const allowedTypes = new Set(itemTypes)
  return items.reduce((total, item) => {
    if (!allowedTypes.has(item.itemType)) return total
    return total + acquisitionVpCount(item)
  }, 0)
}

const BATTLE_ICON_INTRIGUE_VP_NAMES = new Set(["crysknife", "desert mouse", "ornithopter", "grasp arrakis"])

function isBattleIconIntrigueVpSource(item: PlaythroughResultAcquisitionInput): boolean {
  return item.itemType === "intrigue_card" && BATTLE_ICON_INTRIGUE_VP_NAMES.has(item.itemName.trim().toLowerCase())
}

function sumSupportedIntrigueVp(result: { acquisitions?: PlaythroughResultAcquisitionInput[] | null; objectiveCard?: string | null; objective_card?: string | null }): number {
  const acquisitions = result.acquisitions ?? []
  const nonBattleIconIntrigueVp = acquisitions.reduce((total, item) => {
    if (item.itemType !== "intrigue_card") return total
    if (isBattleIconIntrigueVpSource(item)) return total
    return total + acquisitionVpCount(item)
  }, 0)

  return nonBattleIconIntrigueVp + calculateBattleIconVpForResult(result).iconIntrigueVp
}

function acquisitionStrengthCount(item: PlaythroughResultAcquisitionInput): number {
  const raw = item.strengthCount ?? item.strength_count
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return 0
  return Math.trunc(raw)
}

function hasStrengthTrackedAcquisitions(items: PlaythroughResultAcquisitionInput[], itemTypes: AcquisitionItemType[]): boolean {
  const allowedTypes = new Set(itemTypes)
  return items.some((item) => allowedTypes.has(item.itemType) && acquisitionStrengthCount(item) > 0)
}

function sumAcquisitionStrength(items: PlaythroughResultAcquisitionInput[], itemTypes: AcquisitionItemType[]): number {
  const allowedTypes = new Set(itemTypes)
  return items.reduce((total, item) => {
    if (!allowedTypes.has(item.itemType)) return total
    return total + acquisitionStrengthCount(item)
  }, 0)
}

function syncStrengthSummaryField(
  previousAcquisitions: PlaythroughResultAcquisitionInput[],
  acquisitions: PlaythroughResultAcquisitionInput[],
  previousValue: number | undefined,
  currentValue: number | undefined,
  itemTypes: AcquisitionItemType[],
): number | undefined {
  const previousHadTrackedItems = hasStrengthTrackedAcquisitions(previousAcquisitions, itemTypes)
  const nextHasTrackedItems = hasStrengthTrackedAcquisitions(acquisitions, itemTypes)
  const previousSum = sumAcquisitionStrength(previousAcquisitions, itemTypes)
  const nextSum = sumAcquisitionStrength(acquisitions, itemTypes)

  const current = validNumber(currentValue)

  if (nextHasTrackedItems) {
    // As with VP, itemised strength is a known minimum, not necessarily
    // the complete source total.
    return current
  }

  if (previousHadTrackedItems && current === previousSum) return undefined
  return current
}

function getSpiceMustFlowOption() {
  return DUNE_ACQUISITION_OPTIONS.find(
    (option) =>
      option.itemType === "reserve_card" &&
      /the spice must flow/i.test(option.itemName),
  )
}

function isNavigationCard08Acquisition(item: PlaythroughResultAcquisitionInput): boolean {
  return item.itemType === "navigation_card" && /navigation card 08/i.test(item.itemName)
}

function getNavigationCard08Option() {
  return DUNE_ACQUISITION_OPTIONS.find(
    (option) => option.itemType === "navigation_card" && /navigation card 08/i.test(option.itemName),
  )
}

function syncNavigationCard08FromLeaderVp(
  acquisitions: PlaythroughResultAcquisitionInput[] = [],
  leaderVp: number | undefined,
): PlaythroughResultAcquisitionInput[] {
  const requested = typeof leaderVp === "number" && Number.isFinite(leaderVp) && leaderVp > 0 ? 1 : 0
  const withoutNav08 = acquisitions.filter((item) => !isNavigationCard08Acquisition(item))
  if (requested === 0) return withoutNav08

  const existing = acquisitions.find(isNavigationCard08Acquisition)
  const option = getNavigationCard08Option()
  if (!existing && !option) return acquisitions

  const base: PlaythroughResultAcquisitionInput = existing ?? {
    itemKey: option!.itemKey,
    itemName: option!.itemName,
    itemType: option!.itemType,
    deckId: option!.deckId,
    source: option!.source,
    itemStatus: "played",
    entrySource: "auto",
    acquisitionCount: 1,
    vpCount: 1,
  }

  return [...withoutNav08, { ...base, acquisitionCount: 1, itemStatus: "played", vpCount: 1 }]
}

function removeNavigationAcquisitions(acquisitions: PlaythroughResultAcquisitionInput[] = []): PlaythroughResultAcquisitionInput[] {
  return acquisitions.filter((item) => item.itemType !== "navigation_card")
}

function syncSpiceMustFlowAcquisitionFromVp(
  acquisitions: PlaythroughResultAcquisitionInput[] = [],
  vpCount: number | undefined,
): PlaythroughResultAcquisitionInput[] {
  const requestedCount = typeof vpCount === "number" && Number.isFinite(vpCount) && vpCount > 0 ? Math.trunc(vpCount) : 0
  const withoutSmf = acquisitions.filter((item) => !isSpiceMustFlowAcquisition(item))
  if (requestedCount === 0) return withoutSmf

  const existing = acquisitions.find(isSpiceMustFlowAcquisition)
  const option = getSpiceMustFlowOption()
  if (!existing && !option) return acquisitions

  const copyCount = option?.copyCount
  const count = typeof copyCount === "number" && copyCount > 0 ? Math.min(requestedCount, copyCount) : requestedCount

  const base: PlaythroughResultAcquisitionInput = existing ?? {
    itemKey: option!.itemKey,
    itemName: option!.itemName,
    itemType: option!.itemType,
    deckId: option!.deckId,
    source: option!.source,
    itemStatus: "in_final_deck",
    entrySource: "auto",
    vpCount: 0,
    acquisitionCount: count,
  }

  return [...withoutSmf, { ...base, acquisitionCount: count }]
}

function syncSpiceMustFlowForForm<T extends { acquisitions?: PlaythroughResultAcquisitionInput[] | null; vpSourcesSpiceMustFlow?: number }>(
  result: T,
): T {
  const acquisitions = result.acquisitions ?? []
  const summaryValue = validNumber(result.vpSourcesSpiceMustFlow)
  const itemCount = countSpiceMustFlowAcquisitions(acquisitions)
  const vpCount = typeof summaryValue === "number" ? summaryValue : itemCount > 0 ? itemCount : undefined

  return {
    ...result,
    vpSourcesSpiceMustFlow: vpCount,
    acquisitions: syncSpiceMustFlowAcquisitionFromVp(acquisitions, vpCount),
  }
}

function syncVpSummaryField(
  previousAcquisitions: PlaythroughResultAcquisitionInput[],
  acquisitions: PlaythroughResultAcquisitionInput[],
  previousValue: number | undefined,
  currentValue: number | undefined,
  itemTypes: AcquisitionItemType[],
): number | undefined {
  const previousHadTrackedItems = hasVpTrackedAcquisitions(previousAcquisitions, itemTypes)
  const nextHasTrackedItems = hasVpTrackedAcquisitions(acquisitions, itemTypes)
  const previousSum = sumAcquisitionVp(previousAcquisitions, itemTypes)
  const nextSum = sumAcquisitionVp(acquisitions, itemTypes)
  const previous = validNumber(previousValue)
  const current = validNumber(currentValue)

  if (nextHasTrackedItems) {
    // Tracked items are evidence, not proof that the whole source total is known.
    // Leave blank totals blank so partial itemisation can be represented as:
    // itemised VP known, source total unknown.
    return current
  }

  if (
    previousHadTrackedItems &&
    typeof previous === "number" &&
    previous === previousSum &&
    current === previousSum
  ) {
    return undefined
  }

  return current
}

function syncAcquisitionSummaryFields<T extends PlayerRankInput>(previous: PlayerRankInput, result: T): T {
  const previousAcquisitions = previous.acquisitions ?? []
  const acquisitions = result.acquisitions ?? []
  const next: PlayerRankInput = { ...result }
  const acquisitionsChanged = previousAcquisitions !== acquisitions

  const shouldSync = (itemType: AcquisitionItemType) =>
    acquisitionsChanged && (hasAcquisitionType(previousAcquisitions, itemType) || hasAcquisitionType(acquisitions, itemType))

  if (shouldSync("imperium_card") || shouldSync("reserve_card") || shouldSync("starter_card")) {
    // Deck size and trashed count are summary totals, not safe to infer from
    // partial itemised card records. Preserve unset/manual values.
  }

  if (shouldSync("contract")) {
    const previousCompletedFloor = countAcquisitions(previousAcquisitions, "contract", ["completed"])
    const nextCompletedFloor = countAcquisitions(acquisitions, "contract", ["completed"])
    const previousHeldFloor = countAcquisitions(previousAcquisitions, "contract", ["held"])
    const nextHeldFloor = countAcquisitions(acquisitions, "contract", ["held"])

    next.contractsCompletedCount = syncSummaryCount(
      next.contractsCompletedCount,
      previous.contractsCompletedCount,
      previousCompletedFloor,
      nextCompletedFloor,
    )
    next.contractsHeldIncomplete = syncSummaryCount(
      next.contractsHeldIncomplete,
      previous.contractsHeldIncomplete,
      previousHeldFloor,
      nextHeldFloor,
    )
  }

  if (shouldSync("intrigue_card")) {
    const previousPlayedFloor = countAcquisitions(previousAcquisitions, "intrigue_card", ["played"])
    const nextPlayedFloor = countAcquisitions(acquisitions, "intrigue_card", ["played"])
    const previousHeldFloor = countAcquisitions(previousAcquisitions, "intrigue_card", ["held"])
    const nextHeldFloor = countAcquisitions(acquisitions, "intrigue_card", ["held"])

    next.intrigueCardsPlayed = syncSummaryCount(
      next.intrigueCardsPlayed,
      previous.intrigueCardsPlayed,
      previousPlayedFloor,
      nextPlayedFloor,
    )
    next.intrigueCardsHeldEndgame = syncSummaryCount(
      next.intrigueCardsHeldEndgame,
      previous.intrigueCardsHeldEndgame,
      previousHeldFloor,
      nextHeldFloor,
    )
  }

  if (shouldSync("tech_tile")) {
    const previousFloor = countAcquisitions(previousAcquisitions, "tech_tile")
    const nextFloor = countAcquisitions(acquisitions, "tech_tile")
    next.techTilesCount = syncSummaryCount(next.techTilesCount, previous.techTilesCount, previousFloor, nextFloor)
  }

  if (shouldSync("sardaukar_skill")) {
    const previousFloor = countAcquisitions(previousAcquisitions, "sardaukar_skill")
    const nextFloor = countAcquisitions(acquisitions, "sardaukar_skill")
    next.commanderSkillsCount = syncSummaryCount(
      next.commanderSkillsCount,
      previous.commanderSkillsCount,
      previousFloor,
      nextFloor,
    )
  }

  if (shouldSync("conflict_card")) {
    const previousFloor = countAcquisitions(previousAcquisitions, "conflict_card", ["won"])
    const nextFloor = countAcquisitions(acquisitions, "conflict_card", ["won"])
    next.conflictCardsWonCount = syncSummaryCount(
      next.conflictCardsWonCount,
      previous.conflictCardsWonCount,
      previousFloor,
      nextFloor,
    )
  }

  if (acquisitionsChanged) {
    next.vpSourcesConflictCards = syncVpSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.vpSourcesConflictCards,
      next.vpSourcesConflictCards,
      ["conflict_card"],
    )

    next.vpSourcesImperiumCards = syncVpSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.vpSourcesImperiumCards,
      next.vpSourcesImperiumCards,
      ["imperium_card", "reserve_card"],
    )

    next.vpSourcesIntrigueCards = syncVpSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.vpSourcesIntrigueCards,
      next.vpSourcesIntrigueCards,
      ["intrigue_card"],
    )

    if (hasVpTrackedAcquisitions(acquisitions, ["intrigue_card"])) {
      next.vpSourcesIntrigueCards = sumSupportedIntrigueVp(next)
    }

    next.vpSourcesTechTiles = syncVpSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.vpSourcesTechTiles,
      next.vpSourcesTechTiles,
      ["tech_tile"],
    )

    next.vpSourcesLeaderAbilities = syncVpSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.vpSourcesLeaderAbilities,
      next.vpSourcesLeaderAbilities,
      ["navigation_card"],
    )

    next.finalConflictStrengthSourcesCommanderSkills = syncStrengthSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.finalConflictStrengthSourcesCommanderSkills,
      next.finalConflictStrengthSourcesCommanderSkills,
      ["sardaukar_skill"],
    )

    next.finalConflictStrengthSourcesIntrigue = syncStrengthSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.finalConflictStrengthSourcesIntrigue,
      next.finalConflictStrengthSourcesIntrigue,
      ["intrigue_card"],
    )

    next.finalConflictStrengthSourcesImperium = syncStrengthSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.finalConflictStrengthSourcesImperium,
      next.finalConflictStrengthSourcesImperium,
      ["imperium_card", "reserve_card"],
    )

    next.finalConflictStrengthSourcesTech = syncStrengthSummaryField(
      previousAcquisitions,
      acquisitions,
      previous.finalConflictStrengthSourcesTech,
      next.finalConflictStrengthSourcesTech,
      ["tech_tile"],
    )

    next.vpSourcesBattleIconMatches = syncBattleIconVpSummaryField(previous, next).vpSourcesBattleIconMatches

    const previousSmfCount = countSpiceMustFlowAcquisitions(previousAcquisitions)
    const nextSmfCount = countSpiceMustFlowAcquisitions(acquisitions)
    if (previousSmfCount > 0 || nextSmfCount > 0) {
      next.vpSourcesSpiceMustFlow = syncStrictSummaryCount(
        next.vpSourcesSpiceMustFlow,
        previous.vpSourcesSpiceMustFlow,
        previousSmfCount,
        nextSmfCount,
      )
    }
  }

  return next as T
}

function isBlankValue(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

function isZero(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value === 0
}

function getLeaderLabel(result: Record<string, any>): string {
  return String(result.leaderName ?? result.leader_name ?? result.leader ?? "")
}

function isSteersmanLeader(result: Record<string, any>): boolean {
  return /steersman|yr['’]?koon/i.test(getLeaderLabel(result))
}

function isStabanLeader(result: Record<string, any>): boolean {
  return /staban/i.test(getLeaderLabel(result))
}

function isStarterDeckAcquisition(item: PlaythroughResultAcquisitionInput): boolean {
  return item.itemType === "starter_card" || item.deckId === "Starter"
}

function starterOptionsForLeader(result: Record<string, any>) {
  return DUNE_ACQUISITION_OPTIONS.filter((option) => {
    if (option.itemType !== "starter_card") return false
    if (isSteersmanLeader(result) && /signet\s*ring/i.test(option.itemName)) return false
    if (isStabanLeader(result) && /diplomacy/i.test(option.itemName)) return false
    return true
  })
}

function starterDeckDefaultsForLeader(result: Record<string, any>): PlaythroughResultAcquisitionInput[] {
  return starterOptionsForLeader(result).map((option) => ({
    itemKey: option.itemKey,
    itemName: option.itemName,
    itemType: option.itemType,
    deckId: option.deckId,
    source: option.source,
    acquisitionCount: option.copyCount && option.copyCount > 0 ? option.copyCount : 1,
    itemStatus: "in_final_deck",
    entrySource: "auto",
    vpCount: 0,
    strengthCount: 0,
  }))
}

function syncStarterDeckForLeader(
  acquisitions: PlaythroughResultAcquisitionInput[] = [],
  result: Record<string, any>,
): PlaythroughResultAcquisitionInput[] {
  const defaults = starterDeckDefaultsForLeader(result)
  if (defaults.length === 0) return acquisitions

  const existingStarters = new Map(
    acquisitions.filter(isStarterDeckAcquisition).map((item) => [item.itemKey, item] as const),
  )
  const nonStarters = acquisitions.filter((item) => !isStarterDeckAcquisition(item))
  const starters = defaults.map((starter) => ({ ...starter, ...(existingStarters.get(starter.itemKey) ?? {}) }))

  return [...nonStarters, ...starters]
}

function withStarterDeckDefaults<T extends Record<string, any>>(result: T): T {
  const acquisitions = syncStarterDeckForLeader(result.acquisitions ?? [], result)
  if (acquisitions === result.acquisitions) return result

  const next: Record<string, any> = { ...result, acquisitions }
  return next as T
}

function displayMetric(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  return String(value)
}

function getNumericLockReason(result: Record<string, any>, field: string): string | undefined {
  if ((field === "vpSourcesTechTiles" || field === "finalConflictStrengthSourcesTech") && isZero(result.techTilesCount)) {
    return "locked by Tech tiles = 0"
  }

  if (field === "finalConflictStrengthSourcesIntrigue" && isZero(result.intrigueCardsPlayed)) {
    return "locked by Intrigues played = 0"
  }

  if (
    (field === "finalConflictStrengthSourcesCommanderSkills" ||
      field === "finalConflictDeployedCommanders" ||
      field === "finalConflictGarrisonCommanders") &&
    isZero(result.commanderSkillsCount)
  ) {
    return "locked by Cmdr Skills = 0"
  }

  if (field === "finalConflictDeployedSandworms" && result.hasMakerHooks === false) {
    return "locked by Maker Hooks = No"
  }

  if (field === "vpSourcesIntrigueCards" && isZero(result.intrigueCardsPlayed) && isZero(result.intrigueCardsHeldEndgame)) {
    return "locked by Intrigues played/held = 0"
  }

  return undefined
}

function applyCountImpliedZeroes<T extends Record<string, any>>(result: T): T {
  const next = { ...result }

  if (isZero(next.techTilesCount)) {
    if (isBlankValue((next as Record<string, any>).vpSourcesTechTiles)) (next as Record<string, any>).vpSourcesTechTiles = 0
    if (isBlankValue((next as Record<string, any>).finalConflictStrengthSourcesTech)) (next as Record<string, any>).finalConflictStrengthSourcesTech = 0
  }

  if (isZero(next.commanderSkillsCount)) {
    if (isBlankValue((next as Record<string, any>).finalConflictStrengthSourcesCommanderSkills)) {
      (next as Record<string, any>).finalConflictStrengthSourcesCommanderSkills = 0
    }
    if (isBlankValue((next as Record<string, any>).finalConflictDeployedCommanders)) {
      (next as Record<string, any>).finalConflictDeployedCommanders = 0
    }
    if (isBlankValue((next as Record<string, any>).finalConflictGarrisonCommanders)) {
      (next as Record<string, any>).finalConflictGarrisonCommanders = 0
    }
  }

  if (next.hasMakerHooks === false) {
    if (isBlankValue((next as Record<string, any>).finalConflictDeployedSandworms)) {
      (next as Record<string, any>).finalConflictDeployedSandworms = 0
    }
  }

  if (isZero(next.intrigueCardsPlayed) && isZero(next.intrigueCardsHeldEndgame)) {
    if (isBlankValue((next as Record<string, any>).vpSourcesIntrigueCards)) (next as Record<string, any>).vpSourcesIntrigueCards = 0
  }

  return next as T
}

function zeroBlankStrengthSourcesWhenBalanced<T extends Record<string, any>>(result: T, unaccounted: number | undefined): T {
  if (typeof unaccounted !== "number" || Math.abs(unaccounted) >= 0.1) return result

  const sourceFields: Array<keyof T> = [
    "finalConflictStrengthSourcesCommanderSkills" as keyof T,
    "finalConflictStrengthSourcesIntrigue" as keyof T,
    "finalConflictStrengthSourcesImperium" as keyof T,
    "finalConflictStrengthSourcesTech" as keyof T,
  ]

  const next = { ...result }
  for (const field of sourceFields) {
    if (isBlankValue(next[field])) next[field] = 0 as T[keyof T]
  }
  return next
}

function calculateUnaccountedStrength(result: Record<string, any>): number | undefined {
  return typeof result.finalConflictStrength === "number" && Number.isFinite(result.finalConflictStrength)
    ? result.finalConflictStrength - calculateFinalConflictKnownStrength(result)
    : undefined
}

function calculateUnaccountedVp(result: Record<string, any>): number | undefined {
  return typeof result.score === "number" && Number.isFinite(result.score)
    ? result.score - calculateKnownVp(result)
    : undefined
}

function applyBattleIconVpAutomation<T extends Record<string, any>>(result: T): T {
  const breakdown = calculateBattleIconVpForResult(result)
  if (!breakdown.hasInputs) return result

  const current = validNumber(result.vpSourcesBattleIconMatches)
  const floor = breakdown.battleIconVp

  return {
    ...result,
    vpSourcesBattleIconMatches: current === undefined || current < floor ? floor : current,
  }
}

function syncBattleIconVpSummaryField<T extends Record<string, any>>(previous: Record<string, any>, result: T): T {
  const previousBreakdown = calculateBattleIconVpForResult(previous)
  const nextBreakdown = calculateBattleIconVpForResult(result)

  if (!previousBreakdown.hasInputs && !nextBreakdown.hasInputs) return result

  const previousValue = validNumber(previous.vpSourcesBattleIconMatches)
  const currentValue = validNumber(result.vpSourcesBattleIconMatches)
  const previousFloor = previousBreakdown.battleIconVp
  const nextFloor = nextBreakdown.battleIconVp

  if (currentValue === undefined) {
    return { ...result, vpSourcesBattleIconMatches: nextFloor }
  }

  const lookedDerivedBefore = previousValue === undefined || previousValue === previousFloor
  if (lookedDerivedBefore && currentValue === previousValue) {
    return { ...result, vpSourcesBattleIconMatches: nextFloor }
  }

  return {
    ...result,
    vpSourcesBattleIconMatches: Math.max(currentValue, nextFloor),
  }
}

function labelledCount(label: string, count: number | undefined): string | null {
  if (!count || count <= 0) return null
  return count > 1 ? `${label} ×${count}` : label
}

function battleIconSummaryBadges(result: Record<string, any>, breakdown: ReturnType<typeof calculateBattleIconVpForResult>) {
  const badges: Array<{ label: string; className?: string }> = []

  if (breakdown.battleIconVp > 0) {
    badges.push({
      label: `${breakdown.battleIconVp} battle icon VP`,
      className: "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700",
    })
  }

  const recordedBattleIconVp = positiveInt(result.vpSourcesBattleIconMatches)
  const unitemisedBattleIconVp = Math.max(0, recordedBattleIconVp - breakdown.battleIconVp)

  if (unitemisedBattleIconVp > 0) {
    badges.push({
      label: `${unitemisedBattleIconVp} battle icon VP not itemised`,
      className: "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700",
    })
  }

  return badges
}

function battleIconSourceBadges(breakdown: ReturnType<typeof calculateBattleIconVpForResult>) {
  const conflictBadges: Record<string, string[]> = {}
  for (const [itemKey, usage] of Object.entries(breakdown.conflictUsageByItemKey)) {
    const badges = [
      labelledCount("Matched", usage.forced),
      labelledCount("Used by Intrigue", usage.intrigue),
      labelledCount("Wild match", usage.wild),
      labelledCount("Face-up", usage.remaining),
    ].filter((badge): badge is string => Boolean(badge))
    if (badges.length > 0) conflictBadges[itemKey] = badges
  }

  const intrigueBadges: Record<string, string[]> = {}
  for (const [itemKey, usage] of Object.entries(breakdown.intrigueUsageByItemKey)) {
    const badges = [
      labelledCount("Used", usage.used),
      labelledCount("Unsupported", usage.unsupported),
    ].filter((badge): badge is string => Boolean(badge))
    if (badges.length > 0) intrigueBadges[itemKey] = badges
  }

  return { conflictBadges, intrigueBadges }
}

function applyAutoAllianceForFaction<T extends Record<string, any>>(results: T[], factionKey: FactionKey): T[] {
  const faction = getFactionConfig(factionKey)
  const influenceField = faction.influenceField as keyof T
  const allianceField = faction.allianceField as keyof T

  const maxInfluence = Math.max(
    -Infinity,
    ...results.map((result) => {
      const influence = result[influenceField]
      return typeof influence === "number" && Number.isFinite(influence) ? influence : -Infinity
    }),
  )

  const winners = maxInfluence >= 4
    ? results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result[influenceField] === maxInfluence)
        .map(({ index }) => index)
    : []

  return results.map((result, index) => {
    let nextAlliance: boolean | undefined

    if (winners.length === 0) nextAlliance = false
    else if (winners.length === 1) nextAlliance = index === winners[0]
    else nextAlliance = winners.includes(index) ? undefined : false

    return { ...result, [allianceField]: nextAlliance }
  })
}

function applyFinalConflictVpLogic<T extends Record<string, any>>(results: T[]): T[] {
  const maxStrength = Math.max(
    -Infinity,
    ...results.map((result) => {
      const strength = result.finalConflictStrength
      return typeof strength === "number" && Number.isFinite(strength) ? strength : -Infinity
    }),
  )

  if (!Number.isFinite(maxStrength) || maxStrength <= 0) return results

  return results.map((result) => {
    const strength = result.finalConflictStrength
    if (typeof strength !== "number" || !Number.isFinite(strength)) return result

    if (strength < maxStrength && result.vpSourcesFinalConflict !== 0) {
      const adjusted = { ...result, vpSourcesFinalConflict: 0 }
      return enforceFinalConflictWithinTotal(
        wasConflictVpDerivedFromFinalConflict(result)
          ? { ...adjusted, vpSourcesConflictCards: undefined }
          : adjusted,
      )
    }

    if (strength === maxStrength && result.vpSourcesFinalConflict === 0) {
      return enforceFinalConflictWithinTotal({ ...result, vpSourcesFinalConflict: undefined })
    }

    return enforceFinalConflictWithinTotal(result)
  })
}

function zeroBlankVpSourcesWhenBalanced<T extends Record<string, any>>(result: T, unaccounted: number | undefined): T {
  if (typeof unaccounted !== "number" || Math.abs(unaccounted) >= 0.1) return result

  const sourceFields: Array<keyof T> = [
    "vpSourcesConflictCards" as keyof T,
    "vpSourcesBattleIconMatches" as keyof T,
    "vpSourcesSpiceMustFlow" as keyof T,
    "vpSourcesIntrigueCards" as keyof T,
    "vpSourcesTechTiles" as keyof T,
    "vpSourcesImperiumCards" as keyof T,
  ]

  const next = { ...result }
  for (const field of sourceFields) {
    if (next[field] === undefined || next[field] === null || next[field] === "") {
      next[field] = 0 as T[keyof T]
    }
  }
  return next
}

function withDerivedStats<T extends Record<string, any>>(result: T, allResults: T[], resultIndex: number): T {
  const countAdjusted = applyCountImpliedZeroes(result)
  const battleIconAdjusted = applyBattleIconVpAutomation(countAdjusted)
  const conflictAdjusted = enforceFinalConflictWithinTotal(battleIconAdjusted)
  const vpSourcesFactions = calculateFactionVp(conflictAdjusted)
  const finalConflictPlace = calculateConflictPlace(allResults, resultIndex)

  const resultForKnownVp = { ...conflictAdjusted, vpSourcesFactions }
  const preliminaryVpUnaccounted = calculateUnaccountedVp(resultForKnownVp)
  const preliminaryStrengthUnaccounted = calculateUnaccountedStrength(resultForKnownVp)

  let zeroedIfBalanced = zeroBlankVpSourcesWhenBalanced(resultForKnownVp, preliminaryVpUnaccounted)
  zeroedIfBalanced = zeroBlankStrengthSourcesWhenBalanced(zeroedIfBalanced, preliminaryStrengthUnaccounted)

  const finalConflictStrengthSourcesUnaccounted = calculateUnaccountedStrength(zeroedIfBalanced)
  const vpSourcesUnaccounted = calculateUnaccountedVp({ ...zeroedIfBalanced, vpSourcesFactions })

  return {
    ...zeroedIfBalanced,
    vpSourcesFactions,
    vpSourcesUnaccounted,
    finalConflictPlace,
    finalConflictStrengthSourcesUnaccounted,
  }
}

function isFirstPlayerObjective(value: unknown): boolean {
  return String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "_") === "desert_mouse_first_player"
}

function applyTurnOrderDefaults<T extends Record<string, any>>(results: T[]): T[] {
  const playerCount = results.length
  if (playerCount <= 0) return results

  let next = results.map((result) =>
    isFirstPlayerObjective(result.objectiveCard ?? result.objective_card) && result.turnOrderPosition !== 1
      ? ({ ...result, turnOrderPosition: 1 } as T)
      : result,
  )

  const validOrders = next
    .map((result) => result.turnOrderPosition)
    .filter((value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= playerCount,
    )

  const uniqueOrders = new Set(validOrders)
  if (uniqueOrders.size !== validOrders.length) return next

  const unsetIndexes = next
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => {
      const value = result.turnOrderPosition
      return !(typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= playerCount)
    })
    .map(({ index }) => index)

  if (unsetIndexes.length !== 1 || uniqueOrders.size !== playerCount - 1) return next

  const missingOrder = Array.from({ length: playerCount }, (_, index) => index + 1).find(
    (order) => !uniqueOrders.has(order),
  )

  if (missingOrder === undefined) return next

  next = next.map((result, index) =>
    index === unsetIndexes[0] ? ({ ...result, turnOrderPosition: missingOrder } as T) : result,
  )

  return next
}

function deriveResultSet<T extends Record<string, any>>(
  results: T[],
  options: { changedInfluenceFaction?: FactionKey; defaultBaseVp?: number } = {},
): T[] {
  let next = results.map((result) => {
    const withBase =
      options.defaultBaseVp !== undefined
        ? { ...result, vpSourcesBase: options.defaultBaseVp }
        : result
    return withBase as T
  })

  next = applyTurnOrderDefaults(next)

  if (options.changedInfluenceFaction) {
    next = applyAutoAllianceForFaction(next, options.changedInfluenceFaction)
  }

  next = applyFinalConflictVpLogic(next)
  return next.map((result, index) => withDerivedStats(result, next, index))
}

function StatSection({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
  summary,
}: {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  summary?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-amber-600" />
            <h5 className="text-sm font-semibold text-slate-900">{title}</h5>
          </div>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          {summary && <div className="mt-2 flex flex-wrap gap-1.5">{summary}</div>}
        </div>
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-700">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}

function StatSubsection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`self-start h-fit min-h-0 rounded-lg border bg-white/70 p-3 ${className ?? ""}`}>
      <h6 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h6>
      {children}
    </div>
  )
}

function LightSubsection({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`border-t border-slate-200/80 pt-3 first:border-t-0 first:pt-0 ${className ?? ""}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h6>
        {action}
      </div>
      {children}
    </div>
  )
}


type VpRailSegment = {
  key: string
  label: string
  shortLabel: string
  count: number
  className: string
  title: string
}

function positiveInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0
}

function VpRail({ result, playerCount, action }: { result: Record<string, any>; playerCount: number; action?: React.ReactNode }) {
  const baseVp = positiveInt(result.vpSourcesBase ?? (playerCount === 4 ? 1 : 0))
  const segments: VpRailSegment[] = [
    {
      key: "base",
      label: "Base",
      shortLabel: "B",
      count: baseVp,
      className: "border-slate-300 bg-slate-100 text-slate-700",
      title: "Base VP",
    },
    {
      key: "faction",
      label: "Faction",
      shortLabel: "F",
      count: positiveInt(calculateFactionVp(result)),
      className: "border-emerald-300 bg-emerald-50 text-emerald-800",
      title: "Faction track and alliance VP",
    },
    {
      key: "conflict",
      label: "Conflict rewards",
      shortLabel: "CR",
      count: positiveInt(effectiveVpSourceTotal(result, result.vpSourcesConflictCards, ["conflict_card"])),
      className: "border-orange-300 bg-orange-50 text-orange-800",
      title: "Conflict reward VP",
    },
    {
      key: "battle-icons",
      label: "Battle icons",
      shortLabel: "BI",
      count: positiveInt(result.vpSourcesBattleIconMatches),
      className: "border-rose-300 bg-rose-50 text-rose-800",
      title: "Battle icon match VP",
    },
    {
      key: "smf",
      label: "Spice Must Flow",
      shortLabel: "SMF",
      count: positiveInt(result.vpSourcesSpiceMustFlow),
      className: "border-amber-300 bg-amber-50 text-amber-800",
      title: "The Spice Must Flow VP",
    },
    {
      key: "intrigue",
      label: "Intrigue",
      shortLabel: "I",
      count: positiveInt(effectiveIntrigueVpSourceTotal(result)),
      className: "border-purple-300 bg-purple-50 text-purple-800",
      title: "Intrigue card VP",
    },
    {
      key: "tech",
      label: "Tech",
      shortLabel: "T",
      count: positiveInt(effectiveVpSourceTotal(result, result.vpSourcesTechTiles, ["tech_tile"])),
      className: "border-cyan-300 bg-cyan-50 text-cyan-800",
      title: "Tech tile VP",
    },
    {
      key: "imperium",
      label: "Deck cards",
      shortLabel: "Deck",
      count: positiveInt(effectiveVpSourceTotal(result, result.vpSourcesImperiumCards, ["imperium_card", "reserve_card", "starter_card"])),
      className: "border-blue-300 bg-blue-50 text-blue-800",
      title: "Imperium/Reserve card VP",
    },
    {
      key: "leader",
      label: "Leader",
      shortLabel: "L",
      count: positiveInt(isSteersmanLeader(result) ? Math.max(numericValue(result.vpSourcesLeaderAbilities), itemisedVpMinimum(result, ["navigation_card"])) : undefined),
      className: "border-indigo-300 bg-indigo-50 text-indigo-800",
      title: "Leader ability VP",
    },
  ]

  const knownVp = segments.reduce((total, segment) => total + segment.count, 0)
  const finalVp = positiveInt(result.score)
  const unaccountedVp = typeof result.score === "number" && Number.isFinite(result.score) ? Math.max(0, Math.trunc(result.score) - knownVp) : 0
  const overVp = typeof result.score === "number" && Number.isFinite(result.score) ? Math.max(0, knownVp - Math.trunc(result.score)) : 0
  const visibleSegments = segments.filter((segment) => segment.count > 0)
  const tokens = [
    ...visibleSegments.flatMap((segment) =>
      Array.from({ length: segment.count }, (_, tokenIndex) => ({ ...segment, tokenKey: `${segment.key}-${tokenIndex}` })),
    ),
    ...Array.from({ length: unaccountedVp }, (_, tokenIndex) => ({
      key: "unaccounted",
      tokenKey: `unaccounted-${tokenIndex}`,
      label: "Unaccounted",
      shortLabel: "?",
      count: 1,
      className: "border-slate-200 bg-slate-100 text-slate-400 opacity-70",
      title: "Unaccounted VP",
    })),
  ]

  return (
    <div className="mt-3 rounded-xl border bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">VP Track</div>
          {typeof result.score === "number" && Number.isFinite(result.score) && (
            <div className="text-[11px] text-slate-500">{finalVp} total</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overVp > 0 && (
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
              {overVp} over final
            </Badge>
          )}
          {action}
        </div>
      </div>

      {tokens.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Read-only VP track">
          {tokens.map((token) => (
            <span
              key={token.tokenKey}
              title={token.title}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[10px] font-bold tabular-nums shadow-sm ${token.className}`}
            >
              {token.shortLabel}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500">
          Add VP details to preview the score track.
        </div>
      )}
    </div>
  )
}

function SummaryChips({ items }: { items: Array<{ label: string; value: unknown; tone?: "default" | "good" | "warn" }> }) {
  return (
    <div className="mt-3 grid gap-2 rounded-xl border bg-white/80 p-3 text-sm text-slate-700 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border px-3 py-2 ${
            item.tone === "good"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : item.tone === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums">{displayMetric(item.value)}</div>
        </div>
      ))}
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  placeholder,
  onChange,
  disabled,
  lockedReason,
  widthClass = "max-w-48",
  resetValue,
  reconcileWithTrackedItems = false,
}: {
  id: string
  label?: string
  value?: number
  placeholder?: string
  onChange: (value: number | undefined) => void
  disabled?: boolean
  lockedReason?: string
  widthClass?: string
  resetValue?: number
  reconcileWithTrackedItems?: boolean
}) {
  const isLocked = Boolean(lockedReason)
  const numericValue = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined
  const resetTarget = typeof resetValue === "number" && Number.isFinite(resetValue) ? Math.trunc(resetValue) : undefined
  const isDirty = !isLocked && resetTarget !== undefined && numericValue !== undefined && numericValue !== resetTarget

  return (
    <div className={`group grid w-full ${widthClass} gap-1.5`} title={lockedReason}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {isLocked && <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Locked</span>}
          {isDirty && (
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-medium text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onChange(resetTarget)}
              disabled={disabled}
              title={`Reset ${label ?? "value"} to ${resetTarget}`}
              aria-label={`Reset ${label ?? "value"} to ${resetTarget}`}
            >
              ↺
            </button>
          )}
        </div>
      </div>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(event) => onChange(parseNumberInput(event.target.value))}
        placeholder={placeholder}
        disabled={disabled || isLocked}
        className={`h-8 text-center text-sm tabular-nums ${isLocked ? "bg-slate-100 text-slate-500" : ""}`}
      />
    </div>
  )
}

function NumberStepperField({
  id,
  label,
  value,
  placeholder,
  onChange,
  disabled,
  min = 0,
  helperText,
  max,
  lockedReason,
  resetValue,
  trackedTotalLabel,
  reconcileWithTrackedItems = false,
}: {
  id: string
  label?: string
  value?: number
  placeholder?: string
  onChange: (value: number | undefined) => void
  disabled?: boolean
  min?: number
  helperText?: string
  max?: number
  lockedReason?: string
  resetValue?: number
  trackedTotalLabel?: string
  reconcileWithTrackedItems?: boolean
}) {
  const safeMin = Math.max(0, Math.trunc(min))
  const isLocked = Boolean(lockedReason)
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : undefined
  const safeMax = typeof max === "number" && Number.isFinite(max) ? Math.max(safeMin, Math.trunc(max)) : undefined
  const canClearTotal = !isLocked && numericValue !== undefined && safeMin === 0
  const itemisedMinimum = typeof resetValue === "number" && Number.isFinite(resetValue)
    ? Math.max(safeMin, Math.trunc(resetValue))
    : undefined
  const hasItemisedEvidence = itemisedMinimum !== undefined && itemisedMinimum > safeMin
  const canShowReconciliation = reconcileWithTrackedItems && !isLocked
  const sourceTotalUnknown = canShowReconciliation && numericValue === undefined && hasItemisedEvidence
  const itemisedExceedsTotal = canShowReconciliation && numericValue !== undefined && hasItemisedEvidence && numericValue < itemisedMinimum
  const totalNotFullyItemised = canShowReconciliation && numericValue !== undefined && numericValue > safeMin && (
    !hasItemisedEvidence || numericValue > itemisedMinimum
  )
  const needsReconciliation = sourceTotalUnknown || totalNotFullyItemised
  const stepperStateClass = itemisedExceedsTotal
    ? "border-red-300 bg-red-50 focus-within:ring-red-500/20"
    : needsReconciliation
      ? "border-amber-300 bg-amber-50 focus-within:ring-amber-500/25"
      : "border-slate-200 bg-white focus-within:ring-amber-500/25"
  const stepperStateLabel = itemisedExceedsTotal
    ? "Below tracked"
    : totalNotFullyItemised
      ? "Not itemised"
      : undefined
  const shouldOfferTrackedTotal = canShowReconciliation && itemisedMinimum !== undefined && itemisedMinimum > safeMin && numericValue !== itemisedMinimum && (
    numericValue === undefined || numericValue < itemisedMinimum
  )
  const trackedTotalDisplay = trackedTotalLabel ?? (itemisedMinimum !== undefined ? String(itemisedMinimum) : undefined)
  const trackedTotalHelper = shouldOfferTrackedTotal && trackedTotalDisplay !== undefined
    ? `Tracked total: ${trackedTotalDisplay}`
    : undefined

  const step = (delta: number) => {
    const base = numericValue ?? (delta > 0 ? safeMin : safeMin + 1)
    const unclamped = Math.max(safeMin, base + delta)
    const next = safeMax === undefined ? unclamped : Math.min(safeMax, unclamped)
    onChange(next)
  }

  const handleInputChange = (raw: string) => {
    const parsed = parseNumberInput(raw)
    if (parsed === undefined) {
      onChange(safeMin > 0 ? safeMin : undefined)
      return
    }

    const unclamped = Math.max(safeMin, parsed)
    onChange(safeMax === undefined ? unclamped : Math.min(safeMax, unclamped))
  }

  const applyTrackedTotal = () => {
    if (itemisedMinimum !== undefined) {
      onChange(itemisedMinimum)
    }
  }

  const clearTotal = () => {
    onChange(undefined)
  }

  return (
    <div className="group grid w-full max-w-60 gap-1.5" title={lockedReason}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </Label>
        <div className="flex min-h-5 min-w-0 items-center justify-end gap-1.5">
          {isLocked && <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Locked</span>}
          {stepperStateLabel && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-4 whitespace-nowrap ${
                itemisedExceedsTotal
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {stepperStateLabel}
            </span>
          )}
          {shouldOfferTrackedTotal && (
            <button
              type="button"
              className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={applyTrackedTotal}
              disabled={disabled}
              title={`Use tracked total for ${label ?? "value"}`}
              aria-label={`Use tracked total for ${label ?? "value"}`}
            >
              Use tracked
            </button>
          )}
          {canClearTotal && (
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={clearTotal}
              disabled={disabled}
              title={`Clear ${label ?? "value"}`}
              aria-label={`Clear ${label ?? "value"}`}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-9 min-w-0 flex-1 overflow-hidden rounded-lg border shadow-sm focus-within:ring-2 ${stepperStateClass}`}>
          <button
            type="button"
            className="flex w-9 items-center justify-center border-r border-slate-200 text-base font-semibold text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => step(-1)}
            disabled={disabled || isLocked || (numericValue !== undefined ? numericValue <= safeMin : safeMin > 0)}
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            value={value ?? ""}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={placeholder ?? "Not set"}
            disabled={disabled || isLocked}
            className={`h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent text-center text-sm font-medium tabular-nums shadow-none [appearance:textfield] placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isLocked ? "bg-slate-100 text-slate-500" : ""}`}
          />
          <button
            type="button"
            className="flex w-9 items-center justify-center border-l border-slate-200 text-base font-semibold text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => step(1)}
            disabled={disabled || isLocked || (safeMax !== undefined && numericValue !== undefined && numericValue >= safeMax)}
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>

      </div>
      <div className="min-h-4">
        {trackedTotalHelper ? (
          <p className="text-[11px] text-slate-500">{trackedTotalHelper}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    </div>
  )
}

function ObjectiveSelect({
  value,
  onChange,
  disabled,
}: {
  value?: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-slate-700">Objective</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? undefined : next)} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select objective" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not set</SelectItem>
          {OBJECTIVE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value?: string
  placeholder?: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </Label>
      <Input id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value.trim() === "" ? undefined : event.target.value)} placeholder={placeholder} disabled={disabled} className="h-8 text-sm" />
    </div>
  )
}

function BooleanSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value?: boolean
  onChange: (value: boolean | undefined) => void
  disabled?: boolean
}) {
  const options: Array<{ label: string; value: boolean }> = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ]

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-slate-700">{label}</Label>
      <div className="inline-flex h-9 w-fit justify-self-start overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.label}
              type="button"
              className={`min-w-14 border-r border-slate-200 px-3 text-sm font-medium transition last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? option.value
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => onChange(active ? undefined : option.value)}
              disabled={disabled}
              aria-pressed={active}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CouncilSeatSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label?: string
  value?: number
  onChange: (value: number | undefined) => void
  disabled?: boolean
}) {
  return <NumberSegmentSelect label={label} value={value} onChange={onChange} disabled={disabled} options={[1, 2, 3, 4]} />
}

function NumberSegmentSelect({
  label,
  value,
  onChange,
  disabled,
  options,
  warning,
}: {
  label?: string
  value?: number
  onChange: (value: number | undefined) => void
  disabled?: boolean
  options: number[]
  warning?: string
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        {label && <Label className="text-xs font-medium text-slate-700">{label}</Label>}
        {warning && <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600">{warning}</span>}
      </div>
      <div className="flex w-full flex-wrap overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {options.map((option) => {
          const active = value === option
          return (
            <button
              key={option}
              type="button"
              className={`h-9 min-w-10 flex-1 border-r border-b border-slate-200 px-2 text-sm font-medium transition last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? warning
                    ? "bg-amber-50 text-amber-700"
                    : "bg-amber-50 text-amber-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => onChange(active ? undefined : option)}
              disabled={disabled}
              aria-pressed={active}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}


export const EditPlaythroughForm = ({ playthrough, existingPlayers, onSubmit, onCancel }: EditPlaythroughFormProps) => {
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [playerRanks, setPlayerRanks] = useState<PlayerRankInput[]>([])
  const [gameDate, setGameDate] = useState<string>("")
  const [roundCount, setRoundCount] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [leaders, setLeaders] = useState<any[]>([])
  const [archetypes, setArchetypes] = useState<any[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [showStickyPlayerContext, setShowStickyPlayerContext] = useState(false)
  const [showVpSourcesByPlayer, setShowVpSourcesByPlayer] = useState<Record<number, boolean>>({})
  const [showStrengthSourcesByPlayer, setShowStrengthSourcesByPlayer] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!expandedPlayerId) {
      setShowStickyPlayerContext(false)
      return
    }

    const updateStickyContext = () => {
      const anchor = Array.from(document.querySelectorAll<HTMLElement>("[data-expanded-player-anchor]"))
        .find((element) => element.dataset.expandedPlayerAnchor === expandedPlayerId)

      if (!anchor) {
        setShowStickyPlayerContext(false)
        return
      }

      setShowStickyPlayerContext(anchor.getBoundingClientRect().bottom <= 0)
    }

    updateStickyContext()
    window.addEventListener("scroll", updateStickyContext, { passive: true })
    window.addEventListener("resize", updateStickyContext)

    return () => {
      window.removeEventListener("scroll", updateStickyContext)
      window.removeEventListener("resize", updateStickyContext)
    }
  }, [expandedPlayerId])

  const globalAcquisitionCounts = useMemo(() => {
    return playerRanks.reduce<Record<string, number>>((acc, result) => {
      for (const item of result.acquisitions ?? []) {
        acc[item.itemKey] = (acc[item.itemKey] ?? 0) + acquisitionCount(item)
      }
      return acc
    }, {})
  }, [playerRanks])

  useEffect(() => {
    if (!playthrough?.results) return

    if (playthrough.timestamp) setGameDate(formatDateForInput(playthrough.timestamp))
    setRoundCount(getNumber(playthrough, "roundCount", "round_count") ?? undefined)

    const initialRanks = playthrough.results
      .slice()
      .sort((a: any, b: any) => a.rank - b.rank)
      .map((result: any) => ({
        id: crypto.randomUUID(),
        playerId: getText(result, "playerId", "player_id"),
        playerName: result.playerName,
        rank: result.rank.toString(),
        isNewPlayer: !existingPlayers.some((player) => player.name.toLowerCase() === result.playerName.toLowerCase()),
        leaderId: getText(result, "leaderId", "leader_id"),
        leaderName: getText(result, "leaderName", "leader_name", "leader"),
        strategicArchetypeId: getText(result, "strategicArchetypeId", "strategic_archetype_id"),
        strategicArchetypeName: getText(result, "strategicArchetypeName", "strategic_archetype_name", "strategic_archetype"),
        score: getNumber(result, "score", "finalVp", "final_vp", "victory_points"),
        turnOrderPosition: getNumber(result, "turnOrderPosition", "turn_order_position", "turnOrder"),
        vpSourcesBase: getNumber(result, "vpSourcesBase", "vp_sources_base"),
        vpSourcesConflictCards: getNumber(result, "vpSourcesConflictCards", "vp_sources_conflict_cards"),
        vpSourcesFinalConflict: getNumber(result, "vpSourcesFinalConflict", "vp_sources_final_conflict"),
        vpSourcesBattleIconMatches: getNumber(result, "vpSourcesBattleIconMatches", "vp_sources_battle_icon_matches"),
        vpSourcesSpiceMustFlow: getNumber(result, "vpSourcesSpiceMustFlow", "vp_sources_spice_must_flow"),
        vpSourcesIntrigueCards: getNumber(result, "vpSourcesIntrigueCards", "vp_sources_intrigue_cards"),
        vpSourcesTechTiles: getNumber(result, "vpSourcesTechTiles", "vp_sources_tech_tiles"),
        vpSourcesImperiumCards: getNumber(result, "vpSourcesImperiumCards", "vp_sources_imperium_cards"),
        vpSourcesLeaderAbilities: getNumber(result, "vpSourcesLeaderAbilities", "vp_sources_leader_abilities"),
        endgameSpiceCount: getNumber(result, "endgameSpiceCount", "endgame_spice_count", "finalResourcesSpice", "spice"),
        endgameSolariCount: getNumber(result, "endgameSolariCount", "endgame_solari_count", "finalResourcesSolari", "solari"),
        endgameWaterCount: getNumber(result, "endgameWaterCount", "endgame_water_count", "finalResourcesWater", "water"),
        influenceEmperor: getNumber(result, "influenceEmperor", "influence_emperor"),
        influenceSpacingGuild: getNumber(result, "influenceSpacingGuild", "influence_spacing_guild"),
        influenceBeneGesserit: getNumber(result, "influenceBeneGesserit", "influence_bene_gesserit"),
        influenceFremen: getNumber(result, "influenceFremen", "influence_fremen"),
        hasAllianceEmperor: getBoolean(result, "hasAllianceEmperor", "has_alliance_emperor"),
        hasAllianceSpacingGuild: getBoolean(result, "hasAllianceSpacingGuild", "has_alliance_spacing_guild"),
        hasAllianceBeneGesserit: getBoolean(result, "hasAllianceBeneGesserit", "has_alliance_bene_gesserit"),
        hasAllianceFremen: getBoolean(result, "hasAllianceFremen", "has_alliance_fremen"),
        finalConflictStrength: getNumber(result, "finalConflictStrength", "final_conflict_strength"),
        finalConflictGarrisonTroops: getNumber(result, "finalConflictGarrisonTroops", "final_conflict_garrison_troops"),
        finalConflictGarrisonCommanders: getNumber(result, "finalConflictGarrisonCommanders", "final_conflict_garrison_commanders"),
        finalConflictDeployedTroops: getNumber(result, "finalConflictDeployedTroops", "final_conflict_deployed_troops"),
        finalConflictDeployedCommanders: getNumber(result, "finalConflictDeployedCommanders", "final_conflict_deployed_commanders"),
        finalConflictDeployedSandworms: getNumber(result, "finalConflictDeployedSandworms", "final_conflict_deployed_sandworms"),
        finalConflictStrengthSourcesCommanderSkills: getNumber(result, "finalConflictStrengthSourcesCommanderSkills", "final_conflict_strength_sources_commander_skills"),
        finalConflictStrengthSourcesIntrigue: getNumber(result, "finalConflictStrengthSourcesIntrigue", "final_conflict_strength_sources_intrigue"),
        finalConflictStrengthSourcesImperium: getNumber(result, "finalConflictStrengthSourcesImperium", "final_conflict_strength_sources_imperium"),
        finalConflictStrengthSourcesTech: getNumber(result, "finalConflictStrengthSourcesTech", "final_conflict_strength_sources_tech"),
        cardsTrashedCount: getNumber(result, "cardsTrashedCount", "cards_trashed_count", "cardsTrashed", "cards_trashed"),
        finalDeckSize: getNumber(result, "finalDeckSize", "final_deck_size", "cards_in_deck"),
        intrigueCardsPlayed: getNumber(result, "intrigueCardsPlayed", "intrigue_cards_played"),
        intrigueCardsHeldEndgame: getNumber(result, "intrigueCardsHeldEndgame", "intrigue_cards_held_endgame"),
        conflictCardsWonCount: getNumber(result, "conflictCardsWonCount", "conflict_cards_won_count"),
        objectiveCard: getText(result, "objectiveCard", "objective_card"),
        contractsCompletedCount: getNumber(result, "contractsCompletedCount", "contracts_completed_count"),
        contractsHeldIncomplete: getNumber(result, "contractsHeldIncomplete", "contracts_held_incomplete"),
        techTilesCount: getNumber(result, "techTilesCount", "tech_tiles_count"),
        controlMarkerCount: getNumber(result, "controlMarkerCount", "control_marker_count"),
        commanderSkillsCount: getNumber(result, "commanderSkillsCount", "commander_skills_count"),
        spiesOnBoardEndgame: getNumber(result, "spiesOnBoardEndgame", "spies_on_board_endgame"),
        hasHighCouncil: getBoolean(result, "hasHighCouncil", "has_high_council"),
        highCouncilSeatPosition: getNumber(result, "highCouncilSeatPosition", "high_council_seat_position"),
        hasSwordmaster: getBoolean(result, "hasSwordmaster", "has_swordmaster"),
        hasMakerHooks: getBoolean(result, "hasMakerHooks", "has_maker_hooks"),
        acquisitions: getAcquisitionsFromResult(result),
        notes: getText(result, "notes"),
      }))

    const initialRanksWithStarters = initialRanks.map((result: PlayerRankInput) => syncSpiceMustFlowForForm(withStarterDeckDefaults(result)))
    const derivedInitialRanks = deriveResultSet(initialRanksWithStarters, { defaultBaseVp: initialRanksWithStarters.length === 4 ? 1 : 0 }) as PlayerRankInput[]
    setPlayerRanks(derivedInitialRanks)
    setExpandedPlayerId(null)
  }, [playthrough, existingPlayers])

  useEffect(() => {
    const loadData = async () => {
      if (playthrough?.game_type !== "dune") {
        setLeadersLoading(false)
        return
      }

      try {
        const referenceData = await getDuneReferenceData()
        setLeaders(referenceData.leaders)
        setArchetypes(referenceData.archetypes)
      } catch (error) {
        console.error("Failed to load leaders/archetypes:", error)
      } finally {
        setLeadersLoading(false)
      }
    }

    loadData()
  }, [playthrough])

  const updateField = <K extends keyof PlayerRankInput>(index: number, field: K, value: PlayerRankInput[K]) => {
    const updatedRanks = [...playerRanks]
    const previous = updatedRanks[index]
    const exactPlayerMatch =
      field === "playerName"
        ? existingPlayers.find((player) => player.name.toLowerCase() === String(value).trim().toLowerCase())
        : undefined

    let updated: PlayerRankInput = {
      ...previous,
      [field]: value,
      isNewPlayer: field === "playerName" ? !exactPlayerMatch : previous.isNewPlayer,
      playerId: field === "playerName" ? exactPlayerMatch?.id : previous.playerId,
    }


    if (field === "highCouncilSeatPosition" && typeof value === "number") {
      updated.hasHighCouncil = true
    }

    if (field === "hasHighCouncil" && value === false) {
      updated.highCouncilSeatPosition = undefined
    }

    if (field === "vpSourcesFinalConflict") {
      updated = syncConflictVpForFinalConflictChange(previous, updated) as PlayerRankInput
    }

    if (field === "vpSourcesSpiceMustFlow") {
      updated.acquisitions = syncSpiceMustFlowAcquisitionFromVp(updated.acquisitions, value as number | undefined)
    }

    if (field === "vpSourcesLeaderAbilities") {
      updated.acquisitions = syncNavigationCard08FromLeaderVp(updated.acquisitions, value as number | undefined)
    }

    if (field === "acquisitions") {
      updated = syncAcquisitionSummaryFields(previous, updated) as PlayerRankInput
    }

    updatedRanks[index] = updated

    setPlayerRanks(
      deriveResultSet(updatedRanks, {
        changedInfluenceFaction: getFactionForInfluenceField(String(field)),
        defaultBaseVp: updatedRanks.length === 4 ? 1 : 0,
      }) as PlayerRankInput[],
    )
    setError(null)
  }

  const updateLeader = (index: number, leaderId: string | undefined) => {
    const leader = leaderId ? leaders.find((candidate) => candidate.id === leaderId) : undefined
    const updatedRanks = [...playerRanks]
    let updated: PlayerRankInput = {
      ...updatedRanks[index],
      leaderId,
      leaderName: leader?.name,
    }

    if (!isSteersmanLeader(updated)) {
      updated.vpSourcesLeaderAbilities = undefined
      updated.acquisitions = removeNavigationAcquisitions(updated.acquisitions)
    }

    updated.acquisitions = syncStarterDeckForLeader(updated.acquisitions, updated)
    updated = syncAcquisitionSummaryFields(updatedRanks[index], updated) as PlayerRankInput

    updatedRanks[index] = updated

    setPlayerRanks(deriveResultSet(updatedRanks, { defaultBaseVp: updatedRanks.length === 4 ? 1 : 0 }) as PlayerRankInput[])
    setError(null)
  }

  const selectExistingPlayer = (index: number, player: Player) => {
    const updatedRanks = [...playerRanks]
    updatedRanks[index] = {
      ...updatedRanks[index],
      playerId: player.id,
      playerName: player.name,
      isNewPlayer: false,
    }

    setPlayerRanks(deriveResultSet(updatedRanks, { defaultBaseVp: updatedRanks.length === 4 ? 1 : 0 }) as PlayerRankInput[])
    setShowPlayerSuggestions((prev) => ({ ...prev, [playerRanks[index].id]: false }))
    setError(null)
  }

  const addPlayerField = () => {
    setPlayerRanks([
      ...playerRanks,
      {
        id: crypto.randomUUID(),
        playerName: "",
        rank: String(playerRanks.length + 1),
        isNewPlayer: true,
      },
    ])
  }

  const removePlayerField = (index: number) => {
    if (playerRanks.length <= 1) {
      setError("Must have at least one player.")
      return
    }

    const next = playerRanks
      .filter((_, currentIndex) => currentIndex !== index)
      .map((player, currentIndex) => ({ ...player, rank: String(currentIndex + 1) }))

    setPlayerRanks(deriveResultSet(next, { defaultBaseVp: next.length === 4 ? 1 : 0 }) as PlayerRankInput[])
    setError(null)
  }

  const movePlayerRank = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= playerRanks.length) return

    const next = [...playerRanks]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    const ranked = next.map((player, currentIndex) => ({ ...player, rank: String(currentIndex + 1) }))

    setPlayerRanks(deriveResultSet(ranked, { defaultBaseVp: ranked.length === 4 ? 1 : 0 }) as PlayerRankInput[])
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitSuccess(false)

    const results: PlayerRankInput[] = []
    const playerNames = new Set<string>()
    const ranks = new Set<number>()

    for (const playerRank of playerRanks) {
      if (!playerRank.playerName.trim()) {
        setError("All player names must be filled.")
        return
      }
      if (playerNames.has(playerRank.playerName.trim().toLowerCase())) {
        setError("Player names must be unique for a single playthrough.")
        return
      }
      playerNames.add(playerRank.playerName.trim().toLowerCase())

      const rank = Number.parseInt(playerRank.rank, 10)
      if (Number.isNaN(rank) || rank < 1) {
        setError(`Invalid rank for ${playerRank.playerName}. Must be a positive number.`)
        return
      }
      if (ranks.has(rank)) {
        setError(`Rank ${getOrdinalSuffix(rank)} is assigned to multiple players. Each rank must be unique.`)
        return
      }
      ranks.add(rank)

      results.push({ ...playerRank, playerName: playerRank.playerName.trim(), rank: String(rank) })
    }

    const sortedRanks = [...ranks].sort((a, b) => a - b)
    for (let index = 0; index < sortedRanks.length; index++) {
      if (sortedRanks[index] !== index + 1) {
        setError("Ranks must be consecutive starting from 1st place.")
        return
      }
    }

    setSubmitting(true)
    try {
      const normalisedResults = results.map(syncSpiceMustFlowForForm)
      const derivedResults = deriveResultSet(normalisedResults, { defaultBaseVp: normalisedResults.length === 4 ? 1 : 0 }) as PlayerRankInput[]

      await onSubmit(
        derivedResults.map((result, index) => {
          const derivedResult = withDerivedStats(result, derivedResults, index)
          return { ...derivedResult, rank: Number.parseInt(result.rank, 10) }
        }),
        gameDate,
        roundCount,
      )
      setSubmitSuccess(true)
    } catch (error) {
      console.error("Error updating playthrough:", error)
      setError(error instanceof Error ? error.message : "Failed to update playthrough")
    } finally {
      setSubmitting(false)
    }
  }

  const renderNumber = (index: number, player: PlayerRankInput, field: PlayerField, label: string, placeholder?: string) => (
    <NumberField
      id={`${String(field)}-${index}`}
      label={label}
      value={player[field] as number | undefined}
      placeholder={placeholder}
      onChange={(value) => updateField(index, field, value as any)}
      disabled={submitting}
      lockedReason={getNumericLockReason(player, String(field))}
    />
  )

  const renderStepper = (
    index: number,
    player: PlayerRankInput,
    field: PlayerField,
    label: string,
    options?: { min?: number; max?: number; placeholder?: string; resetValue?: number; trackedTotalLabel?: string; reconcileWithTrackedItems?: boolean },
  ) => (
    <NumberStepperField
      id={`edit-${String(field)}-${index}`}
      label={label}
      value={player[field] as number | undefined}
      placeholder={options?.placeholder}
      min={options?.min}
      max={options?.max}
      resetValue={options?.resetValue}
      trackedTotalLabel={options?.trackedTotalLabel}
      reconcileWithTrackedItems={options?.reconcileWithTrackedItems ?? options?.resetValue !== undefined}
      onChange={(value) => updateField(index, field, value as any)}
      disabled={submitting}
      lockedReason={getNumericLockReason(player, String(field))}
    />
  )

  const renderInfluence = (index: number, player: PlayerRankInput, field: PlayerField, label: string) => (
    <NumberSegmentSelect
      label={label}
      value={player[field] as number | undefined}
      options={[0, 1, 2, 3, 4, 5, 6]}
      onChange={(value) => updateField(index, field, value as any)}
      disabled={submitting}
    />
  )

  const renderBoolean = (index: number, player: PlayerRankInput, field: PlayerField, label: string) => (
    <BooleanSelect label={label} value={player[field] as boolean | undefined} onChange={(value) => updateField(index, field, value as any)} disabled={submitting} />
  )

  const renderAdvanced = (player: PlayerRankInput, index: number) => {
    const acquisitions = player.acquisitions ?? []
    const contractCompletedFloor = countAcquisitions(acquisitions, "contract", ["completed"])
    const contractHeldFloor = countAcquisitions(acquisitions, "contract", ["held"])
    const intriguePlayedFloor = countAcquisitions(acquisitions, "intrigue_card", ["played"])
    const intrigueHeldFloor = countAcquisitions(acquisitions, "intrigue_card", ["held"])
    const techTilesFloor = countAcquisitions(acquisitions, "tech_tile")
    const commanderSkillsFloor = countAcquisitions(acquisitions, "sardaukar_skill")
    const conflictCardsFloor = countAcquisitions(acquisitions, "conflict_card", ["won"])
    const deckCardsTotal = countAcquisitionsForTypes(acquisitions, ["imperium_card", "reserve_card", "starter_card"])
    const deckCardsInFinalDeckFloor = countAcquisitionsForTypes(acquisitions, ["imperium_card", "reserve_card", "starter_card"], ["in_final_deck"])
    const deckCardsTrashedFloor = countAcquisitionsForTypes(acquisitions, ["imperium_card", "reserve_card", "starter_card"], ["trashed"])
    const navigationCardsFloor = countAcquisitions(acquisitions, "navigation_card", ["played"])
    const commanderSkillStrengthFloor = sumAcquisitionStrength(acquisitions, ["sardaukar_skill"])
    const intrigueStrengthFloor = sumAcquisitionStrength(acquisitions, ["intrigue_card"])
    const imperiumStrengthFloor = sumAcquisitionStrength(acquisitions, ["imperium_card", "reserve_card"])
    const techStrengthFloor = sumAcquisitionStrength(acquisitions, ["tech_tile"])
    const showVpSources = Boolean(showVpSourcesByPlayer[index])
    const showStrengthSources = Boolean(showStrengthSourcesByPlayer[index])
    const isSteersman = isSteersmanLeader(player)
    const battleIconBreakdown = calculateBattleIconVpForResult(player)
    const battleIconBadges = battleIconSourceBadges(battleIconBreakdown)
    const conflictRewardSourceVp = sumAcquisitionVp(acquisitions, ["conflict_card"])
    const spiceMustFlowSourceVp = countSpiceMustFlowAcquisitions(acquisitions)
    const intrigueSourceVp = sumSupportedIntrigueVp(player)
    const techSourceVp = sumAcquisitionVp(acquisitions, ["tech_tile"])
    const deckCardSourceVp = sumAcquisitionVp(acquisitions, ["imperium_card", "reserve_card", "starter_card"])
    const leaderSourceVp = isSteersman ? sumAcquisitionVp(acquisitions, ["navigation_card"]) : 0

    return (
      <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4">
        <StatSection title="Outcome and setup" icon={Trophy}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)_minmax(0,1fr)]">
            <NumberField id={`score-${index}`} label="Final VP" value={player.score} onChange={(value) => updateField(index, "score", value)} disabled={submitting} widthClass="max-w-64" />
            <ObjectiveSelect value={player.objectiveCard} onChange={(value) => updateField(index, "objectiveCard", value as any)} disabled={submitting} />
            <NumberSegmentSelect
              label="Turn order"
              value={player.turnOrderPosition}
              options={Array.from({ length: playerRanks.length }, (_, orderIndex) => orderIndex + 1)}
              onChange={(value) => updateField(index, "turnOrderPosition", value as any)}
              disabled={submitting}
              warning={
                player.turnOrderPosition !== undefined &&
                playerRanks.some((other, otherIndex) => otherIndex !== index && other.turnOrderPosition === player.turnOrderPosition)
                  ? "Duplicate"
                  : undefined
              }
            />
          </div>
        </StatSection>

        <StatSection title="Scoring breakdown" icon={Flag}>
          <SummaryChips
            items={[
              { label: "Faction VP", value: calculateFactionVp(player) },
              { label: "Known VP", value: calculateKnownVp(player) },
              { label: "Unaccounted", value: typeof player.score === "number" ? player.score - calculateKnownVp(player) : undefined, tone: typeof player.score === "number" && player.score - calculateKnownVp(player) === 0 ? "good" : "warn" },
            ]}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <NumberField id={`edit-vp-base-${index}`} label="Base VP" value={playerRanks.length === 4 ? 1 : 0} onChange={() => {}} disabled lockedReason={playerRanks.length === 4 ? "4-player setup starts on 1" : "setup starts on 0 outside 4-player games"} />
            <NumberStepperField id={`edit-vp-conflict-${index}`} label="Conflict reward VP" value={player.vpSourcesConflictCards} resetValue={conflictRewardSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesConflictCards", value as any)} disabled={submitting} reconcileWithTrackedItems />
            <NumberStepperField
              id={`edit-vp-battle-icons-${index}`}
              label="Battle icon VP"
              value={player.vpSourcesBattleIconMatches}
              min={battleIconBreakdown.hasInputs ? battleIconBreakdown.battleIconVp : 0}
              resetValue={battleIconBreakdown.hasInputs ? battleIconBreakdown.battleIconVp : undefined}
              onChange={(value) => updateField(index, "vpSourcesBattleIconMatches", (battleIconBreakdown.hasInputs && value === undefined ? battleIconBreakdown.battleIconVp : value) as any)}
              disabled={submitting}
            />
            <NumberStepperField id={`edit-smf-vp-${index}`} label="Spice Must Flow VP" value={player.vpSourcesSpiceMustFlow} resetValue={spiceMustFlowSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesSpiceMustFlow", value as any)} disabled={submitting} reconcileWithTrackedItems />
            <NumberStepperField id={`edit-vp-intrigue-${index}`} label="Intrigue VP" value={player.vpSourcesIntrigueCards} resetValue={intrigueSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesIntrigueCards", value as any)} disabled={submitting} lockedReason={getNumericLockReason(player, "vpSourcesIntrigueCards")} reconcileWithTrackedItems />
            <NumberStepperField id={`edit-vp-tech-${index}`} label="Tech tile VP" value={player.vpSourcesTechTiles} resetValue={techSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesTechTiles", value as any)} disabled={submitting} lockedReason={getNumericLockReason(player, "vpSourcesTechTiles")} reconcileWithTrackedItems />
            <NumberStepperField id={`edit-vp-imperium-${index}`} label="Imperium card VP" value={player.vpSourcesImperiumCards} resetValue={deckCardSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesImperiumCards", value as any)} disabled={submitting} reconcileWithTrackedItems />
            {isSteersman && (
              <NumberStepperField id={`edit-vp-leader-${index}`} label="Leader ability VP" value={player.vpSourcesLeaderAbilities} resetValue={leaderSourceVp || undefined} onChange={(value) => updateField(index, "vpSourcesLeaderAbilities", value as any)} disabled={submitting} max={1} reconcileWithTrackedItems />
            )}
          </div>
          <VpRail
            result={player}
            playerCount={playerRanks.length}
            action={(
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowVpSourcesByPlayer((current) => ({ ...current, [index]: !showVpSources }))}
              >
                {showVpSources ? "Hide VP sources" : "Show VP sources"}
              </Button>
            )}
          />
          {showVpSources && (
            <div className="mt-3 grid gap-3">
              <AcquisitionsEditor
                title="Conflict cards"
                placeholder="Search Conflict card..."
                emptyText="No Conflict cards added yet."
                allowedItemTypes={["conflict_card"]}
                summaryCount={player.vpSourcesConflictCards}
                unlistedLabel="conflict reward VP not itemised"
                summaryMetric="vp"
                vpSummaryLabel="reward VP"
                extraSummaryBadges={battleIconSummaryBadges(player, battleIconBreakdown)}
                enableVpControls
                defaultVpOnAdd
                value={player.acquisitions}
                onChange={(value) => updateField(index, "acquisitions", value as any)}
                disabled={submitting}
                globalItemCounts={globalAcquisitionCounts}
                itemBadges={battleIconBadges.conflictBadges}
                vpCapMultiplier={player.hasMakerHooks ? 2 : 1}
              />
              <AcquisitionsEditor
                title="Deck cards"
                placeholder="Search VP deck card..."
                emptyText="No scoring deck cards added yet."
                allowedItemTypes={["imperium_card", "reserve_card", "starter_card"]}
                summaryCount={player.vpSourcesImperiumCards}
                unlistedLabel="VP not itemised"
                enableVpControls
                vpOnly
                defaultVpOnAdd
                value={player.acquisitions}
                onChange={(value) => updateField(index, "acquisitions", value as any)}
                disabled={submitting}
                globalItemCounts={globalAcquisitionCounts}
              />
              <AcquisitionsEditor
                title="Intrigues"
                placeholder="Search Intrigue..."
                emptyText="No Intrigues added yet."
                allowedItemTypes={["intrigue_card"]}
                effectiveVpCounts={battleIconBreakdown.supportedIntrigueVpByItemKey}
                summaryCount={player.vpSourcesIntrigueCards}
                unlistedLabel="VP not itemised"
                enableVpControls
                vpOnly
                defaultVpOnAdd
                value={player.acquisitions}
                onChange={(value) => updateField(index, "acquisitions", value as any)}
                disabled={submitting}
                globalItemCounts={globalAcquisitionCounts}
                itemBadges={battleIconBadges.intrigueBadges}
              />
              <AcquisitionsEditor
                title="Tech tiles"
                placeholder="Search Tech tile..."
                emptyText="No Tech tiles added yet."
                allowedItemTypes={["tech_tile"]}
                summaryCount={player.vpSourcesTechTiles}
                unlistedLabel="VP not itemised"
                enableVpControls
                vpOnly
                defaultVpOnAdd
                value={player.acquisitions}
                onChange={(value) => updateField(index, "acquisitions", value as any)}
                disabled={submitting}
                globalItemCounts={globalAcquisitionCounts}
              />
              {isSteersman && (
                <AcquisitionsEditor
                  title="Leader ability"
                  placeholder="Search Navigation card..."
                  emptyText="No scoring leader card added yet."
                  allowedItemTypes={["navigation_card"]}
                  summaryCount={player.vpSourcesLeaderAbilities}
                  unlistedLabel="leader VP not itemised"
                  enableVpControls
                  vpOnly
                  defaultVpOnAdd
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                />
              )}
            </div>
          )}

        </StatSection>


        <StatSection title="Influence and alliances" icon={Landmark}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatSubsection title="Emperor">
              <div className="grid gap-3">
                {renderInfluence(index, player, "influenceEmperor", "Influence")}
                {renderBoolean(index, player, "hasAllianceEmperor", "Alliance")}
              </div>
            </StatSubsection>
            <StatSubsection title="Guild">
              <div className="grid gap-3">
                {renderInfluence(index, player, "influenceSpacingGuild", "Influence")}
                {renderBoolean(index, player, "hasAllianceSpacingGuild", "Alliance")}
              </div>
            </StatSubsection>
            <StatSubsection title="Bene Gesserit">
              <div className="grid gap-3">
                {renderInfluence(index, player, "influenceBeneGesserit", "Influence")}
                {renderBoolean(index, player, "hasAllianceBeneGesserit", "Alliance")}
              </div>
            </StatSubsection>
            <StatSubsection title="Fremen">
              <div className="grid gap-3">
                {renderInfluence(index, player, "influenceFremen", "Influence")}
                {renderBoolean(index, player, "hasAllianceFremen", "Alliance")}
              </div>
            </StatSubsection>
          </div>
        </StatSection>
        <StatSection title="Economy" defaultOpen={false} icon={Gem}>
          <div className="flex flex-wrap gap-4">
            {renderNumber(index, player, "endgameSpiceCount", "Spice")}
            {renderNumber(index, player, "endgameSolariCount", "Solari")}
            {renderNumber(index, player, "endgameWaterCount", "Water")}
          </div>
        </StatSection>

        <StatSection title="Final conflict" defaultOpen={false} icon={Swords}>
          <div className="grid gap-4">
            <div>
              <SummaryChips
                items={[
                  { label: "Known strength", value: calculateFinalConflictKnownStrength(player) },
                  { label: "Final strength", value: player.finalConflictStrength },
                  { label: "Unaccounted", value: typeof player.finalConflictStrength === "number" ? player.finalConflictStrength - calculateFinalConflictKnownStrength(player) : undefined, tone: typeof player.finalConflictStrength === "number" && player.finalConflictStrength - calculateFinalConflictKnownStrength(player) === 0 ? "good" : "warn" },
                ]}
              />
              <div className="mt-3 flex flex-wrap gap-4">
                {renderNumber(index, player, "finalConflictStrength", "Final strength")}
                <NumberField id={`final-conflict-place-${index}`} label="Place" value={calculateConflictPlace(playerRanks, index)} onChange={() => {}} disabled lockedReason="derived from final strengths" />
                <NumberStepperField id={`vp-final-conflict-${index}`} label="Final conflict VP" value={player.vpSourcesFinalConflict} onChange={(value) => updateField(index, "vpSourcesFinalConflict", value as any)} disabled={submitting} max={4} lockedReason={getNumericLockReason(player, "vpSourcesFinalConflict")} />
              </div>
            </div>
            <LightSubsection title="Deployed units">
              <div className="flex flex-wrap gap-4">
                {renderStepper(index, player, "finalConflictDeployedTroops", "Troops")}
                {renderStepper(index, player, "finalConflictDeployedCommanders", "Commanders")}
                {renderStepper(index, player, "finalConflictDeployedSandworms", "Sandworms")}
              </div>
            </LightSubsection>
            <LightSubsection title="Garrison">
              <div className="flex flex-wrap gap-4">
                {renderStepper(index, player, "finalConflictGarrisonTroops", "Troops")}
                {renderStepper(index, player, "finalConflictGarrisonCommanders", "Commanders")}
              </div>
            </LightSubsection>
            <LightSubsection
              title="Bonuses"
              action={(
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowStrengthSourcesByPlayer((current) => ({ ...current, [index]: !showStrengthSources }))}
                >
                  {showStrengthSources ? "Hide strength sources" : "Show strength sources"}
                </Button>
              )}
            >
              <div className="flex flex-wrap gap-4">
                {renderStepper(index, player, "finalConflictStrengthSourcesCommanderSkills", "Cmdr skills", { resetValue: commanderSkillStrengthFloor || undefined, trackedTotalLabel: commanderSkillStrengthFloor ? `+${commanderSkillStrengthFloor} STR` : undefined })}
                {renderStepper(index, player, "finalConflictStrengthSourcesIntrigue", "Intrigue", { resetValue: intrigueStrengthFloor || undefined, trackedTotalLabel: intrigueStrengthFloor ? `+${intrigueStrengthFloor} STR` : undefined })}
                {renderStepper(index, player, "finalConflictStrengthSourcesImperium", "Imperium", { resetValue: imperiumStrengthFloor || undefined, trackedTotalLabel: imperiumStrengthFloor ? `+${imperiumStrengthFloor} STR` : undefined })}
                {renderStepper(index, player, "finalConflictStrengthSourcesTech", "Tech tiles", { resetValue: techStrengthFloor || undefined, trackedTotalLabel: techStrengthFloor ? `+${techStrengthFloor} STR` : undefined })}
              </div>
              {showStrengthSources && (
                <div className="mt-3 grid gap-3">
                  <AcquisitionsEditor
                    title="Commander skills"
                    placeholder="Search Commander skill..."
                    emptyText="No Commander skills added yet."
                    allowedItemTypes={["sardaukar_skill"]}
                    summaryCount={player.finalConflictStrengthSourcesCommanderSkills}
                    unlistedLabel="strength not itemised"
                    enableStrengthControls
                    strengthOnly
                    value={player.acquisitions}
                    onChange={(value) => updateField(index, "acquisitions", value as any)}
                    disabled={submitting || isZero(player.commanderSkillsCount)}
                    globalItemCounts={globalAcquisitionCounts}
                  />
                  <AcquisitionsEditor
                    title="Intrigues"
                    placeholder="Search Combat Intrigue..."
                    emptyText="No Intrigues added yet."
                    allowedItemTypes={["intrigue_card"]}
                    summaryCount={player.finalConflictStrengthSourcesIntrigue}
                    unlistedLabel="strength not itemised"
                    enableStrengthControls
                    strengthOnly
                    value={player.acquisitions}
                    onChange={(value) => updateField(index, "acquisitions", value as any)}
                    disabled={submitting || isZero(player.intrigueCardsPlayed)}
                    globalItemCounts={globalAcquisitionCounts}
                    itemBadges={battleIconBadges.intrigueBadges}
                  />
                  <AcquisitionsEditor
                    title="Deck cards"
                    placeholder="Search strength card..."
                    emptyText="No deck cards added yet."
                    allowedItemTypes={["imperium_card", "reserve_card", "starter_card"]}
                    summaryCount={player.finalConflictStrengthSourcesImperium}
                    unlistedLabel="strength not itemised"
                    enableStrengthControls
                    strengthOnly
                    value={player.acquisitions}
                    onChange={(value) => updateField(index, "acquisitions", value as any)}
                    disabled={submitting}
                    globalItemCounts={globalAcquisitionCounts}
                  />
                  <AcquisitionsEditor
                    title="Tech tiles"
                    placeholder="Search strength Tech tile..."
                    emptyText="No Tech tiles added yet."
                    allowedItemTypes={["tech_tile"]}
                    summaryCount={player.finalConflictStrengthSourcesTech}
                    unlistedLabel="strength not itemised"
                    enableStrengthControls
                    strengthOnly
                    value={player.acquisitions}
                    onChange={(value) => updateField(index, "acquisitions", value as any)}
                    disabled={submitting || isZero(player.techTilesCount)}
                    globalItemCounts={globalAcquisitionCounts}
                  />
                </div>
              )}
            </LightSubsection>
          </div>
        </StatSection>

        <StatSection title="Board state and assets" defaultOpen={false} icon={Shield}>
          <div className="grid gap-4">
            <LightSubsection title="Presence">
              <div className="flex flex-wrap gap-4">
                {renderStepper(index, player, "spiesOnBoardEndgame", "Spies")}
                {renderStepper(index, player, "controlMarkerCount", "Control")}
              </div>
            </LightSubsection>
            <LightSubsection title="Board upgrades">
              <div className="flex flex-wrap gap-4">
                {renderBoolean(index, player, "hasHighCouncil", "High Council")}
                <CouncilSeatSelect label="Council seat" value={player.highCouncilSeatPosition} onChange={(value) => updateField(index, "highCouncilSeatPosition", value as any)} disabled={submitting || player.hasHighCouncil === false} />
                {renderBoolean(index, player, "hasSwordmaster", "Swordmaster")}
                {renderBoolean(index, player, "hasMakerHooks", "Maker Hooks")}
              </div>
            </LightSubsection>
            <LightSubsection title="Contracts">
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-4">
                  <NumberStepperField id={`edit-contracts-completed-${index}`} label="Completed" value={player.contractsCompletedCount} resetValue={contractCompletedFloor || undefined} onChange={(value) => updateField(index, "contractsCompletedCount", value as any)} disabled={submitting} reconcileWithTrackedItems />
                  <NumberStepperField id={`edit-contracts-held-${index}`} label="Held" value={player.contractsHeldIncomplete} resetValue={contractHeldFloor || undefined} onChange={(value) => updateField(index, "contractsHeldIncomplete", value as any)} disabled={submitting} reconcileWithTrackedItems />
                </div>
                <AcquisitionsEditor
                  title="Tracked contracts"
                  placeholder="Search contract..."
                  emptyText="No contracts added yet."
                  allowedItemTypes={["contract"]}
                  summaryCount={summaryTotal(player.contractsCompletedCount, player.contractsHeldIncomplete)}
                  unlistedLabel="contract not itemised"
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                />
              </div>
            </LightSubsection>
            <LightSubsection title="Tech tiles">
              <div className="grid gap-3">
                <NumberStepperField id={`edit-tech-tiles-count-${index}`} label="Count" value={player.techTilesCount} resetValue={techTilesFloor || undefined} onChange={(value) => updateField(index, "techTilesCount", value as any)} disabled={submitting} reconcileWithTrackedItems />
                <AcquisitionsEditor
                  title="Tracked tech tiles"
                  placeholder="Search Tech tile..."
                  emptyText="No Tech tiles added yet."
                  allowedItemTypes={["tech_tile"]}
                  summaryCount={player.techTilesCount}
                  unlistedLabel="tech tile not itemised"
                  enableVpControls
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                />
              </div>
            </LightSubsection>
            <LightSubsection title="Commander skills">
              <div className="grid gap-3">
                <NumberStepperField id={`edit-commander-skills-count-${index}`} label="Count" value={player.commanderSkillsCount} resetValue={commanderSkillsFloor || undefined} onChange={(value) => updateField(index, "commanderSkillsCount", value as any)} disabled={submitting} reconcileWithTrackedItems />
                <AcquisitionsEditor
                  title="Tracked commander skills"
                  placeholder="Search Commander skill..."
                  emptyText="No Commander skills added yet."
                  allowedItemTypes={["sardaukar_skill"]}
                  summaryCount={player.commanderSkillsCount}
                  unlistedLabel="commander skill not itemised"
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                />
              </div>
            </LightSubsection>
          </div>
        </StatSection>

        <StatSection title="Cards and intrigues" defaultOpen={false} icon={ScrollText}>
          <div className="grid gap-4">
            <LightSubsection title="Deck composition">
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-4">
                  <NumberStepperField id={`edit-final-deck-size-${index}`} label="Size" value={player.finalDeckSize} resetValue={deckCardsInFinalDeckFloor || undefined} onChange={(value) => updateField(index, "finalDeckSize", value as any)} disabled={submitting} reconcileWithTrackedItems />
                  <NumberStepperField id={`edit-cards-trashed-${index}`} label="Trashed" value={player.cardsTrashedCount} resetValue={deckCardsTrashedFloor || undefined} onChange={(value) => updateField(index, "cardsTrashedCount", value as any)} disabled={submitting} reconcileWithTrackedItems />
                </div>
                <AcquisitionsEditor
                  title="Tracked deck cards"
                  placeholder="Search deck or starter card..."
                  emptyText="No deck cards added yet."
                  allowedItemTypes={["imperium_card", "reserve_card", "starter_card"]}
                  summaryCount={deckCardsTotal}
                  unlistedLabel="card not itemised"
                  enableVpControls
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                />
              </div>
            </LightSubsection>
            <LightSubsection title="Conflicts">
              <div className="grid gap-3">
                <NumberStepperField id={`edit-conflicts-won-${index}`} label="Conflicts won" value={player.conflictCardsWonCount} resetValue={conflictCardsFloor || undefined} onChange={(value) => updateField(index, "conflictCardsWonCount", value as any)} disabled={submitting} reconcileWithTrackedItems />
                <AcquisitionsEditor
                  title="Conflict cards won"
                  placeholder="Search Conflict card..."
                  emptyText="No Conflict cards added yet."
                  allowedItemTypes={["conflict_card"]}
                  summaryCount={player.conflictCardsWonCount}
                  unlistedLabel="conflict not itemised"
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                itemBadges={battleIconBadges.conflictBadges}
                />
              </div>
            </LightSubsection>
            <LightSubsection title="Intrigue">
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-4">
                  <NumberStepperField id={`edit-intrigue-played-${index}`} label="Played" value={player.intrigueCardsPlayed} resetValue={intriguePlayedFloor || undefined} onChange={(value) => updateField(index, "intrigueCardsPlayed", value as any)} disabled={submitting} reconcileWithTrackedItems />
                  <NumberStepperField id={`edit-intrigue-held-${index}`} label="Held" value={player.intrigueCardsHeldEndgame} resetValue={intrigueHeldFloor || undefined} onChange={(value) => updateField(index, "intrigueCardsHeldEndgame", value as any)} disabled={submitting} reconcileWithTrackedItems />
                </div>
                <AcquisitionsEditor
                  title="Tracked intrigues"
                  placeholder="Search Intrigue card..."
                  emptyText="No Intrigue cards added yet."
                  allowedItemTypes={["intrigue_card"]}
                  summaryCount={summaryTotal(player.intrigueCardsPlayed, player.intrigueCardsHeldEndgame)}
                  unlistedLabel="intrigue not itemised"
                  enableVpControls
                  value={player.acquisitions}
                  onChange={(value) => updateField(index, "acquisitions", value as any)}
                  disabled={submitting}
                  globalItemCounts={globalAcquisitionCounts}
                itemBadges={battleIconBadges.intrigueBadges}
                />
              </div>
            </LightSubsection>
          </div>
        </StatSection>

        {isSteersman && (
          <StatSection title="Navigation cards" defaultOpen={false} icon={Zap}>
            <AcquisitionsEditor
              title="Tracked navigation cards"
              placeholder="Search Navigation card..."
              emptyText="No Navigation cards added yet."
              allowedItemTypes={["navigation_card"]}
              summaryCount={navigationCardsFloor}
              unlistedLabel="navigation card not itemised"
              enableVpControls
              value={player.acquisitions}
              onChange={(value) => updateField(index, "acquisitions", value as any)}
              disabled={submitting}
              globalItemCounts={globalAcquisitionCounts}
            />
          </StatSection>
        )}

        <StatSection title="Notes" defaultOpen={false} icon={NotebookText}>
          <TextField id={`notes-${index}`} label="Player notes" value={player.notes} placeholder="e.g. 1 influence from Panopticon" onChange={(value) => updateField(index, "notes", value)} disabled={submitting} />
        </StatSection>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Playthrough
        </CardTitle>
        <CardDescription>Update player names, rankings, leaders, and analytics-compatible Dune stats.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-game-date">Game Date</Label>
              <Input id="edit-game-date" type="date" value={gameDate} onChange={(event) => setGameDate(event.target.value)} disabled={submitting} className="w-full" />
            </div>
            <NumberField id="edit-round-count" label="Rounds" value={roundCount} placeholder="e.g. 6" onChange={setRoundCount} disabled={submitting} />
          </div>

          <div className="space-y-4">
            {playerRanks.map((playerRank, index) => {
              const suggestions = existingPlayers.filter((player) => player.name.toLowerCase().includes(playerRank.playerName.toLowerCase()) && player.name.toLowerCase() !== playerRank.playerName.toLowerCase())
              const showSuggestions = showPlayerSuggestions[playerRank.id] && suggestions.length > 0
              const isExpanded = expandedPlayerId === playerRank.id

              return (
                <div key={playerRank.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[minmax(120px,1fr)_120px_minmax(160px,220px)_auto] md:items-end">
                    <div className="relative">
                      <Label htmlFor={`player-name-${playerRank.id}`}>Player Name</Label>
                      <Input
                        id={`player-name-${playerRank.id}`}
                        value={playerRank.playerName}
                        onChange={(event) => updateField(index, "playerName", event.target.value)}
                        onFocus={() => setShowPlayerSuggestions((prev) => ({ ...prev, [playerRank.id]: true }))}
                        onBlur={() => setTimeout(() => setShowPlayerSuggestions((prev) => ({ ...prev, [playerRank.id]: false })), 200)}
                        disabled={submitting}
                      />
                      {showSuggestions && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-md border bg-white shadow-lg">
                          {suggestions.slice(0, 5).map((player) => (
                            <button key={player.id} type="button" className="w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50" onMouseDown={() => selectExistingPlayer(index, player)}>
                              <div className="flex items-center justify-between">
                                <span>{player.name}</span>
                                <Badge variant="secondary" className="text-xs">Existing</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Final Rank</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex h-9 min-w-12 items-center justify-center rounded-lg border bg-amber-50 px-3 text-sm font-semibold text-amber-700 shadow-sm">
                          {playerRank.rank || index + 1}
                        </div>
                        <div className="flex overflow-hidden rounded-lg border bg-white shadow-sm">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center border-r text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => movePlayerRank(index, -1)}
                            disabled={submitting || index === 0}
                            aria-label="Move player up in rankings"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => movePlayerRank(index, 1)}
                            disabled={submitting || index === playerRanks.length - 1}
                            aria-label="Move player down in rankings"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {playthrough?.game_type === "dune" && (
                      <div>
                        <Label>Leader</Label>
                        {leadersLoading ? (
                          <div className="flex h-10 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                        ) : (
                          <Select value={playerRank.leaderId || "none"} onValueChange={(value) => updateLeader(index, normaliseSelectId(value))} disabled={submitting}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leader" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No leader</SelectItem>
                              {leaders.map((leader) => (
                                <SelectItem key={leader.id} value={leader.id}>{leader.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    <Button type="button" variant="ghost" size="sm" onClick={() => removePlayerField(index)} disabled={playerRanks.length <= 1 || submitting} aria-label="Remove player">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  {playthrough?.game_type === "dune" && (
                    <div className="mt-4">
                      {isExpanded ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-expanded-player-anchor={playerRank.id}
                            className="w-full justify-between rounded-lg border-slate-200 bg-white/80 hover:bg-amber-50"
                            onClick={() => setExpandedPlayerId(null)}
                            disabled={submitting}
                          >
                            <span className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4" />
                              Close editor
                            </span>
                            {hasAdvancedData(playerRank) && <Badge variant="secondary">Has data</Badge>}
                          </Button>

                          {showStickyPlayerContext && (
                            <div className="sticky top-0 z-30 -mx-4 mt-3 border-b border-amber-300 bg-amber-50/95 px-4 py-3 shadow-md ring-1 ring-amber-200/80 backdrop-blur">
                              <div className="flex flex-wrap items-center gap-3 border-l-4 border-amber-500 pl-3">
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  onClick={() => setExpandedPlayerId(null)}
                                  disabled={submitting}
                                >
                                  <ChevronDown className="h-4 w-4 shrink-0 text-amber-700" />
                                  <span className="truncate text-sm font-semibold text-slate-950">
                                    {playerRank.playerName || `Player ${index + 1}`}
                                  </span>
                                </button>

                                <Badge variant="outline" className="shrink-0 border-amber-300 bg-white text-amber-800">
                                  Rank {playerRank.rank || index + 1}
                                </Badge>

                                {playerRank.leaderName && (
                                  <span className="min-w-0 max-w-[14rem] truncate text-sm text-slate-600">
                                    {playerRank.leaderName}
                                  </span>
                                )}

                                {hasAdvancedData(playerRank) && (
                                  <Badge variant="secondary" className="shrink-0">
                                    Has data
                                  </Badge>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 shrink-0 text-slate-700 hover:bg-amber-100"
                                  onClick={() => setExpandedPlayerId(null)}
                                  disabled={submitting}
                                >
                                  Close editor
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-between rounded-lg border-slate-200 bg-white/80 hover:bg-amber-50"
                          onClick={() => setExpandedPlayerId(playerRank.id)}
                          disabled={submitting}
                        >
                          <span className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4" />
                            Open full editor
                          </span>
                          {hasAdvancedData(playerRank) && <Badge variant="secondary">Has data</Badge>}
                        </Button>
                      )}
                      {isExpanded && renderAdvanced(playerRank, index)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="sticky bottom-0 z-30 -mx-6 -mb-6 mt-6 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex justify-end gap-2 sm:ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={addPlayerField} disabled={submitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Player
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting || submitSuccess}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : submitSuccess ? (
                  <><CheckCircle className="mr-2 h-4 w-4 text-green-600" />Updated!</>
                ) : (
                  "Update Playthrough"
                )}
              </Button>
            </div>
          </div>
        </div>
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        </form>
      </CardContent>
    </Card>
  )
}
