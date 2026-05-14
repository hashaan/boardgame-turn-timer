#!/usr/bin/env node

import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = join(repoRoot, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`)
    return ""
  }
  return readFileSync(absolutePath, "utf8")
}

function check(label, fn) {
  try {
    fn()
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
  }
}

const route = read("app/api/groups/[groupId]/export/route.ts")
const exportLib = read("lib/dune-export.ts")
const exportTypes = read("types/dune-export.ts")
const api = read("lib/api.ts")
const button = read("components/leaderboard/export-data-button.tsx")
const leaderboardView = read("components/leaderboard/leaderboard-view.tsx")
const allCheck = read("scripts/check-dune-all.mjs")

check("route protects group data", () => {
  assert.match(route, /group_access/, "export route should check group_access")
  assert.match(route, /role IN \('member', 'admin'\)/, "export route should limit access to members/admins")
  assert.match(route, /gameBelongsToGroup\(groupId, gameId\)/, "game exports should verify game membership")
  assert.match(route, /status: 403/, "access failure should be forbidden")
  assert.match(route, /status: 404/, "wrong-game failure should be not found")
})

check("route returns a downloadable JSON file", () => {
  assert.match(route, /JSON\.stringify\(payload, null, 2\)/, "export should be human-readable JSON")
  assert.match(route, /Content-Type": "application\/json; charset=utf-8"/, "export should identify JSON content")
  assert.match(route, /Content-Disposition/, "export should set a download filename")
  assert.match(route, /Cache-Control": "no-store"/, "export should not be cached")
})

check("export contract is versioned and relational", () => {
  assert.match(exportTypes, /DUNE_EXPORT_FORMAT = "boardgame-turn-timer\.export"/, "export format should be named")
  assert.match(exportTypes, /DUNE_EXPORT_VERSION = 1/, "export should carry a version")
  assert.match(exportTypes, /playthroughResults: DuneExportRow\[\]/, "results should be a top-level table")
  assert.match(exportTypes, /playthroughResultItems: DuneExportRow\[\]/, "tracked items should be a top-level table")
  assert.match(exportLib, /formatVersion: DUNE_EXPORT_VERSION/, "payload should include the version")
  assert.match(exportLib, /counts: \{[\s\S]*playthroughResultItems:/, "payload should include row counts")
  assert.match(exportLib, /SELECT pr\.\*[\s\S]*FROM playthrough_results pr/, "result rows should use canonical database fields")
  assert.match(exportLib, /FROM playthrough_result_items pri/, "tracked item rows should be exported")
})

check("client downloads the export", () => {
  assert.match(api, /downloadGroupExport/, "client helper should expose downloadGroupExport")
  assert.match(api, /URL\.createObjectURL\(blob\)/, "client helper should download a blob")
  assert.match(api, /Content-Disposition/i, "client helper should read the filename header")
  assert.match(button, /Export data/, "button should expose export action text")
  assert.match(button, /dataExportApi\.downloadGroupExport/, "button should call the export helper")
  assert.match(button, /toast\.success\("Export downloaded"/, "button should show success feedback")
})

check("leaderboard exposes Dune export", () => {
  assert.match(leaderboardView, /import \{ ExportDataButton \}/, "leaderboard should import the export button")
  assert.match(leaderboardView, /isDuneGame && \(/, "export should be scoped to Dune games")
  assert.match(leaderboardView, /<ExportDataButton[\s\S]*groupId=\{groupId\}[\s\S]*gameId=\{game\.id\}/, "export button should receive group and game IDs")
})

check("aggregate check includes export", () => {
  assert.match(allCheck, /check-dune-export\.mjs/, "check-dune-all should run the export guard")
})

if (failures.length > 0) {
  console.error(`Dune export checks failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("✓ Dune export checks passed")
