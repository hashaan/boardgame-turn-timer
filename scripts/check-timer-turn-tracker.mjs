#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

const checks = []
const add = (name, condition, detail) => checks.push({ name, condition, detail })

const files = {
    page: "app/dune-imperium/page.tsx",
    header: "components/Header.tsx",
    controls: "components/ControlPanel.tsx",
    card: "components/PlayerCard.tsx",
    info: "components/GameInfo.tsx",
    formSection: "components/leaderboard/playthrough-form-section.tsx",
    timerHook: "hooks/useGameTimer.ts",
}

for (const file of Object.values(files)) {
    add(`${file} exists`, fs.existsSync(path.join(root, file)), "Missing expected timer file")
}

const page = read(files.page)
const header = read(files.header)
const controls = read(files.controls)
const card = read(files.card)
const info = read(files.info)
const formSection = read(files.formSection)
const timerHook = read(files.timerHook)

add(
    "Header receives timer phase",
    page.includes("roundPhase={roundPhase}") && header.includes("roundPhase?: TimerPhase"),
    "Header should show Player Turns versus Combat & Cleanup state.",
)

add(
    "Round wrap-up copy is present",
    controls.includes("Resolve Combat, Makers, and Recall") && header.includes("Combat & Cleanup"),
    "Round boundary should be visible before starting the next round.",
)

add(
    "Shortcut copy uses Undo, not Previous Turn",
    info.includes("← or Ctrl/Cmd+Z = Undo") && controls.includes("← or Ctrl/Cmd+Z = Undo") && !info.includes("Previous Turn"),
    "Help text should not describe the old Previous Turn model.",
)

add(
    "Correction model is documented",
    info.includes("Use Switch only for manual correction; it does not grant +1:00"),
    "Bottom help text should explain manual switch versus normal Next Turn.",
)

add(
    "Card-level mark-as-revealed shortcut removed",
    !card.includes("onMarkRevealed") && !card.includes("GalleryHorizontalEnd") && !page.includes("onMarkRevealed={"),
    "The cryptic per-card reveal icon should not remain; use Next Turn, Start Reveal Early, R chip, or Reopen Reveal instead.",
)

add(
    "Explicit correction controls remain",
    card.includes("Manual switch without +1:00") && card.includes("Reopen Reveal"),
    "Cards should expose explicit correction actions instead of hidden timer-changing card clicks.",
)

add(
    "Turn stepper uses agent-turn language",
    card.includes("agent turns complete") && info.includes("Agent turns"),
    "Stepper and help text should use Agent turns, not agents, for Dune rules wording.",
)

add(
    "Playthrough logging is hidden until finish",
    page.includes("showPlaythroughLog &&") &&
        page.includes("handleFinishGameAndLog") &&
        controls.includes("Finish Game & Log") &&
        formSection.includes("defaultOpen"),
    "The live timer should not show the log panel until the user deliberately finishes the game.",
)

add(
    "Normal turn advance is the bonus path",
    timerHook.includes("turnBonusAppliedThisTurn") && timerHook.includes("undoStack"),
    "The timer hook should preserve undo history and explicit turn-bonus state.",
)

const failed = checks.filter((check) => !check.condition)

if (failed.length > 0) {
    console.error(`Timer turn tracker checks failed (${failed.length}/${checks.length}):`)
    for (const check of failed) {
        console.error(`- ${check.name}: ${check.detail}`)
    }
    process.exit(1)
}

console.log(`Timer turn tracker checks passed (${checks.length}/${checks.length}).`)
