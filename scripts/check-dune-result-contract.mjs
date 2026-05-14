#!/usr/bin/env node

import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(path, "utf8")
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`)
    process.exit(1)
  }
}

const contract = read("lib/dune/result-fields.ts")
const createRoute = read("app/api/games/[gameId]/playthroughs/route.ts")
const updateRoute = read("app/api/games/[gameId]/playthroughs/[playthroughId]/route.ts")
const checkAll = read("scripts/check-dune-all.mjs")

const requiredExports = [
  "DUNE_RESULT_FIELD_ALIASES",
  "DUNE_RESULT_DB_COLUMNS",
  "getDuneResultFields",
  "deriveDuneServerResultFields",
  "finaliseDuneServerResultFieldsForLeader",
  "normaliseHasHighCouncil",
  "normaliseHighCouncilSeatPosition",
]

for (const name of requiredExports) {
  assert(contract.includes(name), `result contract exports ${name}`)
}

const requiredFields = [
  "score",
  "turnOrderPosition",
  "vpSourcesSpiceMustFlow",
  "vp_sources_spice_must_flow",
  "finalConflictStrengthSourcesUnaccounted",
  "final_conflict_strength_sources_unaccounted",
  "highCouncilSeatPosition",
  "high_council_seat_position",
  "hasMakerHooks",
  "has_maker_hooks",
]

for (const name of requiredFields) {
  assert(contract.includes(name), `result contract includes ${name}`)
}

for (const [label, route] of [
  ["create route", createRoute],
  ["update route", updateRoute],
]) {
  assert(route.includes('from "@/lib/dune/result-fields"'), `${label} imports the Dune result contract`)
  assert(route.includes("getDuneResultFields("), `${label} parses submitted results through the contract`)
  assert(route.includes("deriveDuneServerResultFields("), `${label} derives result fields through the contract`)
  assert(
    route.includes("finaliseDuneServerResultFieldsForLeader("),
    `${label} finalises leader-specific fields through the contract`,
  )
  assert(!/function get(Result|DuneResult)Fields\b/.test(route), `${label} no longer owns its own result parser`)
  assert(!/function derive(Server|DuneServer)ResultFields\b/.test(route), `${label} no longer owns its own server derivation helper`)
}

assert(checkAll.includes("scripts/check-dune-result-contract.mjs"), "check-dune-all runs the result contract check")
assert(!contract.includes("result-normalize"), "new result contract avoids US spelling in filenames")

console.log("✓ Dune result contract checks passed")
