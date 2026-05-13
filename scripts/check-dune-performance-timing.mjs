#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const routePath = path.join(
  process.cwd(),
  "app/api/games/[gameId]/playthroughs/[playthroughId]/route.ts",
)

const allCheckPath = path.join(process.cwd(), "scripts/check-dune-all.mjs")

const failures = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${path.relative(process.cwd(), filePath)}`)
    return ""
  }

  return fs.readFileSync(filePath, "utf8")
}

const route = read(routePath)
const allCheck = read(allCheckPath)

const requiredStages = [
  "parse_body",
  "load_context",
  "load_reference_data",
  "load_players",
  "load_leaders",
  "load_strategic_archetypes",
  "insert_missing_players",
  "prepare_results",
  "update_and_delete_results",
  "insert_results_and_items",
  "build_response",
  "total",
]

for (const stage of requiredStages) {
  if (!route.includes(stage)) {
    failures.push(`Missing update-route timing stage label: ${stage}`)
  }
}

const requiredSnippets = [
  "createServerTiming",
  'timing.time("insert_results_and_items"',
  "trackedItemPayload",
  "item_input AS",
  "inserted_items AS",
  "submittedPlayersByName",
  "playerNamesNeedingLookup",
  "leaderIdsNeedingLookup",
  "strategicArchetypeIdsNeedingLookup",
  "INSERT INTO playthrough_result_items",
  "ON CONFLICT (playthrough_result_id, item_key)",
  "WITH updated_playthrough AS",
  "deleted_results AS",
]

for (const snippet of requiredSnippets) {
  if (!route.includes(snippet)) {
    failures.push(`Missing performance guard snippet: ${snippet}`)
  }
}

if (route.includes('timing.time("insert_results"')) {
  failures.push("Result row insertion should be folded into insert_results_and_items")
}

if (route.includes('timing.time("replace_tracked_items"')) {
  failures.push("Tracked item insertion should be folded into insert_results_and_items")
}

if (route.includes("replacePlaythroughResultItemsForResults")) {
  failures.push("Update route should not call the separate tracked-item replacement helper")
}

if (!allCheck.includes("check-dune-performance-timing.mjs")) {
  failures.push("check-dune-all.mjs should run check-dune-performance-timing.mjs")
}

if (failures.length > 0) {
  const auditPath = path.join(process.cwd(), ".tmp-dune-performance-timing-audit.md")
  const body = [
    "# Dune performance timing audit",
    "",
    "| Issue |",
    "|---|",
    ...failures.map((failure) => `| ${failure.replaceAll("|", "\\|")} |`),
    "",
  ].join("\n")

  fs.writeFileSync(auditPath, body)
  console.error(`Dune performance timing checks failed. Audit written to ${auditPath}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

fs.rmSync(path.join(process.cwd(), ".tmp-dune-performance-timing-audit.md"), {
  force: true,
})

console.log("✓ Dune performance timing checks passed")
