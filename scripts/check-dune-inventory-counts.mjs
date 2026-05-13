#!/usr/bin/env node

import assert from "node:assert/strict"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const auditPath = join(repoRoot, ".tmp-dune-inventory-count-audit.md")
const inventory = JSON.parse(readFileSync(join(repoRoot, "data/dune_inventory.json"), "utf8"))

function positiveInteger(value, fallback = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback

  const integer = Math.trunc(number)
  return integer > 0 ? integer : fallback
}

function physicalCount(item) {
  return positiveInteger(item.Count ?? item.CountPerPlayer, 1)
}

function sourceMatches(item, source) {
  if (!source) return true
  return String(item.Source ?? "") === source
}

function matchingItems({ deckId, source }) {
  return (inventory.decks?.[deckId] ?? []).filter((item) => sourceMatches(item, source))
}

function countFor(check) {
  const items = matchingItems(check)
  return {
    rows: items.length,
    copies: items.reduce((total, item) => total + physicalCount(item), 0),
    names: items.map((item) => item.Name).filter(Boolean).sort((left, right) => String(left).localeCompare(String(right))),
  }
}

const strictChecks = [
  {
    label: "Uprising Reserve cards",
    deckId: "Reserve",
    source: "Uprising",
    expectedCopies: 18,
    rulebook: "Uprising components: 18 Reserve cards",
  },
  {
    label: "Uprising Imperium Deck cards",
    deckId: "Imperium",
    source: "Uprising",
    expectedCopies: 69,
    rulebook: "Uprising components: 69 Imperium Deck cards",
  },
  {
    label: "Uprising Intrigue cards",
    deckId: "Intrigue",
    source: "Uprising",
    expectedCopies: 44,
    rulebook: "Uprising components: 44 Intrigue cards",
  },
  {
    label: "Uprising Conflict cards",
    deckId: "Conflict",
    source: "Uprising",
    expectedCopies: 16,
    rulebook: "Uprising components: 16 Conflict cards",
  },
  {
    label: "Uprising Leaders",
    deckId: "Leader",
    source: "Uprising",
    expectedCopies: 9,
    rulebook: "Uprising components: 9 Leaders",
  },
  {
    label: "Uprising CHOAM contract tokens tracked by this catalogue",
    deckId: "Contracts",
    source: "Uprising",
    expectedCopies: 20,
    rulebook: "Uprising CHOAM module: 20 standard Contract tokens",
  },
  {
    label: "Per-player Uprising starter deck",
    deckId: "Starter",
    expectedCopies: 10,
    rulebook: "Uprising player components: 10-card starting deck",
  },
  {
    label: "Bloodlines Imperium Deck cards",
    deckId: "Imperium",
    source: "Bloodlines",
    expectedCopies: 32,
    rulebook: "Bloodlines components: 32 Imperium Deck cards",
  },
  {
    label: "Bloodlines Intrigue cards tracked by this catalogue",
    deckId: "Intrigue",
    source: "Bloodlines",
    expectedCopies: 30,
    rulebook: "Bloodlines components: 18 regular Intrigues plus 12 Twisted Intrigues",
  },
  {
    label: "Bloodlines Conflict cards",
    deckId: "Conflict",
    source: "Bloodlines",
    expectedCopies: 2,
    rulebook: "Bloodlines components: 2 Conflict cards",
  },
  {
    label: "Bloodlines Leaders",
    deckId: "Leader",
    source: "Bloodlines",
    expectedCopies: 9,
    rulebook: "Bloodlines components: 9 Leaders",
  },
  {
    label: "Bloodlines Navigation cards",
    deckId: "Navigation",
    expectedCopies: 10,
    rulebook: "Bloodlines leader-specific components: 10 Navigation cards for Steersman Y'rkoon",
  },
  {
    label: "Bloodlines Sardaukar Commander Skills",
    deckId: "Sardaukar",
    expectedRows: 7,
    expectedCopies: 14,
    rulebook: "Bloodlines components: 14 Sardaukar Commander Skills",
  },
  {
    label: "Bloodlines Tech tiles",
    deckId: "Tech",
    source: "Bloodlines",
    expectedCopies: 18,
    rulebook: "Bloodlines Tech Module: 18 Tech tiles",
  },
]

const softNotes = [
  "Bloodlines contracts are not strict here until the exact missing/duplicate token list is confirmed against the physical component names.",
  "Inventory meta.deckCounts is descriptive and not strict because it currently counts some grouped categories differently from the selectable rows.",
]

const failures = []
const rows = []

for (const check of strictChecks) {
  const actual = countFor(check)
  const sourceLabel = check.source ? ` (${check.source})` : ""

  rows.push({ check, actual })

  if (typeof check.expectedRows === "number" && actual.rows !== check.expectedRows) {
    failures.push(`${check.label}: expected ${check.expectedRows} rows, found ${actual.rows}`)
  }

  if (typeof check.expectedCopies === "number" && actual.copies !== check.expectedCopies) {
    failures.push(`${check.label}: expected ${check.expectedCopies} physical copies, found ${actual.copies}`)
  }

  if (actual.rows === 0) {
    failures.push(`${check.label}${sourceLabel}: no matching inventory rows`)
  }
}

const sardaukarSkills = matchingItems({ deckId: "Sardaukar" })
const sardaukarNames = new Set(sardaukarSkills.map((item) => item.Name))
assert.ok(sardaukarNames.has("Hardy"), "Sardaukar Commander Skills should include Hardy")
assert.equal(
  sardaukarSkills.find((item) => item.Name === "Hardy")?.Effect,
  "Reveal turn: +1 Troop.",
  "Hardy should use the same short effect style as the other Sardaukar skills",
)
assert.equal(
  sardaukarSkills.reduce((total, item) => total + physicalCount(item), 0),
  14,
  "Sardaukar Commander Skills should total 14 physical skill tiles",
)

if (failures.length > 0) {
  const lines = [
    "# Dune inventory count audit",
    "",
    "Generated by `scripts/check-dune-inventory-counts.mjs`.",
    "",
    "## Failures",
    "",
    ...failures.map((failure) => `- ${failure}`),
    "",
    "## Checked groups",
    "",
    "| Group | Rulebook count | Inventory rows | Inventory copies | Names |",
    "|---|---:|---:|---:|---|",
    ...rows.map(({ check, actual }) => {
      const expected = [
        typeof check.expectedRows === "number" ? `${check.expectedRows} rows` : null,
        typeof check.expectedCopies === "number" ? `${check.expectedCopies} copies` : null,
      ].filter(Boolean).join("; ")

      return `| ${check.label} | ${expected} | ${actual.rows} | ${actual.copies} | ${actual.names.join(", ")} |`
    }),
    "",
    "## Notes",
    "",
    ...softNotes.map((note) => `- ${note}`),
    "",
  ]

  writeFileSync(auditPath, lines.join("\n"))
  console.error(`Dune inventory count checks failed. Audit written to ${auditPath}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

if (existsSync(auditPath)) rmSync(auditPath, { force: true })
console.log("✓ Dune inventory count checks passed")
