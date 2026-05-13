#!/usr/bin/env node

import { spawnSync } from "node:child_process"

const scripts = [
  "scripts/check-dune-battle-icons.mjs",
  "scripts/check-dune-inventory-counts.mjs",
  "scripts/check-dune-acquisition-workflows.mjs",
  "scripts/check-dune-ui-patterns.mjs",
  "scripts/check-dune-schema-migration.mjs",
  "scripts/check-dune-performance-timing.mjs",
]

for (const script of scripts) {
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
