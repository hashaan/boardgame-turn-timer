#!/usr/bin/env node

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const helperSource = readFileSync(join(repoRoot, "lib/playthrough-result-items.ts"), "utf8")
const typeSource = readFileSync(join(repoRoot, "types/dune-acquisitions.ts"), "utf8")
const migrationSource = readFileSync(join(repoRoot, "scripts/021-rename-acquisitions-to-items.sql"), "utf8")
const createRouteSource = readFileSync(join(repoRoot, "app/api/games/[gameId]/playthroughs/route.ts"), "utf8")
const updateRouteSource = readFileSync(join(repoRoot, "app/api/games/[gameId]/playthroughs/[playthroughId]/route.ts"), "utf8")

assert.match(migrationSource, /ALTER TABLE public\.playthrough_result_acquisitions RENAME TO playthrough_result_items/, "migration should rename the old acquisition table to the generic tracked-item table")
assert.match(migrationSource, /CREATE OR REPLACE VIEW public\.playthrough_result_item_summary/, "migration should create the new item summary view")
assert.match(migrationSource, /CREATE OR REPLACE VIEW public\.playthrough_result_acquisition_summary/, "migration should keep the old summary view as a compatibility alias")
assert.match(migrationSource, /'starter_card'::text/, "migration should preserve starter_card support")
assert.match(migrationSource, /uq_playthrough_result_items_result_item/, "migration should rename the uniqueness constraint around result + item")

assert.match(helperSource, /FROM playthrough_result_items/, "backend reads should use playthrough_result_items")
assert.match(helperSource, /INSERT INTO playthrough_result_items/, "backend writes should use playthrough_result_items")
assert.match(helperSource, /DELETE FROM playthrough_result_items/, "backend deletes should use playthrough_result_items")
assert.doesNotMatch(helperSource, /FROM playthrough_result_acquisitions|INSERT INTO playthrough_result_acquisitions|DELETE FROM playthrough_result_acquisitions/, "backend should not query the old table name")
assert.match(helperSource, /trackedItems: items/, "hydrated results should expose trackedItems")
assert.match(helperSource, /acquisitions: items/, "hydrated results should preserve acquisitions as a compatibility alias")
assert.match(helperSource, /getSubmittedTrackedItems/, "helper should expose tracked-item submission naming")
assert.match(helperSource, /getSubmittedAcquisitions\(source: Row\)/, "helper should preserve acquisition submission alias for compatibility")

assert.match(typeSource, /PlaythroughResultTrackedItemInput = PlaythroughResultAcquisitionInput/, "types should expose tracked-item aliases without breaking existing acquisition form state")
assert.match(typeSource, /TRACKED_ITEM_TYPES = ACQUISITION_ITEM_TYPES/, "types should expose tracked item constants")

for (const [name, source] of [["create route", createRouteSource], ["update route", updateRouteSource]]) {
  assert.match(source, /getSubmittedTrackedItems/, `${name}: route should use tracked item helper naming`)
}

assert.match(
  createRouteSource,
  /replacePlaythroughResultItems/,
  "create route: route should write through tracked item helper naming",
)

assert(
  /replacePlaythroughResultItems/.test(updateRouteSource) ||
    /insert_results_and_items/.test(updateRouteSource) ||
    /submittedTrackedItemsByPlayerName/.test(updateRouteSource),
  "update route: route should write tracked items through the recognised helper or batched write path",
)
assert.match(createRouteSource, /attachTrackedItemsToPlaythrough/, "create/list route should hydrate tracked items using the generic helper")
assert.match(updateRouteSource, /playthroughResultItems: trackedItems/, "update route should expose playthroughResultItems in responses")

console.log("✓ Dune schema migration checks passed")
