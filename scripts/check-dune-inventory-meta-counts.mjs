#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const inventoryPath = path.join(process.cwd(), "data", "dune_inventory.json")

if (!fs.existsSync(inventoryPath)) {
  console.error(`Missing inventory file: ${inventoryPath}`)
  process.exit(1)
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"))
const metaCounts = inventory.meta?.deckCounts ?? {}
const decks = inventory.decks ?? {}

const failures = []
const rows = []

function physicalCount(item) {
  if (Number.isFinite(item.Count)) return item.Count
  if (Number.isFinite(item.CountPerPlayer)) return item.CountPerPlayer
  return 1
}

const deckNames = Array.from(
  new Set([...Object.keys(metaCounts), ...Object.keys(decks)]),
).sort()

for (const deckName of deckNames) {
  const metaCount = metaCounts[deckName]
  const entries = Array.isArray(decks[deckName]) ? decks[deckName] : []
  const groupedCount = entries.length
  const physicalCopies = entries.reduce((sum, item) => sum + physicalCount(item), 0)

  rows.push({
    deckName,
    metaCount,
    groupedCount,
    physicalCopies,
  })

  if (!Number.isFinite(metaCount)) {
    failures.push(`${deckName}: missing meta.deckCounts entry`)
    continue
  }

  if (!Array.isArray(decks[deckName])) {
    failures.push(`${deckName}: missing decks.${deckName} array`)
    continue
  }

  if (metaCount !== groupedCount) {
    failures.push(
      `${deckName}: meta.deckCounts=${metaCount}, grouped entries=${groupedCount}, physical copies=${physicalCopies}`,
    )
  }
}

const board = Array.isArray(inventory.board) ? inventory.board : []
const metaBoardCount = inventory.meta?.boardSpaceCount

if (Number.isFinite(metaBoardCount) && metaBoardCount !== board.length) {
  failures.push(
    `boardSpaceCount: meta.boardSpaceCount=${metaBoardCount}, board entries=${board.length}`,
  )
}

console.log("Dune inventory meta count audit")
console.log()

for (const row of rows) {
  const status = row.metaCount === row.groupedCount ? "OK" : "MISMATCH"
  console.log(
    `${status.padEnd(8)} ${row.deckName.padEnd(10)} meta=${String(row.metaCount).padStart(3)} grouped=${String(row.groupedCount).padStart(3)} physical=${String(row.physicalCopies).padStart(3)}`,
  )
}

console.log()

if (Number.isFinite(metaBoardCount)) {
  console.log(
    `${metaBoardCount === board.length ? "OK" : "MISMATCH"}     Board      meta=${metaBoardCount} grouped=${board.length}`,
  )
} else {
  failures.push("boardSpaceCount: missing meta.boardSpaceCount entry")
  console.log(`MISMATCH Board      meta=missing grouped=${board.length}`)
}

if (failures.length > 0) {
  const auditPath = path.join(process.cwd(), ".tmp-dune-inventory-meta-count-audit.md")
  const body = [
    "# Dune inventory meta count audit",
    "",
    "These mismatches mean `meta.deckCounts` or `meta.boardSpaceCount` no longer matches the grouped inventory arrays.",
    "",
    "| Area | Issue |",
    "|---|---|",
    ...failures.map((failure) => `| Count mismatch | ${failure.replaceAll("|", "\\|")} |`),
    "",
  ].join("\n")

  fs.writeFileSync(auditPath, body)
  console.error()
  console.error(`Inventory meta count check failed. Audit written to ${auditPath}`)
  process.exit(1)
}

console.log()
console.log("✓ Dune inventory meta counts match grouped inventory entries")
