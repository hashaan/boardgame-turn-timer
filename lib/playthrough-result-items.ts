import { sql } from "@/lib/db"
import { normaliseAcquisitionInput } from "@/lib/dune-acquisition-inventory"
import type {
  PlaythroughResultAcquisition,
  PlaythroughResultAcquisitionInput,
  PlaythroughResultTrackedItem,
  PlaythroughResultTrackedItemInput,
} from "@/types/dune-acquisitions"

type Row = Record<string, any>

type PlaythroughWithResults = Row & {
  id?: string | null
  results?: Row[] | string | null
}

function firstDefined<T = unknown>(source: Row, keys: string[]): T | undefined {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key] as T
  }

  return undefined
}

function resultIdFor(result: Row): string | null {
  const raw = firstDefined(result, ["resultId", "id", "playthroughResultId", "playthrough_result_id"])
  return typeof raw === "string" && raw.length > 0 ? raw : null
}

function parseResults(results: PlaythroughWithResults["results"]): Row[] {
  if (Array.isArray(results)) return results
  if (typeof results !== "string") return []

  try {
    const parsed = JSON.parse(results)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getSubmittedTrackedItems(source: Row): PlaythroughResultTrackedItemInput[] {
  const raw = firstDefined(source, [
    "trackedItems",
    "playthroughResultItems",
    "playthrough_result_items",
    "items",
    "acquisitions",
    "playthroughResultAcquisitions",
    "playthrough_result_acquisitions",
    "cardAcquisitions",
    "card_acquisitions",
  ])

  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => (item && typeof item === "object" ? normaliseAcquisitionInput(item as Row) : null))
    .filter((item): item is PlaythroughResultTrackedItemInput => item !== null)
}

export function getSubmittedAcquisitions(source: Row): PlaythroughResultAcquisitionInput[] {
  return getSubmittedTrackedItems(source)
}

export function mapTrackedItemRow(row: Row): PlaythroughResultTrackedItem {
  return {
    id: row.id,

    playthroughId: row.playthrough_id,
    playthrough_id: row.playthrough_id,

    playthroughResultId: row.playthrough_result_id,
    playthrough_result_id: row.playthrough_result_id,

    playerId: row.player_id,
    player_id: row.player_id,

    itemKey: row.item_key,
    item_key: row.item_key,

    itemName: row.item_name,
    item_name: row.item_name,

    itemType: row.item_type,
    item_type: row.item_type,

    deckId: row.deck_id,
    deck_id: row.deck_id,

    source: row.source,

    acquisitionCount: Number(row.acquisition_count ?? 1),
    acquisition_count: Number(row.acquisition_count ?? 1),

    itemStatus: row.item_status,
    item_status: row.item_status,

    vpCount: Number(row.vp_count ?? 0),
    vp_count: Number(row.vp_count ?? 0),

    strengthCount: Number(row.strength_count ?? 0),
    strength_count: Number(row.strength_count ?? 0),

    entrySource: row.entry_source,
    entry_source: row.entry_source,

    acquisitionMethod: row.acquisition_method,
    acquisition_method: row.acquisition_method,

    notes: row.notes,

    createdAt: row.created_at,
    created_at: row.created_at,
  }
}

export function mapAcquisitionRow(row: Row): PlaythroughResultAcquisition {
  return mapTrackedItemRow(row)
}

export async function replacePlaythroughResultItems(args: {
  playthroughId: string
  playthroughResultId: string
  playerId?: string | null
  items?: PlaythroughResultTrackedItemInput[]
  acquisitions?: PlaythroughResultAcquisitionInput[]
}): Promise<void> {
  const { playthroughId, playthroughResultId, playerId } = args
  const items = args.items ?? args.acquisitions ?? []

  const normalisedItems = items
    .map((item) => normaliseAcquisitionInput(item as unknown as Row))
    .filter((item): item is PlaythroughResultTrackedItemInput => item !== null)

  await sql`
    DELETE FROM playthrough_result_items
    WHERE playthrough_result_id = ${playthroughResultId}
  `

  if (normalisedItems.length === 0) return

  const payload = JSON.stringify(
    normalisedItems.map((item) => ({
      playthrough_id: playthroughId,
      playthrough_result_id: playthroughResultId,
      player_id: playerId ?? null,
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

  await sql`
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
      item.playthrough_id::uuid,
      item.playthrough_result_id::uuid,
      NULLIF(item.player_id, '')::uuid,
      item.item_key,
      item.item_name,
      item.item_type,
      item.deck_id,
      item.source,
      item.acquisition_count,
      item.item_status,
      item.vp_count,
      item.strength_count,
      item.entry_source,
      item.acquisition_method,
      item.notes
    FROM jsonb_to_recordset(${payload}::jsonb) AS item(
      playthrough_id text,
      playthrough_result_id text,
      player_id text,
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
  `
}

export async function replacePlaythroughResultAcquisitions(args: {
  playthroughId: string
  playthroughResultId: string
  playerId?: string | null
  acquisitions: PlaythroughResultAcquisitionInput[]
}): Promise<void> {
  return replacePlaythroughResultItems({
    playthroughId: args.playthroughId,
    playthroughResultId: args.playthroughResultId,
    playerId: args.playerId,
    items: args.acquisitions,
  })
}

export async function replacePlaythroughResultItemsForResults(args: {
  playthroughId: string
  results: Array<{
    playthroughResultId: string
    playerId?: string | null
    items?: PlaythroughResultTrackedItemInput[]
    acquisitions?: PlaythroughResultAcquisitionInput[]
  }>
}): Promise<void> {
  const rows = args.results.flatMap((result) => {
    const items = result.items ?? result.acquisitions ?? []

    return items
      .map((item) => normaliseAcquisitionInput(item as unknown as Row))
      .filter((item): item is PlaythroughResultTrackedItemInput => item !== null)
      .map((item) => ({
        playthrough_id: args.playthroughId,
        playthrough_result_id: result.playthroughResultId,
        player_id: result.playerId ?? null,
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
      }))
  })

  if (rows.length === 0) return

  const payload = JSON.stringify(rows)

  await sql`
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
      item.playthrough_id::uuid,
      item.playthrough_result_id::uuid,
      NULLIF(item.player_id, '')::uuid,
      item.item_key,
      item.item_name,
      item.item_type,
      item.deck_id,
      item.source,
      item.acquisition_count,
      item.item_status,
      item.vp_count,
      item.strength_count,
      item.entry_source,
      item.acquisition_method,
      item.notes
    FROM jsonb_to_recordset(${payload}::jsonb) AS item(
      playthrough_id text,
      playthrough_result_id text,
      player_id text,
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
  `
}

export async function fetchPlaythroughResultItemsByPlaythroughId(
  playthroughId: string,
): Promise<Map<string, PlaythroughResultTrackedItem[]>> {
  const rows = await sql`
    SELECT *
    FROM playthrough_result_items
    WHERE playthrough_id = ${playthroughId}
    ORDER BY deck_id, item_name, item_key
  `

  const byResultId = new Map<string, PlaythroughResultTrackedItem[]>()

  for (const row of rows) {
    const item = mapTrackedItemRow(row)
    const resultId = item.playthroughResultId
    if (!resultId) continue

    const existing = byResultId.get(resultId) ?? []
    existing.push(item)
    byResultId.set(resultId, existing)
  }

  return byResultId
}

export async function fetchPlaythroughResultAcquisitionsByPlaythroughId(
  playthroughId: string,
): Promise<Map<string, PlaythroughResultAcquisition[]>> {
  return fetchPlaythroughResultItemsByPlaythroughId(playthroughId)
}

function attachTrackedItemsFromMap<T extends PlaythroughWithResults>(
  playthrough: T,
  byResultId: Map<string, PlaythroughResultTrackedItem[]>,
): T {
  const results = parseResults(playthrough.results)

  return {
    ...playthrough,
    results: results.map((result) => {
      const resultId = resultIdFor(result)
      const items = resultId ? byResultId.get(resultId) ?? [] : []

      return {
        ...result,
        trackedItems: items,
        playthroughResultItems: items,
        playthrough_result_items: items,
        acquisitions: items,
        playthroughResultAcquisitions: items,
        playthrough_result_acquisitions: items,
      }
    }),
  }
}

export const insertPlaythroughResultItemsForResults = replacePlaythroughResultItemsForResults

export async function attachTrackedItemsToPlaythrough<T extends PlaythroughWithResults>(playthrough: T | null): Promise<T | null> {
  if (!playthrough?.id) return playthrough

  const byResultId = await fetchPlaythroughResultItemsByPlaythroughId(playthrough.id)
  return attachTrackedItemsFromMap(playthrough, byResultId)
}

export async function attachAcquisitionsToPlaythrough<T extends PlaythroughWithResults>(playthrough: T | null): Promise<T | null> {
  return attachTrackedItemsToPlaythrough(playthrough)
}

export async function fetchPlaythroughResultItemsByPlaythroughIds(
  playthroughIds: string[],
): Promise<Map<string, Map<string, PlaythroughResultTrackedItem[]>>> {
  const uniquePlaythroughIds = [...new Set(playthroughIds.filter(Boolean))]
  const byPlaythroughId = new Map<string, Map<string, PlaythroughResultTrackedItem[]>>()

  if (uniquePlaythroughIds.length === 0) return byPlaythroughId

  const rows = await sql`
    SELECT *
    FROM playthrough_result_items
    WHERE playthrough_id = ANY(${uniquePlaythroughIds}::uuid[])
    ORDER BY playthrough_id, deck_id, item_name, item_key
  `

  for (const row of rows) {
    const item = mapTrackedItemRow(row)
    const playthroughId = item.playthroughId
    const resultId = item.playthroughResultId
    if (!playthroughId || !resultId) continue

    const byResultId = byPlaythroughId.get(playthroughId) ?? new Map<string, PlaythroughResultTrackedItem[]>()
    const resultItems = byResultId.get(resultId) ?? []
    resultItems.push(item)
    byResultId.set(resultId, resultItems)
    byPlaythroughId.set(playthroughId, byResultId)
  }

  return byPlaythroughId
}
export async function attachTrackedItemsToPlaythroughs<T extends PlaythroughWithResults>(playthroughs: T[]): Promise<T[]> {
  const byPlaythroughId = await fetchPlaythroughResultItemsByPlaythroughIds(
    playthroughs
      .map((playthrough) => playthrough.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )

  return playthroughs.map((playthrough) =>
    attachTrackedItemsFromMap(playthrough, byPlaythroughId.get(playthrough.id ?? "") ?? new Map()),
  )
}

export async function attachAcquisitionsToPlaythroughs<T extends PlaythroughWithResults>(playthroughs: T[]): Promise<T[]> {
  return attachTrackedItemsToPlaythroughs(playthroughs)
}
