#!/usr/bin/env node

import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const repoRoot = process.cwd()
const buildDir = join(repoRoot, ".tmp-dune-battle-icon-tests")

rmSync(buildDir, { recursive: true, force: true })
mkdirSync(buildDir, { recursive: true })

function transpile(sourcePath, outputName, replacements = []) {
  let source = readFileSync(join(repoRoot, sourcePath), "utf8")
  for (const [from, to] of replacements) source = source.replaceAll(from, to)

  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
    },
  })

  writeFileSync(join(buildDir, outputName), result.outputText)
}

transpile("lib/dune-acquisition-inventory.ts", "dune-acquisition-inventory.js", [
  ["@/data/dune_inventory.json", "./dune_inventory.json"],
  ["@/types/dune-acquisitions", "./types-dune-acquisitions"],
])
transpile("lib/dune-battle-icons.ts", "dune-battle-icons.js", [
  ["@/lib/dune-acquisition-inventory", "./dune-acquisition-inventory"],
  ["@/types/dune-acquisitions", "./types-dune-acquisitions"],
])
writeFileSync(join(buildDir, "types-dune-acquisitions.js"), `module.exports = {\n  DUNE_ACQUISITION_DECK_IDS: ["Imperium", "Reserve", "Intrigue", "Tech", "Sardaukar", "Contracts", "Conflict", "Navigation", "Starter"],\n  ACQUISITION_ITEM_TYPES: ["imperium_card", "reserve_card", "intrigue_card", "tech_tile", "sardaukar_skill", "contract", "conflict_card", "navigation_card", "starter_card"],\n}\n`)
copyFileSync(join(repoRoot, "data/dune_inventory.json"), join(buildDir, "dune_inventory.json"))

const { DUNE_ACQUISITION_OPTIONS } = require(join(buildDir, "dune-acquisition-inventory.js"))
const { calculateBattleIconVpForResult } = require(join(buildDir, "dune-battle-icons.js"))

function option({ itemType, name, source, battleIcon, conflictLevel }) {
  const matches = DUNE_ACQUISITION_OPTIONS.filter((candidate) => {
    if (candidate.itemType !== itemType) return false
    if (candidate.itemName !== name) return false
    if (source && candidate.source !== source) return false
    if (battleIcon && candidate.battleIcon !== battleIcon) return false
    if (conflictLevel && candidate.conflictLevel !== conflictLevel) return false
    return true
  })

  assert.equal(
    matches.length,
    1,
    `Expected one inventory match for ${itemType} ${name}, found ${matches.length}`,
  )
  return matches[0]
}

function acquisition(spec) {
  const item = option(spec)
  return {
    itemKey: item.itemKey,
    itemName: item.itemName,
    itemType: item.itemType,
    deckId: item.deckId,
    source: item.source,
    acquisitionCount: spec.count ?? 1,
    itemStatus: spec.status ?? (item.itemType === "conflict_card" ? "won" : undefined),
    vpCount: spec.vpCount ?? 0,
  }
}

const C_CRYS_1 = () => acquisition({ itemType: "conflict_card", name: "Skirmish", source: "Uprising", battleIcon: "Crysknife" })
const C_CRYS_2 = () => acquisition({ itemType: "conflict_card", name: "Spice Freighters", source: "Uprising", battleIcon: "Crysknife" })
const C_MOUSE = () => acquisition({ itemType: "conflict_card", name: "Secure Imperial Basin", source: "Uprising", battleIcon: "Desert Mouse" })
const C_THOPTER = () => acquisition({ itemType: "conflict_card", name: "Skirmish", source: "Uprising", battleIcon: "Ornithopter" })
const C_WILD = () => acquisition({ itemType: "conflict_card", name: "Storms in the South", source: "Bloodlines", battleIcon: "Wild" })
const C_WILD_2 = () => acquisition({ itemType: "conflict_card", name: "Skirmish", source: "Bloodlines", battleIcon: "Wild" })
const C_WILD_3 = () => acquisition({ itemType: "conflict_card", name: "Propaganda", source: "Uprising", battleIcon: "Wild" })

const I_CRYS = () => acquisition({ itemType: "intrigue_card", name: "Crysknife", source: "Uprising", vpCount: 1 })
const I_MOUSE = () => acquisition({ itemType: "intrigue_card", name: "Desert Mouse", source: "Uprising", vpCount: 1 })
const I_THOPTER = () => acquisition({ itemType: "intrigue_card", name: "Ornithopter", source: "Uprising", vpCount: 1 })
const I_GRASP = () => acquisition({ itemType: "intrigue_card", name: "Grasp Arrakis", source: "Bloodlines", vpCount: 1 })
const FLEET = () => acquisition({ itemType: "tech_tile", name: "Ornithopter Fleet", source: "Bloodlines" })

const cases = [
  {
    id: "L1 forced pair locks cards before Intrigues",
    result: { acquisitions: [C_CRYS_1(), C_CRYS_2(), C_MOUSE(), I_CRYS(), I_GRASP()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 0, total: 1 },
  },
  {
    id: "Wild can support a second selected icon Intrigue, but no extra battle VP remains",
    result: { acquisitions: [C_CRYS_1(), C_WILD(), I_CRYS(), I_THOPTER()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 2, total: 2 },
  },
  {
    id: "Objectives alone cannot satisfy icon Intrigues",
    result: { objectiveCard: "crysknife", acquisitions: [I_CRYS()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 0, total: 0 },
  },
  {
    id: "Objective force match leaves two Conflict cards for Grasp Arrakis",
    result: { objectiveCard: "crysknife", acquisitions: [C_CRYS_1(), C_MOUSE(), C_THOPTER(), I_GRASP()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Three Wild conflicts can support three icon Intrigues",
    result: { acquisitions: [C_WILD(), C_WILD_2(), C_WILD_3(), I_CRYS(), I_MOUSE(), I_THOPTER(), I_GRASP()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 3, total: 3 },
  },
  {
    id: "Ornithopter Fleet blocks Crysknife and Mouse Intrigues",
    result: { acquisitions: [C_CRYS_1(), C_MOUSE(), C_WILD(), I_CRYS(), I_MOUSE(), I_THOPTER(), FLEET()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Grasp can combine with a remaining Wild battle-icon pair",
    result: { acquisitions: [C_CRYS_1(), C_MOUSE(), C_THOPTER(), C_WILD(), I_GRASP()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Tie-break between icon Intrigue and Wild pair prefers the Intrigue source",
    result: { acquisitions: [C_CRYS_1(), C_WILD(), I_CRYS()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 1, total: 1 },
  },
  {
    id: "Three Wilds plus two standards can reach four Endgame Intrigue VP",
    result: { acquisitions: [C_WILD(), C_WILD_2(), C_WILD_3(), C_CRYS_1(), C_MOUSE(), I_CRYS(), I_MOUSE(), I_THOPTER(), I_GRASP()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 4, total: 4 },
  },
  {
    id: "Wild can pair with Objective while Grasp uses only Conflict cards",
    result: { objectiveCard: "crysknife", acquisitions: [C_MOUSE(), C_THOPTER(), C_WILD(), I_GRASP()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Fleet forced match should preserve a Conflict card for Ornithopter Intrigue",
    result: { objectiveCard: "crysknife", acquisitions: [C_MOUSE(), C_THOPTER(), I_THOPTER(), FLEET()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },

  {
    id: "Forced pair plus one Wild supports only one of several selected icon Intrigues",
    result: { acquisitions: [C_CRYS_1(), C_CRYS_2(), C_WILD(), I_CRYS(), I_MOUSE(), I_THOPTER()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Objective plus three matching Conflicts creates two forced battle matches",
    result: { objectiveCard: "crysknife", acquisitions: [C_CRYS_1(), C_CRYS_2(), acquisition({ itemType: "conflict_card", name: "CHOAM Security", source: "Uprising", battleIcon: "Crysknife" }), I_CRYS(), I_GRASP()] },
    expected: { battleIconVp: 2, iconIntrigueVp: 0, total: 2 },
  },
  {
    id: "Two icon Intrigues can leave one Wild battle pair",
    result: { acquisitions: [C_CRYS_1(), C_MOUSE(), C_THOPTER(), C_WILD(), I_CRYS(), I_MOUSE()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 2, total: 3 },
  },
  {
    id: "Three icon Intrigues consume all standard targets and strand the Wild",
    result: { acquisitions: [C_CRYS_1(), C_MOUSE(), C_THOPTER(), C_WILD(), I_CRYS(), I_MOUSE(), I_THOPTER()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 3, total: 3 },
  },
  {
    id: "Fleet with three Wilds gets one forced pair plus Ornithopter Intrigue on the leftover",
    result: { acquisitions: [C_WILD(), C_WILD_2(), C_WILD_3(), I_CRYS(), I_MOUSE(), I_THOPTER(), FLEET()] },
    expected: { battleIconVp: 1, iconIntrigueVp: 1, total: 2 },
  },
  {
    id: "Three real Wild Conflict cards max out at three VP with the three icon Intrigues",
    result: { acquisitions: [C_WILD(), C_WILD_2(), C_WILD_3(), I_CRYS(), I_MOUSE(), I_THOPTER()] },
    expected: { battleIconVp: 0, iconIntrigueVp: 3, total: 3 },
  },
]

for (const testCase of cases) {
  const actual = calculateBattleIconVpForResult(testCase.result)
  const total = actual.battleIconVp + actual.iconIntrigueVp

  assert.equal(actual.battleIconVp, testCase.expected.battleIconVp, `${testCase.id}: battleIconVp`)
  assert.equal(actual.iconIntrigueVp, testCase.expected.iconIntrigueVp, `${testCase.id}: iconIntrigueVp`)
  assert.equal(total, testCase.expected.total, `${testCase.id}: total`)
}

rmSync(buildDir, { recursive: true, force: true })
console.log(`✓ Dune battle icon checks passed (${cases.length}/${cases.length})`)
