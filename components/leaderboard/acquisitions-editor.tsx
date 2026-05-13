"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp, Minus, Plus, Search, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DUNE_ACQUISITION_OPTIONS,
  DUNE_ACQUISITION_OPTIONS_BY_KEY,
  filterDuneAcquisitionOptions,
} from "@/lib/dune-acquisition-inventory"
import type {
  AcquisitionItemStatus,
  AcquisitionItemType,
  DuneAcquisitionOption,
  PlaythroughResultAcquisitionInput,
} from "@/types/dune-acquisitions"

interface AcquisitionsEditorProps {
  value?: PlaythroughResultAcquisitionInput[]
  onChange: (value: PlaythroughResultAcquisitionInput[]) => void
  disabled?: boolean
  title?: string
  emptyText?: string
  placeholder?: string
  allowedItemTypes?: AcquisitionItemType[]
  enableVpControls?: boolean
  globalItemCounts?: Record<string, number>
  summaryCount?: number
  unlistedLabel?: string
  vpOnly?: boolean
  defaultVpOnAdd?: boolean
  enableStrengthControls?: boolean
  strengthOnly?: boolean
  defaultStrengthOnAdd?: boolean
  summaryMetric?: "copies" | "vp" | "strength"
  effectiveVpCounts?: Record<string, number>
  itemBadges?: Record<string, string[]>
  vpCapMultiplier?: number
  vpSummaryLabel?: string
  extraSummaryBadges?: Array<{ label: string; className?: string }>
}

const ITEM_TYPE_LABELS: Record<AcquisitionItemType, string> = {
  imperium_card: "Imperium",
  reserve_card: "Reserve",
  intrigue_card: "Intrigue",
  tech_tile: "Tech",
  sardaukar_skill: "Commander skill",
  contract: "Contract",
  conflict_card: "Conflict",
  navigation_card: "Navigation",
  starter_card: "Starter",
}

const ITEM_TYPE_BADGE_CLASS: Record<AcquisitionItemType, string> = {
  imperium_card: "border-blue-200 bg-blue-50 text-blue-700",
  reserve_card: "border-slate-200 bg-slate-50 text-slate-700",
  intrigue_card: "border-purple-200 bg-purple-50 text-purple-700",
  tech_tile: "border-amber-200 bg-amber-50 text-amber-700",
  sardaukar_skill: "border-red-200 bg-red-50 text-red-700",
  contract: "border-emerald-200 bg-emerald-50 text-emerald-700",
  conflict_card: "border-orange-200 bg-orange-50 text-orange-700",
  navigation_card: "border-cyan-200 bg-cyan-50 text-cyan-700",
  starter_card: "border-slate-200 bg-slate-50 text-slate-700",
}

const STATUS_LABELS: Record<AcquisitionItemStatus, string> = {
  not_set: "No status",
  in_final_deck: "In deck",
  trashed: "Trashed",
  played: "Played",
  held: "Held",
  completed: "Completed",
  won: "Won",
}

const STATUS_BADGE_CLASS: Record<AcquisitionItemStatus, string> = {
  not_set: "border-slate-200 bg-slate-50 text-slate-600",
  in_final_deck: "border-blue-200 bg-blue-50 text-blue-700",
  trashed: "border-red-200 bg-red-50 text-red-700",
  played: "border-purple-200 bg-purple-50 text-purple-700",
  held: "border-slate-200 bg-slate-50 text-slate-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  won: "border-orange-200 bg-orange-50 text-orange-700",
}

function positiveCount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1
}

function nonNegativeCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0
}

function isSpiceMustFlowItem(item: PlaythroughResultAcquisitionInput): boolean {
  return (
    (item.itemType === "reserve_card" || item.itemType === "imperium_card") &&
    /the spice must flow/i.test(item.itemName)
  )
}

function optionRulesText(option?: DuneAcquisitionOption): string {
  return [option?.effectText, option?.description, option?.searchText].filter(Boolean).join(" ")
}

function isTrashThisCardVpSource(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): boolean {
  if (item.itemType !== "imperium_card" && item.itemType !== "reserve_card") return false
  return /trash\s+this\s+card/i.test(optionRulesText(option))
}

function maxVpForItem(
  item: PlaythroughResultAcquisitionInput,
  option?: DuneAcquisitionOption,
  vpCapMultiplier = 1,
): number | undefined {
  const max = option?.vpAvailable
  if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) return undefined

  if (item.itemType === "conflict_card") {
    return Math.max(0, Math.trunc(max * Math.max(1, vpCapMultiplier)))
  }

  if (isTrashThisCardVpSource(item, option)) return Math.trunc(max)

  // Some Imperium cards can score repeatedly from the same card ability, so the
  // printed VP flag should not cap the entered VP for those cards.
  if (item.itemType === "imperium_card") return undefined

  return Math.trunc(max)
}

function normaliseVpCount(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption, vpCapMultiplier = 1): number {
  const raw = item.vpCount ?? item.vp_count
  const value = nonNegativeCount(raw)
  const max = maxVpForItem(item, option, vpCapMultiplier)
  return max === undefined ? value : Math.min(value, max)
}

function effectiveVpCount(
  item: PlaythroughResultAcquisitionInput,
  option?: DuneAcquisitionOption,
  overrides?: Record<string, number>,
  vpCapMultiplier = 1,
): number {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, item.itemKey)) {
    return Math.max(0, Math.trunc(overrides[item.itemKey] ?? 0))
  }
  if (isSpiceMustFlowItem(item)) return positiveCount(item.acquisitionCount)
  return normaliseVpCount(item, option, vpCapMultiplier)
}

function canTrackVp(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): boolean {
  if (!option?.vpAvailable || option.vpAvailable <= 0) return false
  if (isSpiceMustFlowItem(item)) return false
  return (
    item.itemType === "imperium_card" ||
    item.itemType === "reserve_card" ||
    item.itemType === "starter_card" ||
    item.itemType === "intrigue_card" ||
    item.itemType === "tech_tile" ||
    item.itemType === "conflict_card" ||
    item.itemType === "navigation_card"
  )
}

function canTrashCommanderSkill(itemName: string): boolean {
  // The current inventory uses “Desparate”, while the rules text uses “Desperate”.
  return /^desp[ae]rate$/i.test(itemName.trim())
}

function defaultStatusForOption(option: DuneAcquisitionOption): AcquisitionItemStatus {
  switch (option.itemType) {
    case "imperium_card":
    case "reserve_card":
    case "starter_card":
      return "in_final_deck"
    case "intrigue_card":
      return "not_set"
    case "tech_tile":
    case "sardaukar_skill":
      return "held"
    case "contract":
      return "not_set"
    case "conflict_card":
      return "won"
    case "navigation_card":
      return "played"
    default:
      return "not_set"
  }
}

function optionToInput(option: DuneAcquisitionOption): PlaythroughResultAcquisitionInput {
  return {
    itemKey: option.itemKey,
    itemName: option.itemName,
    itemType: option.itemType,
    deckId: option.deckId,
    source: option.source,
    acquisitionCount: 1,
    itemStatus: defaultStatusForOption(option),
    vpCount: 0,
    entrySource: "manual",
    acquisitionMethod: undefined,
  }
}

function getCatalogOption(item: PlaythroughResultAcquisitionInput): DuneAcquisitionOption | undefined {
  return DUNE_ACQUISITION_OPTIONS_BY_KEY.get(item.itemKey)
}

function getItemStatus(item: PlaythroughResultAcquisitionInput): AcquisitionItemStatus {
  const legacyStatus = item.acquisitionMethod as AcquisitionItemStatus | undefined
  const rawStatus = item.itemStatus ?? item.item_status ?? legacyStatus

  if (rawStatus && rawStatus in STATUS_LABELS) return rawStatus as AcquisitionItemStatus

  const option = getCatalogOption(item)
  if (option) return defaultStatusForOption(option)

  switch (item.itemType) {
    case "imperium_card":
    case "reserve_card":
    case "starter_card":
      return "in_final_deck"
    case "intrigue_card":
      return "not_set"
    case "tech_tile":
    case "sardaukar_skill":
      return "held"
    case "contract":
      return "not_set"
    case "conflict_card":
      return "won"
    case "navigation_card":
      return "played"
    default:
      return "not_set"
  }
}

function getStatusOptions(item: PlaythroughResultAcquisitionInput): AcquisitionItemStatus[] {
  switch (item.itemType) {
    case "contract":
      return ["completed", "held"]
    case "intrigue_card":
      return ["not_set", "played", "held"]
    case "imperium_card":
    case "reserve_card":
    case "starter_card":
      return ["in_final_deck", "trashed"]
    case "tech_tile":
      return ["held", "trashed"]
    case "sardaukar_skill":
      return canTrashCommanderSkill(item.itemName) ? ["held", "trashed"] : ["held"]
    case "conflict_card":
      return ["won"]
    case "navigation_card":
      return ["played"]
    default:
      return ["not_set"]
  }
}

function normaliseItem(item: PlaythroughResultAcquisitionInput, vpCapMultiplier = 1): PlaythroughResultAcquisitionInput {
  const allowedStatuses = getStatusOptions(item)
  const option = getCatalogOption(item)
  let status = getItemStatus(item)
  let vpCount = normaliseVpCount(item, option, vpCapMultiplier)

  if (!allowedStatuses.includes(status)) {
    status = status === "not_set" && item.itemType === "contract" ? "not_set" : allowedStatuses[0] ?? "not_set"
  }

  if (item.itemType === "intrigue_card" && status === "held" && vpCount > 0) {
    vpCount = 0
  }

  if (item.itemType === "intrigue_card" && vpCount > 0) {
    status = "played"
  }

  if (vpCount > 0 && isTrashThisCardVpSource(item, option)) {
    status = "trashed"
  }

  return {
    ...item,
    acquisitionCount: positiveCount(item.acquisitionCount),
    itemStatus: status,
    vpCount,
    strengthCount: normaliseStrengthCount(item, option),
    entrySource: item.entrySource ?? item.entry_source ?? "manual",
    acquisitionMethod: undefined,
  }
}

function itemSubtitle(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): string {
  return [option?.deckName ?? item.deckId, item.source, ...(option?.tags ?? [])].filter(Boolean).join(" · ")
}

function itemDetails(option?: DuneAcquisitionOption): string | undefined {
  return option?.effectText || option?.description || undefined
}

function itemTypeLabel(itemType: AcquisitionItemType): string {
  return ITEM_TYPE_LABELS[itemType] ?? itemType
}

function itemBadgeClass(label: string): string {
  if (/unsupported|over|unassigned|not itemised/i.test(label)) return "border-amber-200 bg-amber-50 text-amber-700"
  if (/intrigue|used/i.test(label)) return "border-purple-200 bg-purple-50 text-purple-700"
  if (/wild/i.test(label)) return "border-yellow-200 bg-yellow-50 text-yellow-700"
  if (/matched/i.test(label)) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (/face-up|remaining/i.test(label)) return "border-slate-200 bg-slate-50 text-slate-600"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function selectedSummary(items: PlaythroughResultAcquisitionInput[]): string {
  const names = items.slice(0, 3).map((item) => item.itemName)
  if (items.length <= 3) return names.join(" · ")
  return `${names.join(" · ")} · +${items.length - 3} more`
}

function itemVpCount(item: PlaythroughResultAcquisitionInput): number {
  const option = getCatalogOption(item)
  if (!option?.vpAvailable || option.vpAvailable <= 0) return 0
  if (isSpiceMustFlowItem(item)) return positiveCount(item.acquisitionCount)
  return normaliseVpCount(item, option)
}

function sumItemVp(items: PlaythroughResultAcquisitionInput[], overrides?: Record<string, number>, vpCapMultiplier = 1): number {
  return items.reduce((total, item) => total + effectiveVpCount(item, getCatalogOption(item), overrides, vpCapMultiplier), 0)
}

function itemStrengthCount(item: PlaythroughResultAcquisitionInput): number {
  return nonNegativeCount(item.strengthCount ?? item.strength_count)
}

function sumItemStrength(items: PlaythroughResultAcquisitionInput[]): number {
  return items.reduce((total, item) => total + itemStrengthCount(item), 0)
}

function fixedStrengthNumbersFromText(text: string): number[] {
  const directMatches = [...text.matchAll(/\+(\d+)\s*(?:swords?|strength)\b/gi)].map((match) => Number(match[1]))
  const labelMatches = [...text.matchAll(/\b(?:swords?|strength)\s*:\s*(\d+)\b/gi)].map((match) => Number(match[1]))

  return [...directMatches, ...labelMatches].filter((value) => Number.isFinite(value) && value > 0)
}

function strengthChoicesFromText(text?: string): number[] | undefined {
  if (!text) return undefined

  const normalised = text.replace(/\s+/g, " ")

  if (/\b(for each|per|any number|each .*where|number of)\b/i.test(normalised)) {
    return undefined
  }

  const choices = new Set<number>([0])
  const alternatives = normalised.split(/\bOR\b|\bor\b/)

  for (const alternative of alternatives) {
    const numbers = fixedStrengthNumbersFromText(alternative)
    if (numbers.length === 0) continue

    const total = numbers.reduce((sum, value) => sum + value, 0)

    if (numbers.length === 1) {
      choices.add(numbers[0])
    } else {
      // Many combat Intrigues have a base amount plus a conditional kicker.
      // Surface the base amount and the full conditional total, not every value
      // between them.
      choices.add(numbers[0])
      choices.add(total)
    }
  }

  const sorted = [...choices].sort((left, right) => left - right)
  return sorted.length > 1 ? sorted : undefined
}

function strengthChoicesForItem(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): number[] | undefined {
  if (item.itemType !== "intrigue_card") return undefined
  return strengthChoicesFromText(itemDetails(option) ?? option?.searchText)
}

function maxStrengthForItem(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): number | undefined {
  const choices = strengthChoicesForItem(item, option)
  if (!choices || choices.length === 0) return undefined

  return choices[choices.length - 1]
}

function normaliseStrengthCount(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): number {
  const value = itemStrengthCount(item)
  const choices = strengthChoicesForItem(item, option)

  if (!choices) return value
  if (choices.includes(value)) return value

  const lowerChoice = [...choices].reverse().find((choice) => choice <= value)
  return lowerChoice ?? 0
}

function nextStrengthCount(item: PlaythroughResultAcquisitionInput, option: DuneAcquisitionOption | undefined, delta: number): number {
  const current = normaliseStrengthCount(item, option)
  const choices = strengthChoicesForItem(item, option)

  if (!choices) return Math.max(0, current + delta)

  if (delta > 0) {
    return choices.find((choice) => choice > current) ?? current
  }

  if (delta < 0) {
    return [...choices].reverse().find((choice) => choice < current) ?? current
  }

  return current
}

function containsStrengthText(option?: DuneAcquisitionOption): boolean {
  const text = [option?.effectText, option?.description, option?.searchText].filter(Boolean).join(" ")
  return /\b(sword|swords|strength|combat)\b/i.test(text)
}

function canTrackStrength(item: PlaythroughResultAcquisitionInput, option?: DuneAcquisitionOption): boolean {
  if (!containsStrengthText(option)) return false
  return (
    item.itemType === "imperium_card" ||
    item.itemType === "reserve_card" ||
    item.itemType === "starter_card" ||
    item.itemType === "intrigue_card" ||
    item.itemType === "tech_tile" ||
    item.itemType === "sardaukar_skill"
  )
}

function isStrengthOption(option: DuneAcquisitionOption): boolean {
  return canTrackStrength({
    itemKey: option.itemKey,
    itemName: option.itemName,
    itemType: option.itemType,
    deckId: option.deckId,
    acquisitionCount: 1,
  }, option)
}

function isVpOption(option: DuneAcquisitionOption): boolean {
  return typeof option.vpAvailable === "number" && option.vpAvailable > 0
}

function copyLimit(option?: DuneAcquisitionOption): number | undefined {
  const count = option?.copyCount
  return typeof count === "number" && Number.isFinite(count) && count > 0 ? Math.trunc(count) : undefined
}

function usesGlobalCopyLimit(option?: DuneAcquisitionOption, itemType?: AcquisitionItemType): boolean {
  if (option?.copyScope === "per_player") return false
  if (option?.copyScope === "global") return true

  // Backwards compatibility for rows created before copyScope was exposed.
  return itemType !== "starter_card"
}

function perPlayerCopyLimit(option?: DuneAcquisitionOption, itemType?: AcquisitionItemType): number | undefined {
  if (itemType === "sardaukar_skill") return 1

  const limit = copyLimit(option)
  return usesGlobalCopyLimit(option, itemType) ? undefined : limit
}

function globalCopyMaxForCurrent(
  item: PlaythroughResultAcquisitionInput,
  option?: DuneAcquisitionOption,
  globalItemCounts?: Record<string, number>,
): number | undefined {
  const limit = copyLimit(option)
  if (limit === undefined || !usesGlobalCopyLimit(option, item.itemType)) return undefined

  const current = positiveCount(item.acquisitionCount)
  return Math.max(0, limit - Math.max(0, globalCountFor(item.itemKey, current, globalItemCounts) - current))
}

function globalCopyMaxForNew(
  option: DuneAcquisitionOption,
  globalItemCounts?: Record<string, number>,
): number | undefined {
  const limit = copyLimit(option)
  if (limit === undefined || !usesGlobalCopyLimit(option, option.itemType)) return undefined

  return Math.max(0, limit - globalCountFor(option.itemKey, 0, globalItemCounts))
}

function globalCountFor(itemKey: string, fallback: number, globalItemCounts?: Record<string, number>): number {
  const value = globalItemCounts?.[itemKey]
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback
}

function conflictLevel(option?: DuneAcquisitionOption): number | undefined {
  const level = option?.conflictLevel
  return option?.itemType === "conflict_card" && typeof level === "number" && Number.isFinite(level)
    ? Math.trunc(level)
    : undefined
}

function conflictLevelLimit(option?: DuneAcquisitionOption): number | undefined {
  const level = conflictLevel(option)
  if (level === 1) return 1
  if (level === 2) return 5
  return undefined
}

function currentSelectionCountForConflictLevel(
  selected: PlaythroughResultAcquisitionInput[],
  level: number,
  excludedItemKey?: string,
): number {
  return selected.reduce((total, item) => {
    if (item.itemKey === excludedItemKey) return total
    const option = getCatalogOption(item)
    if (conflictLevel(option) !== level) return total
    return total + positiveCount(item.acquisitionCount)
  }, 0)
}

function globalCountForConflictLevel(level: number, globalItemCounts?: Record<string, number>): number {
  if (!globalItemCounts) return 0

  return DUNE_ACQUISITION_OPTIONS.reduce((total, option) => {
    if (conflictLevel(option) !== level) return total
    return total + globalCountFor(option.itemKey, 0, globalItemCounts)
  }, 0)
}

function minDefined(...values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return defined.length > 0 ? Math.min(...defined) : undefined
}

function maxAllowedForCurrent(
  item: PlaythroughResultAcquisitionInput,
  option?: DuneAcquisitionOption,
  globalItemCounts?: Record<string, number>,
  selected: PlaythroughResultAcquisitionInput[] = [],
): number | undefined {
  const current = positiveCount(item.acquisitionCount)
  const copyMax = minDefined(
    globalCopyMaxForCurrent(item, option, globalItemCounts),
    perPlayerCopyLimit(option, item.itemType),
  )

  const levelLimit = conflictLevelLimit(option)
  const level = conflictLevel(option)
  if (levelLimit === undefined || level === undefined) return copyMax

  const currentPlayerLevelTotal = currentSelectionCountForConflictLevel(selected, level)
  const currentPlayerOtherLevel = Math.max(0, currentPlayerLevelTotal - current)
  const otherPlayersLevel = Math.max(0, globalCountForConflictLevel(level, globalItemCounts) - currentPlayerLevelTotal)
  const levelMax = Math.max(0, levelLimit - otherPlayersLevel - currentPlayerOtherLevel)

  return minDefined(copyMax, levelMax)
}

function maxAllowedForNew(
  option: DuneAcquisitionOption,
  globalItemCounts?: Record<string, number>,
  selected: PlaythroughResultAcquisitionInput[] = [],
): number | undefined {
  const copyMax = minDefined(
    globalCopyMaxForNew(option, globalItemCounts),
    perPlayerCopyLimit(option, option.itemType),
  )

  const levelLimit = conflictLevelLimit(option)
  const level = conflictLevel(option)
  if (levelLimit === undefined || level === undefined) return copyMax

  const currentPlayerLevelTotal = currentSelectionCountForConflictLevel(selected, level)
  const otherPlayersLevel = Math.max(0, globalCountForConflictLevel(level, globalItemCounts) - currentPlayerLevelTotal)
  const levelMax = Math.max(0, levelLimit - otherPlayersLevel - currentPlayerLevelTotal)

  return minDefined(copyMax, levelMax)
}

function countLimitWarning(
  item: PlaythroughResultAcquisitionInput,
  option?: DuneAcquisitionOption,
  globalItemCounts?: Record<string, number>,
  selected: PlaythroughResultAcquisitionInput[] = [],
): string | undefined {
  const copyCountLimit = copyLimit(option)
  const current = positiveCount(item.acquisitionCount)
  const global = globalCountFor(item.itemKey, current, globalItemCounts)
  const playerLimit = perPlayerCopyLimit(option, item.itemType)

  if (playerLimit !== undefined && current > playerLimit) return `${current} selected, ${playerLimit} per player`

  if (copyCountLimit !== undefined) {
    if (usesGlobalCopyLimit(option, item.itemType) && global > copyCountLimit) return `${global} selected across players, ${copyCountLimit} available`
    if (!usesGlobalCopyLimit(option, item.itemType) && current > copyCountLimit) return `${current} selected, ${copyCountLimit} available`
  }

  const levelLimit = conflictLevelLimit(option)
  const level = conflictLevel(option)
  if (levelLimit !== undefined && level !== undefined) {
    const currentLevelTotal = currentSelectionCountForConflictLevel(selected, level)
    const globalLevelTotal = Math.max(currentLevelTotal, globalCountForConflictLevel(level, globalItemCounts))
    if (globalLevelTotal > levelLimit) return `${globalLevelTotal} Level ${level} conflicts selected, ${levelLimit} available`
    if (currentLevelTotal > levelLimit) return `${currentLevelTotal} Level ${level} conflicts selected, ${levelLimit} available`
  }

  return undefined
}

export function AcquisitionsEditor({
  value = [],
  onChange,
  disabled,
  title = "Acquisitions",
  emptyText = "No tracked items added yet.",
  placeholder = "Search tracked item...",
  allowedItemTypes,
  enableVpControls = false,
  globalItemCounts,
  summaryCount,
  unlistedLabel = "unlisted",
  vpOnly = false,
  defaultVpOnAdd = false,
  enableStrengthControls = false,
  strengthOnly = false,
  defaultStrengthOnAdd = false,
  summaryMetric,
  effectiveVpCounts,
  itemBadges,
  vpCapMultiplier = 1,
  vpSummaryLabel,
  extraSummaryBadges = [],
}: AcquisitionsEditorProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const allowedTypeSet = useMemo(
    () => (allowedItemTypes && allowedItemTypes.length > 0 ? new Set(allowedItemTypes) : null),
    [allowedItemTypes],
  )

  const normalisedValue = value.map((item) => normaliseItem(item, vpCapMultiplier))
  const isEditableItem = (item: PlaythroughResultAcquisitionInput) => {
    if (allowedTypeSet && !allowedTypeSet.has(item.itemType)) return false
    if (!vpOnly && !strengthOnly) return true

    const option = getCatalogOption(item)
    const source = item.entrySource ?? item.entry_source

    if (vpOnly) {
      return Boolean(
        option &&
          isVpOption(option) &&
          (normaliseVpCount(item, option, vpCapMultiplier) > 0 ||
            effectiveVpCount(item, option, effectiveVpCounts, vpCapMultiplier) > 0),
      )
    }

    if (strengthOnly) {
      return Boolean(option && isStrengthOption(option) && (itemStrengthCount(item) > 0 || source === "strength_source"))
    }

    return true
  }
  const selected = normalisedValue.filter(isEditableItem)
  const preserved = normalisedValue.filter((item) => !isEditableItem(item))
  const selectedKeys = useMemo(() => new Set(selected.map((item) => item.itemKey)), [selected])
  const totalCopies = selected.reduce((total, item) => total + positiveCount(item.acquisitionCount), 0)
  const totalVp = sumItemVp(selected, effectiveVpCounts, vpCapMultiplier)
  const totalStrength = sumItemStrength(selected)
  const accountedCount = summaryMetric === "strength"
    ? totalStrength
    : summaryMetric === "vp"
      ? totalVp
      : strengthOnly
        ? totalStrength
        : vpOnly
          ? totalVp
          : totalCopies
  const manualSummaryCount = typeof summaryCount === "number" && Number.isFinite(summaryCount) ? Math.trunc(summaryCount) : undefined
  const sourceTotalUnknown = manualSummaryCount === undefined && accountedCount > 0 && (
    summaryMetric === "vp" ||
    summaryMetric === "strength" ||
    vpOnly ||
    strengthOnly
  )
  const unlistedCount = manualSummaryCount !== undefined ? Math.max(0, manualSummaryCount - accountedCount) : 0
  const overAccountedCount = manualSummaryCount !== undefined ? Math.max(0, accountedCount - manualSummaryCount) : 0
  const unlistedText = strengthOnly
    ? `${unlistedCount} STR not itemised`
    : vpOnly
      ? `${unlistedCount} VP not itemised`
      : `+${unlistedCount} ${unlistedLabel}`
  const overAccountedText = strengthOnly
    ? `${overAccountedCount} STR over`
    : vpOnly
      ? `${overAccountedCount} VP over`
      : `${overAccountedCount} over ${unlistedLabel}`
  const warnings = selected
    .map((item) => countLimitWarning(item, getCatalogOption(item), globalItemCounts, selected))
    .filter((warning): warning is string => Boolean(warning))

  const emitSectionChange = (nextSelected: PlaythroughResultAcquisitionInput[]) => {
    const normalisedSelected = nextSelected.map((item) => normaliseItem(item, vpCapMultiplier))

    if (!allowedTypeSet && !vpOnly && !strengthOnly) {
      onChange(normalisedSelected)
      return
    }

    const merged = new Map<string, PlaythroughResultAcquisitionInput>()
    for (const item of preserved) merged.set(item.itemKey, item)
    for (const item of normalisedSelected) merged.set(item.itemKey, item)
    onChange([...merged.values()].map((item) => normaliseItem(item, vpCapMultiplier)))
  }

  const options = useMemo(() => {
    const allowedOptions = DUNE_ACQUISITION_OPTIONS.filter((option) => {
      if (allowedTypeSet && !allowedTypeSet.has(option.itemType)) return false
      if (vpOnly && !isVpOption(option)) return false
      if (strengthOnly && !isStrengthOption(option)) return false
      return true
    })
    const searched = filterDuneAcquisitionOptions(query, allowedOptions)
    const sorted = [...searched].sort((left, right) => {
      const leftSelected = selectedKeys.has(left.itemKey) ? 1 : 0
      const rightSelected = selectedKeys.has(right.itemKey) ? 1 : 0
      if (leftSelected !== rightSelected) return leftSelected - rightSelected
      return 0
    })
    return sorted.slice(0, 12)
  }, [allowedTypeSet, query, vpOnly, strengthOnly, selectedKeys])

  const addItem = (option: DuneAcquisitionOption) => {
    if (disabled) return

    const existing = normalisedValue.find((item) => item.itemKey === option.itemKey)
    const existingIsSelected = selected.some((item) => item.itemKey === option.itemKey)

    const replaceExisting = (nextExisting: PlaythroughResultAcquisitionInput) => {
      emitSectionChange(existingIsSelected
        ? selected.map((item) => (item.itemKey === option.itemKey ? nextExisting : item))
        : [...selected, nextExisting]
      )
    }

    if (existing) {
      if (defaultVpOnAdd && isVpOption(option) && !isSpiceMustFlowItem(existing)) {
        const currentVp = normaliseVpCount(existing, option, vpCapMultiplier)
        const maxVp = maxVpForItem(existing, option, vpCapMultiplier)
        replaceExisting(normaliseItem({
          ...existing,
          vpCount: maxVp === undefined ? currentVp + 1 : Math.min(currentVp + 1, maxVp),
          itemStatus: existing.itemType === "intrigue_card" ? "played" : existing.itemStatus,
          entrySource: existing.entrySource ?? existing.entry_source ?? (vpOnly ? "vp_source" : "manual"),
        }, vpCapMultiplier))
      } else if (defaultStrengthOnAdd && isStrengthOption(option)) {
        const currentStrength = itemStrengthCount(existing)
        replaceExisting(normaliseItem({
          ...existing,
          strengthCount: currentStrength + 1,
          entrySource: existing.entrySource ?? existing.entry_source ?? (strengthOnly ? "strength_source" : "manual"),
        }, vpCapMultiplier))
      } else {
        const max = maxAllowedForCurrent(existing, option, globalItemCounts, selected)
        const nextCount = positiveCount(existing.acquisitionCount) + 1
        if (max !== undefined && nextCount > max) return

        replaceExisting({
          ...existing,
          acquisitionCount: nextCount,
          entrySource: "manual",
        })
      }
    } else {
      const max = maxAllowedForNew(option, globalItemCounts, selected)
      if (max !== undefined && max <= 0) return
      const nextItem = optionToInput(option)
      nextItem.entrySource = vpOnly ? "vp_source" : strengthOnly ? "strength_source" : "manual"
      if (defaultVpOnAdd && isVpOption(option) && !isSpiceMustFlowItem(nextItem)) {
        nextItem.vpCount = 1
        if (nextItem.itemType === "intrigue_card") nextItem.itemStatus = "played"
      }
      if (defaultStrengthOnAdd && isStrengthOption(option)) {
        nextItem.strengthCount = 1
      }
      emitSectionChange([...selected, nextItem])
    }

    setQuery("")
    setIsSearching(false)
    setIsExpanded(true)
  }

  const updateItem = (itemKey: string, patch: Partial<PlaythroughResultAcquisitionInput>) => {
    emitSectionChange(selected.map((item) => (item.itemKey === itemKey ? normaliseItem({ ...item, ...patch }, vpCapMultiplier) : item)))
  }

  const updateStatus = (itemKey: string, itemStatus: AcquisitionItemStatus) => {
    const item = selected.find((candidate) => candidate.itemKey === itemKey)
    if (!item) return

    const currentStatus = getItemStatus(item)
    const nextStatus: AcquisitionItemStatus =
      item.itemType === "contract" && currentStatus === itemStatus ? "not_set" : itemStatus
    const source = item.entrySource ?? item.entry_source ?? "manual"

    updateItem(itemKey, {
      itemStatus: nextStatus,
      vpCount: item.itemType === "intrigue_card" && nextStatus === "held" ? 0 : item.vpCount,
      entrySource: source,
      acquisitionMethod: undefined,
    })
  }

  const clearSection = () => {
    if (disabled || selected.length === 0) return

    if (vpOnly) {
      emitSectionChange(selected.map((item) => ({ ...item, vpCount: 0, entrySource: "manual" })))
      setQuery("")
      return
    }

    if (strengthOnly) {
      emitSectionChange(selected.map((item) => ({ ...item, strengthCount: 0, entrySource: "manual" })))
      setQuery("")
      return
    }

    emitSectionChange([])
    setQuery("")
  }

  const updateCount = (itemKey: string, delta: number) => {
    const item = selected.find((candidate) => candidate.itemKey === itemKey)
    if (!item) return

    const option = getCatalogOption(item)
    const max = maxAllowedForCurrent(item, option, globalItemCounts, selected)
    const nextCount = positiveCount(item.acquisitionCount) + delta
    if (nextCount <= 0) {
      emitSectionChange(selected.filter((candidate) => candidate.itemKey !== itemKey))
      return
    }

    if (max !== undefined && nextCount > max) return

    updateItem(itemKey, { acquisitionCount: nextCount, entrySource: "manual" })
  }

  const updateVpCount = (itemKey: string, delta: number) => {
    const item = selected.find((candidate) => candidate.itemKey === itemKey)
    if (!item) return

    const option = getCatalogOption(item)
    const current = normaliseVpCount(item, option, vpCapMultiplier)
    const max = maxVpForItem(item, option, vpCapMultiplier)
    const next = Math.max(0, current + delta)
    const bounded = max === undefined ? next : Math.min(next, max)

    updateItem(itemKey, {
      vpCount: bounded,
      itemStatus: item.itemType === "intrigue_card" && bounded > 0 ? "played" : item.itemStatus,
      entrySource: item.entrySource ?? item.entry_source ?? (vpOnly ? "vp_source" : "manual"),
    })
  }

  const updateStrengthCount = (itemKey: string, delta: number) => {
    const item = selected.find((candidate) => candidate.itemKey === itemKey)
    if (!item) return

    const option = getCatalogOption(item)
    const next = nextStrengthCount(item, option, delta)

    updateItem(itemKey, {
      strengthCount: next,
      entrySource: item.entrySource ?? item.entry_source ?? (strengthOnly ? "strength_source" : "manual"),
    })
  }

  const removeItem = (itemKey: string) => {
    const item = selected.find((candidate) => candidate.itemKey === itemKey)
    if (!item) return

    if (vpOnly) {
      emitSectionChange(selected.filter((candidate) => candidate.itemKey !== itemKey))
      return
    }

    if (strengthOnly) {
      if ((item.entrySource ?? item.entry_source) === "strength_source") {
        emitSectionChange(selected.filter((candidate) => candidate.itemKey !== itemKey))
      } else {
        emitSectionChange(selected.map((candidate) =>
          candidate.itemKey === itemKey ? { ...candidate, strengthCount: 0 } : candidate,
        ))
      }
      return
    }

    emitSectionChange(selected.filter((candidate) => candidate.itemKey !== itemKey))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h6>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{selected.length} selected · {totalCopies} copies</span>
            {totalVp > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                {vpSummaryLabel ? `${totalVp} ${vpSummaryLabel}` : `+${totalVp} VP`}
              </span>
            )}
            {extraSummaryBadges.map((badge) => (
              <span
                key={badge.label}
                className={badge.className ?? "rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600"}
              >
                {badge.label}
              </span>
            ))}
            {totalStrength > 0 && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                +{totalStrength} STR
              </span>
            )}
            {unlistedCount > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                {unlistedText}
              </span>
            )}
            {overAccountedCount > 0 && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">
                {overAccountedText}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && selected.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs text-slate-400 hover:text-slate-700"
              onClick={clearSection}
              disabled={disabled}
              title={`Reset ${title}`}
              aria-label={`Reset ${title}`}
            >
              ↺
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-slate-600"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? "Hide" : selected.length > 0 ? "Edit" : "Add"}
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warnings[0]}</span>
        </div>
      )}


      {!isExpanded && selected.length > 0 && (
        <div className="mt-3 rounded-lg border bg-slate-50/80 px-3 py-2 text-xs text-slate-500">
          {selectedSummary(selected)}
        </div>
      )}

      {isExpanded && (
        <div className="mt-3 grid gap-3">
          <div className="relative">
            <Label htmlFor={`acquisition-search-${title.replace(/\W+/g, "-").toLowerCase()}`} className="sr-only">
              Search {title.toLowerCase()}
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={`acquisition-search-${title.replace(/\W+/g, "-").toLowerCase()}`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setIsSearching(true)
              }}
              onFocus={() => setIsSearching(true)}
              onBlur={() => setTimeout(() => setIsSearching(false), 150)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-9 pl-9"
            />

            {isSearching && options.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border bg-white shadow-xl">
                {options.map((option) => {
                  const isSelected = selectedKeys.has(option.itemKey)
                  const existing = normalisedValue.find((item) => item.itemKey === option.itemKey)
                  const currentCount = existing ? positiveCount(existing.acquisitionCount) : 0
                  const maxSelectable = existing
                    ? maxAllowedForCurrent(existing, option, globalItemCounts, selected)
                    : maxAllowedForNew(option, globalItemCounts, selected)
                  const isSourceReactivation = Boolean(
                    existing &&
                      !isSelected &&
                      ((vpOnly && isVpOption(option)) || (strengthOnly && isStrengthOption(option)))
                  )
                  const isAtLimit = !isSourceReactivation && maxSelectable !== undefined && maxSelectable <= currentCount
                  const actionLabel = isAtLimit ? "Full" : isSourceReactivation ? "Use" : isSelected ? "+1" : "Add"
                  const limit = copyLimit(option)
                  const global = globalCountFor(option.itemKey, currentCount, globalItemCounts)
                  const level = conflictLevel(option)
                  const levelLimit = conflictLevelLimit(option)
                  const levelSelected = level !== undefined
                    ? Math.max(currentSelectionCountForConflictLevel(selected, level), globalCountForConflictLevel(level, globalItemCounts))
                    : 0

                  return (
                    <button
                      key={option.itemKey}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 border-b px-3 py-2.5 text-left transition last:border-b-0 hover:bg-amber-50/70 disabled:cursor-not-allowed disabled:opacity-50"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        addItem(option)
                      }}
                      disabled={disabled || isAtLimit}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {option.printedCost && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                              {option.printedCost.label}
                            </span>
                          )}
                          {option.vpAvailable && option.vpAvailable > 0 && (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              VP
                            </span>
                          )}
                          {isStrengthOption(option) && (
                            <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                              STR
                            </span>
                          )}
                          <span className="font-medium text-slate-950">{option.itemName}</span>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {[option.deckName ?? option.deckId, option.source, ...option.tags].filter(Boolean).join(" · ")}
                        </div>
                        {itemDetails(option) && (
                          <div className="mt-1 line-clamp-2 max-w-full break-words text-xs leading-relaxed text-slate-600">{itemDetails(option)}</div>
                        )}
                        {isAtLimit && limit !== undefined && (
                          <div className="mt-1 text-xs font-medium text-amber-700">{global}/{limit} available copies selected</div>
                        )}
                        {isAtLimit && limit === undefined && levelLimit !== undefined && level !== undefined && (
                          <div className="mt-1 text-xs font-medium text-amber-700">{levelSelected}/{levelLimit} Level {level} conflicts selected</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className={ITEM_TYPE_BADGE_CLASS[option.itemType]}>
                          {itemTypeLabel(option.itemType)}
                        </Badge>
                        <span className="text-xs font-medium text-amber-700">{actionLabel}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-slate-50/80 px-3 py-3 text-sm text-slate-500">
              {emptyText}
            </div>
          ) : (
            <div className="grid gap-2">
              {selected.map((item) => {
                const option = getCatalogOption(item)
                const count = positiveCount(item.acquisitionCount)
                const status = getItemStatus(item)
                const statusOptions = getStatusOptions(item)
                const canSetVp = enableVpControls && canTrackVp(item, option)
                const canSetStrength = enableStrengthControls && canTrackStrength(item, option)
                const vpCount = normaliseVpCount(item, option, vpCapMultiplier)
                const effectiveVp = effectiveVpCount(item, option, effectiveVpCounts, vpCapMultiplier)
                const hasUnsupportedVp = effectiveVp < vpCount
                const strengthCount = normaliseStrengthCount(item, option)
                const limitWarning = countLimitWarning(item, option, globalItemCounts, selected)
                const max = maxAllowedForCurrent(item, option, globalItemCounts, selected)
                const maxStrength = maxStrengthForItem(item, option)
                const strengthChoices = strengthChoicesForItem(item, option)
                const minStrength = strengthChoices?.[0] ?? 0
                const rowBadges = itemBadges?.[item.itemKey] ?? []

                return (
                  <div key={item.itemKey} className={`overflow-hidden rounded-xl border bg-white p-3 shadow-sm ${itemVpCount(item) > 0 ? "border-amber-300 bg-amber-50/30" : ""}`}>
                    <div className="grid gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {option?.printedCost && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                              {option.printedCost.label}
                            </span>
                          )}
                          <span className="font-medium text-slate-950">{item.itemName}</span>
                          <Badge variant="outline" className={ITEM_TYPE_BADGE_CLASS[item.itemType]}>
                            {itemTypeLabel(item.itemType)}
                          </Badge>
                          {option?.vpAvailable && option.vpAvailable > 0 && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              VP
                            </Badge>
                          )}
                          {canSetStrength && (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                              STR
                            </Badge>
                          )}
                          {(item.entrySource ?? item.entry_source) === "auto" && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                              Auto
                            </Badge>
                          )}
                          {rowBadges.map((badge) => (
                            <Badge key={badge} variant="outline" className={itemBadgeClass(badge)}>
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{itemSubtitle(item, option)}</div>
                        {itemDetails(option) && (
                          <div className="mt-2 line-clamp-3 max-w-full break-words whitespace-pre-line rounded-lg border bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
                            {itemDetails(option)}
                          </div>
                        )}
                        {hasUnsupportedVp && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {vpCount - effectiveVp} VP not supported by available face-up Conflict cards.
                          </div>
                        )}
                        {limitWarning && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {limitWarning}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          {status === "not_set" && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
                              Set status
                            </span>
                          )}
                          <div className="inline-flex h-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                            {statusOptions.map((optionStatus) => {
                              const isActive = optionStatus === status
                              return (
                                <button
                                  key={optionStatus}
                                  type="button"
                                  className={`border-r border-slate-200 px-2.5 text-xs font-medium transition last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isActive
                                      ? STATUS_BADGE_CLASS[optionStatus]
                                      : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                  onClick={() => updateStatus(item.itemKey, optionStatus)}
                                  disabled={disabled || (statusOptions.length === 1 && item.itemType !== "contract")}
                                  aria-pressed={isActive}
                                >
                                  {STATUS_LABELS[optionStatus]}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {canSetVp && (
                          <div className="inline-flex h-8 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50 shadow-sm">
                            <span className="flex items-center border-r border-amber-200 px-2 text-xs font-semibold text-amber-700">
                              VP
                            </span>
                            <button
                              type="button"
                              className="flex w-8 items-center justify-center border-r border-amber-200 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => updateVpCount(item.itemKey, -1)}
                              disabled={disabled || vpCount <= 0}
                              aria-label={`Decrease VP from ${item.itemName}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex min-w-8 items-center justify-center px-2 text-sm font-semibold tabular-nums text-amber-800">
                              {vpCount}
                            </div>
                            <button
                              type="button"
                              className="flex w-8 items-center justify-center border-l border-amber-200 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => updateVpCount(item.itemKey, 1)}
                              disabled={disabled || (maxVpForItem(item, option, vpCapMultiplier) !== undefined && vpCount >= maxVpForItem(item, option, vpCapMultiplier)!)}
                              aria-label={`Increase VP from ${item.itemName}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {canSetStrength && (
                          <div className="inline-flex h-8 overflow-hidden rounded-lg border border-rose-200 bg-rose-50/50 shadow-sm">
                            <span className="flex items-center border-r border-rose-200 px-2 text-xs font-semibold text-rose-700">
                              STR
                            </span>
                            <button
                              type="button"
                              className="flex w-8 items-center justify-center border-r border-rose-200 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => updateStrengthCount(item.itemKey, -1)}
                              disabled={disabled || strengthCount <= minStrength}
                              aria-label={`Decrease strength from ${item.itemName}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex min-w-10 items-center justify-center px-2 text-sm font-semibold tabular-nums text-rose-800">
                              {strengthCount}
                            </div>
                            <button
                              type="button"
                              className="flex w-8 items-center justify-center border-l border-rose-200 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => updateStrengthCount(item.itemKey, 1)}
                              disabled={disabled || (maxStrength !== undefined && strengthCount >= maxStrength)}
                              aria-label={`Increase strength from ${item.itemName}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="inline-flex h-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                          <button
                            type="button"
                            className="flex w-8 items-center justify-center border-r border-slate-200 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => updateCount(item.itemKey, -1)}
                            disabled={disabled}
                            aria-label={`Decrease ${item.itemName}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex min-w-10 items-center justify-center px-2 text-sm font-semibold tabular-nums">
                            x{count}
                          </div>
                          <button
                            type="button"
                            className="flex w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => updateCount(item.itemKey, 1)}
                            disabled={disabled || (max !== undefined && count >= max)}
                            aria-label={`Increase ${item.itemName}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                          onClick={() => removeItem(item.itemKey)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
