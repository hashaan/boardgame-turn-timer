#!/usr/bin/env node

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const addFormSource = readFileSync(join(repoRoot, "components/leaderboard/enhanced-add-playthrough-form.tsx"), "utf8")
const editFormSource = readFileSync(join(repoRoot, "components/leaderboard/edit-playthrough-form.tsx"), "utf8")
const editorSource = readFileSync(join(repoRoot, "components/leaderboard/acquisitions-editor.tsx"), "utf8")

for (const [name, source] of [["add form", addFormSource], ["edit form", editFormSource]]) {
  assert.doesNotMatch(source, /MANUAL/, `${name}: scoring controls should not show persistent MANUAL labels`)
  assert.match(source, /<div className="flex flex-wrap gap-4">\s*\{renderNumber\(index, [^,]+, "endgameSpiceCount"/, `${name}: Economy fields should use a tighter flex layout`)
  assert.match(source, /function LightSubsection/, `${name}: final conflict should have a light subsection component`)
  assert.match(source, /action\?: React\.ReactNode/, `${name}: light subsections should support compact section-level actions`)
  assert.doesNotMatch(source, /<StatSubsection title="Combat result">/, `${name}: final conflict should not wrap combat result in a nested card`)
  assert.doesNotMatch(source, /<StatSubsection title="Deployed units">/, `${name}: final conflict deployed units should be a light subsection, not a nested card`)
  assert.doesNotMatch(source, /<StatSubsection title="Garrison">[\s\S]*?Final conflict/, `${name}: final conflict garrison should not be a nested card`)
  assert.doesNotMatch(source, /<StatSubsection title="Bonuses">[\s\S]*?Final conflict/, `${name}: final conflict bonuses should not be a nested card`)
  assert.match(source, /\{ label: "Final strength", value: [^}]+ \}/, `${name}: final conflict summary should include final strength between known and unaccounted`)
  assert.match(source, /<LightSubsection\s+title="Bonuses"\s+action=\{\(/, `${name}: strength sources should be attached to the Bonuses subsection header`)
  assert.match(source, /<VpRail[\s\S]*?action=\{\(/, `${name}: VP sources should be attached to the VP Track header`)
  assert.match(source, /label="Final VP"[\s\S]*?widthClass="max-w-64"/, `${name}: Final VP should be wider than compact count fields`)
  assert.match(source, /resetValue=\{conflictRewardSourceVp \|\| undefined\}/, `${name}: conflict reward VP reset should use itemised source baseline`)
  assert.match(source, /resetValue=\{battleIconBreakdown\.hasInputs \? battleIconBreakdown\.battleIconVp : undefined\}/, `${name}: battle icon reset should use calculated floor`)
  assert.doesNotMatch(source, /<div className="mt-3 flex justify-end">[\s\S]*?Show VP sources/, `${name}: VP sources button should not float below the VP Track`)
  assert.doesNotMatch(source, /<StatSubsection title="Presence">/, `${name}: Board state Presence should be a light subsection, not a nested card`)
  assert.doesNotMatch(source, /<StatSubsection title="Board upgrades"/, `${name}: Board upgrades should be a light subsection, not a nested card`)
  assert.doesNotMatch(source, /<StatSection title="Cards and Intrigues"/, `${name}: Cards and intrigues section title should use sentence case`)
  assert.doesNotMatch(source, /<StatSubsection title="Deck composition">/, `${name}: Deck composition should be a light subsection, not a nested card`)
  assert.match(source, /label="Final conflict VP"/, `${name}: final conflict VP label should use sentence case`)
  assert.match(source, /placeholder:text-slate-400 placeholder:font-normal/, `${name}: repeated unset placeholders should be visually lighter`)

  assert.match(source, /title="Tracked deck cards"/, `${name}: deck item drawer should use tracked language`)
  assert.match(source, /<LightSubsection title="Conflicts">/, `${name}: conflict subsection should avoid duplicate Conflict cards heading`)
  assert.match(source, /title="Tracked intrigues"/, `${name}: intrigue item drawer should use tracked language`)
  assert.match(source, /title="Tracked contracts"/, `${name}: contract item drawer should use tracked language`)
  assert.match(source, /title="Tracked tech tiles"/, `${name}: tech tile item drawer should use tracked language`)
  assert.match(source, /title="Tracked commander skills"/, `${name}: commander skill item drawer should use tracked language`)
  assert.match(source, /title="Deck cards"[\s\S]*?allowedItemTypes=\{\["imperium_card", "reserve_card", "starter_card"\]\}/, `${name}: deck-card strength sources should use the same item-category label as VP sources`)
  assert.match(source, /title="Tech tiles"[\s\S]*?strengthOnly/, `${name}: tech strength sources should use item-category naming under strength source context`)
  assert.match(source, /title="Commander skills"[\s\S]*?strengthOnly/, `${name}: commander strength sources should use item-category naming under strength source context`)
  assert.match(source, /commanderSkillStrengthFloor = sumAcquisitionStrength\(acquisitions, \["sardaukar_skill"\]\)/, `${name}: commander strength tracked total should come from tracked commander skills`)
  assert.match(source, /intrigueStrengthFloor = sumAcquisitionStrength\(acquisitions, \["intrigue_card"\]\)/, `${name}: intrigue strength tracked total should come from tracked intrigue cards`)
  assert.match(source, /imperiumStrengthFloor = sumAcquisitionStrength\(acquisitions, \["imperium_card", "reserve_card"\]\)/, `${name}: imperium strength tracked total should come from tracked deck cards`)
  assert.match(source, /techStrengthFloor = sumAcquisitionStrength\(acquisitions, \["tech_tile"\]\)/, `${name}: tech strength tracked total should come from tracked tech tiles`)
  assert.match(source, /finalConflictStrengthSourcesCommanderSkills", "Cmdr skills", \{ resetValue: commanderSkillStrengthFloor \|\| undefined, trackedTotalLabel: commanderSkillStrengthFloor/, `${name}: commander strength aggregate should use tracked strength evidence`)
  assert.match(source, /finalConflictStrengthSourcesIntrigue", "Intrigue", \{ resetValue: intrigueStrengthFloor \|\| undefined, trackedTotalLabel: intrigueStrengthFloor/, `${name}: intrigue strength aggregate should use tracked strength evidence`)
  assert.match(source, /finalConflictStrengthSourcesImperium", "Imperium", \{ resetValue: imperiumStrengthFloor \|\| undefined, trackedTotalLabel: imperiumStrengthFloor/, `${name}: imperium strength aggregate should use tracked strength evidence`)
  assert.match(source, /finalConflictStrengthSourcesTech", "Tech tiles", \{ resetValue: techStrengthFloor \|\| undefined, trackedTotalLabel: techStrengthFloor/, `${name}: tech strength aggregate should use tracked strength evidence`)
  assert.match(source, /className="mt-0\.5 inline-flex h-7 w-7[^"]*border-slate-200[^"]*text-slate-500/, `${name}: section collapse button should be neutral by default`)
  assert.match(source, /resetValue\?: number/, `${name}: steppers should accept source-derived tracked baselines`)
  assert.match(source, /trackedTotalLabel\?: string/, `${name}: steppers should support explicit tracked-total helper labels`)
  assert.match(source, /shouldOfferTrackedTotal[\s\S]*?Use tracked/, `${name}: steppers should expose a tracked-total fill action`)
  assert.match(source, /trackedTotalDisplay = trackedTotalLabel \?\?/, `${name}: tracked-total helper should explain where the fill value comes from`)
  assert.match(source, /placeholder=\{placeholder \?\? "Not set"\}/, `${name}: unset numeric controls should use user-facing Not set copy`)
  assert.match(source, /const canClearTotal = !isLocked && numericValue !== undefined && safeMin === 0/, `${name}: recorded totals should be clearable back to not set`)
  assert.match(source, /aria-label=\{`Clear \$\{label \?\? "value"\}`\}/, `${name}: clear total action should be accessible and contextual`)
  assert.doesNotMatch(source, /Total unknown|total not recorded|Total unset/, `${name}: reconciliation copy should not use unknown or unset warning pills`)
  assert.doesNotMatch(source, /h-8 w-8 shrink-0[\s\S]*?↺/, `${name}: stepper actions should not use a persistent square reset button beside the input`)
}

assert.match(editorSource, /if \(vpOnly\) \{\s*emitSectionChange\(selected\.map\(\(item\) => \(\{ \.\.\.item, vpCount: 0, entrySource: "manual" \}\)\)\)/, "VP source reset should preserve acquired cards and clear only VP attribution")
assert.match(editorSource, /if \(strengthOnly\) \{\s*emitSectionChange\(selected\.map\(\(item\) => \(\{ \.\.\.item, strengthCount: 0, entrySource: "manual" \}\)\)\)/, "Strength source reset should preserve acquired cards and clear only strength attribution")

console.log("✓ Dune UI pattern checks passed")

