import inventoryJson from "@/data/dune_inventory.json"
import {
  ACQUISITION_ITEM_STATUSES,
  ACQUISITION_ITEM_TYPES,
  DUNE_ACQUISITION_DECK_IDS,
  type AcquisitionItemStatus,
  type AcquisitionItemType,
  type AcquisitionPrintedCost,
  type BattleIcon,
  type DuneAcquisitionDeckId,
  type DuneAcquisitionOption,
  type PlaythroughResultAcquisitionInput,
} from "@/types/dune-acquisitions"

type InventoryItem = Record<string, unknown> & {
  DeckId?: string
  DeckName?: string
  Name?: string
  Source?: string
  Compatibility?: string
  Cost?: Record<string, unknown>
  Tags?: Record<string, unknown>
  Affiliation?: Record<string, unknown>
  Effect?: unknown
  Effects?: Record<string, unknown>
  Reward?: unknown
  Rewards?: Record<string, unknown>
  AgentAbility?: unknown
  PassiveAbility?: unknown
  Reveal?: Record<string, unknown>
  AcquisitionBonus?: unknown
  LeaderAbility?: unknown
  SignetRingAbility?: unknown
  VPsAvailable?: unknown
  BattleIcon?: unknown
  Level?: unknown
  Count?: unknown
  CountPerPlayer?: unknown
}

type Inventory = {
  decks?: Partial<Record<string, InventoryItem[]>>
}

const inventory = inventoryJson as Inventory

const ITEM_TYPE_BY_DECK_ID: Record<DuneAcquisitionDeckId, AcquisitionItemType> = {
  Imperium: "imperium_card",
  Reserve: "reserve_card",
  Intrigue: "intrigue_card",
  Tech: "tech_tile",
  Sardaukar: "sardaukar_skill",
  Contracts: "contract",
  Conflict: "conflict_card",
  Navigation: "navigation_card",
  Starter: "starter_card",
}

const COST_RESOURCE_SHORT_LABELS: Record<string, string> = {
  Persuasion: "P",
  Spice: "S",
  Solari: "$",
  Water: "W",
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text.length > 0) return text
  }

  return null
}

function positiveInteger(value: unknown, fallback = 1): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback

  const integer = Math.trunc(number)
  return integer > 0 ? integer : fallback
}

function firstValidAcquisitionStatus(...values: unknown[]): AcquisitionItemStatus | null {
  const text = firstText(...values)
  if (!text) return null

  return ACQUISITION_ITEM_STATUSES.includes(text as AcquisitionItemStatus) ? (text as AcquisitionItemStatus) : null
}

function firstValidEntrySource(...values: unknown[]): PlaythroughResultAcquisitionInput["entrySource"] | null {
  const text = firstText(...values)
  if (
    text === "manual" ||
    text === "auto" ||
    text === "vp_source" ||
    text === "strength_source"
  ) {
    return text
  }

  return null
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`
}

function smallHash(value: string): string {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function itemFingerprint(item: InventoryItem): string {
  return smallHash(
    stableStringify({
      cost: item.Cost ?? null,
      effect: item.Effect ?? null,
      effects: item.Effects ?? null,
      reward: item.Reward ?? null,
      rewards: item.Rewards ?? null,
      acquisitionBonus: item.AcquisitionBonus ?? null,
      tags: item.Tags ?? null,
      affiliation: item.Affiliation ?? null,
      vpsAvailable: item.VPsAvailable ?? null,
      battleIcon: item.BattleIcon ?? null,
      level: item.Level ?? null,
    }),
  )
}

function makeItemKey(deckId: string, source: string | null, name: string, fingerprint: string): string {
  return [slugify(deckId), slugify(source ?? "unknown"), slugify(name), fingerprint].join("|")
}

function isDuneAcquisitionDeckId(value: string): value is DuneAcquisitionDeckId {
  return (DUNE_ACQUISITION_DECK_IDS as readonly string[]).includes(value)
}

function isAcquisitionItemType(value: string): value is AcquisitionItemType {
  return (ACQUISITION_ITEM_TYPES as readonly string[]).includes(value)
}

function getTags(item: InventoryItem): string[] {
  const tags = new Set<string>()

  for (const [key, value] of Object.entries(item.Tags ?? {})) {
    if (value === true) tags.add(key)
  }

  for (const [key, value] of Object.entries(item.Affiliation ?? {})) {
    if (value === true) tags.add(key)
  }

  if (item.Twisted === true) tags.add("Twisted")
  if (typeof item.BattleIcon === "string" && item.BattleIcon.trim()) tags.add(`${item.BattleIcon.trim()} icon`)
  if (typeof item.VPsAvailable === "number" && item.VPsAvailable > 0) tags.add("VP")

  return [...tags]
}

function getPrintedCost(item: InventoryItem): AcquisitionPrintedCost | null {
  const entries = Object.entries(item.Cost ?? {})
  if (entries.length === 0) return null

  const [resource, rawAmount] = entries[0]
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount)) return null

  const labelSuffix = COST_RESOURCE_SHORT_LABELS[resource] ?? resource

  return {
    resource: ["Persuasion", "Spice", "Solari", "Water"].includes(resource)
      ? (resource as AcquisitionPrintedCost["resource"])
      : "Other",
    amount,
    label: `${amount}${labelSuffix}`,
  }
}

function valueToText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return firstText(value)
  }

  if (Array.isArray(value)) {
    const parts = value.map(valueToText).filter(Boolean)
    return parts.length > 0 ? parts.join("; ") : null
  }

  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const text = valueToText(entryValue)
        return text ? `${key}: ${text}` : null
      })
      .filter(Boolean)
    return parts.length > 0 ? parts.join("; ") : null
  }

  return null
}

function getEffectText(deckId: DuneAcquisitionDeckId, item: InventoryItem): string | undefined {
  const parts: string[] = []

  const add = (label: string, value: unknown) => {
    const text = valueToText(value)
    if (text) parts.push(`${label}: ${text}`)
  }

  if (deckId === "Contracts") {
    add("Reward", item.Reward)
  } else if (deckId === "Conflict") {
    add("Rewards", item.Rewards)
  } else if (deckId === "Intrigue") {
    add("Effects", item.Effects)
  } else if (deckId === "Tech") {
    add("Acquire", item.AcquisitionBonus)
    add("Effect", item.Effect)
  } else if (deckId === "Sardaukar" || deckId === "Navigation") {
    add("Effect", item.Effect)
  } else if (deckId === "Starter") {
    add("Agent", item.AgentAbility)
    add("Reveal", item.Reveal)
  } else {
    add("Acquire", item.AcquisitionBonus)
    add("Passive", item.PassiveAbility)
    add("Agent", item.AgentAbility)
    add("Reveal", item.Reveal)
  }

  return parts.length > 0 ? parts.join(" · ") : undefined
}


function containsVictoryPointText(...values: unknown[]): boolean {
  return values.some((value) => /victory\s*point|\bvp\b/i.test(valueToText(value) ?? ""))
}

function getCopyCount(deckId: DuneAcquisitionDeckId, item: InventoryItem): number | null {
  const raw = item.Count ?? item.CountPerPlayer
  const count = Number(raw)
  if (Number.isFinite(count) && count > 0) return Math.trunc(count)

  // Most catalogue entries without an explicit Count are single physical items.
  // In particular, Conflict cards and Tech tiles must not be repeat-selectable
  // just because the inventory omits Count. Reserve and multi-copy decks still
  // use their explicit Count values when provided.
  return 1
}

function getCopyScope(item: InventoryItem): DuneAcquisitionOption["copyScope"] {
  return item.CountPerPlayer !== undefined && item.Count === undefined ? "per_player" : "global"
}

function getConflictLevel(deckId: DuneAcquisitionDeckId, item: InventoryItem): number | null {
  if (deckId !== "Conflict") return null

  const level = Number(item.Level)
  if (!Number.isFinite(level) || level <= 0) return null
  return Math.trunc(level)
}

function getBattleIcon(item: InventoryItem): BattleIcon | null {
  const raw = firstText(item.BattleIcon)
  if (!raw) return null

  const normalised = raw.toLowerCase().replace(/[\s_-]+/g, " ").trim()
  if (normalised === "crysknife") return "Crysknife"
  if (normalised === "desert mouse") return "Desert Mouse"
  if (normalised === "ornithopter") return "Ornithopter"
  if (normalised === "wild" || normalised === "?") return "Wild"
  return null
}

function getVpAvailable(deckId: DuneAcquisitionDeckId, item: InventoryItem, effectText?: string): number | undefined {
  const explicit = Number(item.VPsAvailable)
  if (Number.isFinite(explicit) && explicit > 0) return Math.trunc(explicit)

  const mentionsVp = containsVictoryPointText(
    effectText,
    item.AcquisitionBonus,
    item.AgentAbility,
    item.PassiveAbility,
    item.Reveal,
    item.Effect,
    item.Effects,
  )

  if (!mentionsVp) return undefined

  // The catalogue only includes Uprising/Bloodlines here. These entries all score
  // at least one VP when their condition is met; repeat scoring is left to
  // the per-row VP stepper in the form.
  if (deckId === "Imperium" || deckId === "Reserve" || deckId === "Intrigue" || deckId === "Tech" || deckId === "Navigation") {
    return 1
  }

  return undefined
}

function normaliseInventoryItem(deckId: DuneAcquisitionDeckId, item: InventoryItem): DuneAcquisitionOption | null {
  const name = firstText(item.Name)
  if (!name) return null

  const source = firstText(item.Source)
  const deckName = firstText(item.DeckName)
  const compatibility = firstText(item.Compatibility)
  const tags = getTags(item)
  const itemType = ITEM_TYPE_BY_DECK_ID[deckId]
  const itemKey = makeItemKey(deckId, source, name, itemFingerprint(item))
  const printedCost = getPrintedCost(item)
  const effectText = getEffectText(deckId, item)
  const vpAvailable = getVpAvailable(deckId, item, effectText)
  const copyCount = getCopyCount(deckId, item)
  const copyScope = getCopyScope(item)
  const battleIcon = getBattleIcon(item)
  const conflictLevel = getConflictLevel(deckId, item)

  const searchText = [
    name,
    effectText,
    deckId,
    deckName,
    source,
    compatibility,
    itemType,
    printedCost?.label,
    vpAvailable ? `${vpAvailable} VP` : undefined,
    copyCount ? `${copyCount} copies` : undefined,
    conflictLevel ? `level ${conflictLevel} conflict` : undefined,
    battleIcon ? `${battleIcon} battle icon` : undefined,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return {
    itemKey,
    itemName: name,
    itemType,
    deckId,
    deckName: deckName ?? undefined,
    source,
    compatibility,
    printedCost,
    tags,
    effectText,
    description: effectText,
    vpAvailable,
    copyCount,
    copyScope,
    conflictLevel,
    battleIcon,
    searchText,
  }
}

export const DUNE_ACQUISITION_OPTIONS: DuneAcquisitionOption[] = DUNE_ACQUISITION_DECK_IDS.flatMap(
  (deckId) => {
    const items = inventory.decks?.[deckId] ?? []
    return items
      .map((item) => normaliseInventoryItem(deckId, item))
      .filter((item): item is DuneAcquisitionOption => item !== null)
  },
)

export const DUNE_ACQUISITION_OPTIONS_BY_KEY = new Map(
  DUNE_ACQUISITION_OPTIONS.map((item) => [item.itemKey, item] as const),
)

export function getDuneAcquisitionOption(itemKey: string): DuneAcquisitionOption | null {
  return DUNE_ACQUISITION_OPTIONS_BY_KEY.get(itemKey) ?? null
}

export function getDuneAcquisitionOptionsByDeck(deckId?: DuneAcquisitionDeckId): DuneAcquisitionOption[] {
  if (!deckId) return DUNE_ACQUISITION_OPTIONS
  return DUNE_ACQUISITION_OPTIONS.filter((item) => item.deckId === deckId)
}

export function filterDuneAcquisitionOptions(query: string, options = DUNE_ACQUISITION_OPTIONS): DuneAcquisitionOption[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return options

  return options.filter((item) => terms.every((term) => item.searchText.includes(term)))
}

export function makeManualAcquisitionKey(deckId: string, source: string | null, itemName: string): string {
  return makeItemKey(deckId, source, itemName, "manual")
}

export function normaliseAcquisitionInput(input: Record<string, unknown>): PlaythroughResultAcquisitionInput | null {
  const rawItemKey = firstText(input.itemKey, input.item_key, input.cardKey, input.card_key, input.key)
  const catalogItem = rawItemKey ? getDuneAcquisitionOption(rawItemKey) : null

  const itemName = catalogItem?.itemName ?? firstText(input.itemName, input.item_name, input.cardName, input.card_name, input.name)
  if (!itemName) return null

  const deckId = catalogItem?.deckId ?? firstText(input.deckId, input.deck_id, input.DeckId) ?? "Imperium"
  const source = catalogItem?.source ?? firstText(input.source, input.Source)

  const rawItemType = firstText(input.itemType, input.item_type)
  const itemType = catalogItem?.itemType ?? (rawItemType && isAcquisitionItemType(rawItemType) ? rawItemType : null)

  const resolvedDeckId = isDuneAcquisitionDeckId(deckId) ? deckId : "Imperium"
  const resolvedItemType = itemType ?? ITEM_TYPE_BY_DECK_ID[resolvedDeckId]

  const itemKey = rawItemKey ?? makeManualAcquisitionKey(deckId, source, itemName)

  return {
    itemKey,
    itemName,
    itemType: resolvedItemType,
    deckId: resolvedDeckId,
    source,
    acquisitionCount: positiveInteger(
      firstText(input.acquisitionCount, input.acquisition_count, input.count, input.acquisition_count),
    ),
    itemStatus: firstValidAcquisitionStatus(input.itemStatus, input.item_status) ?? "not_set",
    vpCount: positiveInteger(firstText(input.vpCount, input.vp_count), 0),
    strengthCount: positiveInteger(firstText(input.strengthCount, input.strength_count), 0),
    entrySource: firstValidEntrySource(input.entrySource, input.entry_source),
    acquisitionMethod: firstText(input.acquisitionMethod, input.acquisition_method, input.acquiredBy, input.acquired_by),
    notes: firstText(input.notes),
  }
}
