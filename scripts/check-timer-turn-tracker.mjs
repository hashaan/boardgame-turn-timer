#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
const exists = (file) => fs.existsSync(path.join(root, file))
const checks = []
const add = (name, condition, detail) => checks.push({ name, condition, detail })

const files = {
    page: "app/dune-imperium/page.tsx",
    controls: "components/ControlPanel.tsx",
    settings: "components/SettingsPanel.tsx",
    card: "components/PlayerCard.tsx",
    info: "components/GameInfo.tsx",
    mobileNav: "components/MobileCardNavigation.tsx",
    timerHook: "hooks/useGameTimer.ts",
    keyboard: "hooks/useKeyboardShortcuts.ts",
    tsconfig: "tsconfig.json",
}

for (const file of Object.values(files)) {
    add(`${file} exists`, exists(file), "Missing expected timer file")
}

const page = read(files.page)
const controls = read(files.controls)
const settings = read(files.settings)
const card = read(files.card)
const info = read(files.info)
const mobileNav = read(files.mobileNav)
const timerHook = read(files.timerHook)
const keyboard = read(files.keyboard)
const tsconfig = read(files.tsconfig)
const self = read("scripts/check-timer-turn-tracker.mjs")

add(
    "Guardrail script keeps the shebang first",
    self.startsWith("#!/usr/bin/env node\n"),
    "The shebang must be the first line so Node can execute the script.",
)

add(
    "Patch source folders are excluded from typecheck",
    tsconfig.includes('"patches"'),
    "tsconfig should exclude patches/ so extracted patch source files are not compiled.",
)

add(
    "Settings stay collapsed unless requested",
    page.includes("showSettings={showSettings}") &&
        settings.includes("if (!showSettings) return null") &&
        !page.includes("showSettings || !gameStarted"),
    "Settings should not open automatically before the game.",
)

add(
    "Primary controls stay simple",
    controls.includes("Start new game") &&
        controls.includes("Next turn") &&
        controls.includes("Pause") &&
        controls.includes("Resume") &&
        !controls.includes("Switch here") &&
        !controls.includes("Return to ") &&
        !controls.includes("Correction timer"),
    "The top panel should expose Start/Pause/Resume and Next turn, not Switch/Return/correction copy.",
)

add(
    "Primary controls are larger than utilities",
    controls.includes("h-14") &&
        controls.includes("min-w-[11rem]") &&
        controls.includes("h-9") &&
        controls.includes("utilityButtonClass"),
    "Live controls should be larger than utility buttons.",
)

add(
    "Reset copy names the scope clearly",
    controls.includes("Reset game") &&
        controls.includes("Timers and turn slots will be cleared.") &&
        !controls.includes("fresh game"),
    "Reset should say Reset game and concisely explain what will be cleared.",
)

add(
    "Dune phase skip copy is explicit",
    controls.includes("Go to combat") &&
        controls.includes("Combat, Makers, and Recall") &&
        !controls.includes("Wrap-Up"),
    "The phase shortcut should be clear without using vague wrap-up copy.",
)

add(
    "Keyboard shortcuts are wired to timer controls",
    keyboard.includes("ArrowRight") &&
        keyboard.includes("ArrowLeft") &&
        keyboard.includes("Enter") &&
        keyboard.includes("onNextPlayer") &&
        keyboard.includes("onPreviousPlayer"),
    "Keyboard shortcuts should keep arrows and Enter wired to timer navigation.",
)

add(
    "Arrow navigation drives the cursor",
    page.includes("onNextPlayer: nextPlayerCard") &&
        page.includes("onPreviousPlayer: previousPlayerCard") &&
        timerHook.includes("completeActiveTurn(1, { autoStartDueSlot: true") &&
        timerHook.includes("completeActiveTurn(-1, { autoStartDueSlot: false"),
    "Right/Enter should advance the cursor; left should review the previous player.",
)

add(
    "Card click resumes immediately",
    page.includes("onPlayerClick={focusPlayerCard}") &&
        page.includes("switchToPlayer(playerId)") &&
        timerHook.includes("selectPlayerIndex(targetIndex") &&
        timerHook.includes("autoStart: true") &&
        timerHook.includes("manual: false"),
    "Clicking a player card should select that player and resume immediately.",
)

add(
    "Arrow review auto-resumes after a short delay",
    timerHook.includes("autoResumeSeconds") &&
        timerHook.includes("scheduleAutoResume") &&
        timerHook.includes("seconds = 3") &&
        card.includes("Resume in ${autoResumeSeconds}s"),
    "Arrow review should visibly pause, then auto-resume after 3 seconds.",
)

add(
    "Navigation does not repeatedly charge paused timers",
    timerHook.includes("shouldSettleRunning = isRunning && turnStartTime !== null") &&
        timerHook.includes("shouldSettleRunning ? freezeActiveTurn") &&
        timerHook.includes("if (!turnStartTime) return 0") &&
        timerHook.includes("localStorage.removeItem(\"dune-timer-turn-start\")"),
    "Only a running timer session should be settled; paused review movement should be time-neutral.",
)

add(
    "Pause freezes the selected slot once",
    timerHook.includes("const currentElapsed = getCurrentTurnTime()") &&
        timerHook.includes("freezeActiveTurn(player, currentElapsed)") &&
        timerHook.includes("setTurnStartTime(null)") &&
        timerHook.includes("setPausedElapsedTime(0)"),
    "Pausing should freeze the current bonus/time state and clear the live start timestamp.",
)

add(
    "Started-slot invariant exists",
    timerHook.includes("canStartNextSlot") &&
        timerHook.includes("getPreviousIndexInOrder") &&
        timerHook.includes("getStartedTurnLevel(previousPlayer) >= nextLevel") &&
        timerHook.includes("roundStarterIndex"),
    "Started turn slots should advance as a legal wave through turn order.",
)

add(
    "Filled slots are monotonic",
    timerHook.includes("fillPlayerToStartedLevel") &&
        timerHook.includes("startNextSlotWithoutActivating") &&
        !timerHook.includes("agentTurnsTaken: 0,\n                    isRevealing") ,
    "Manual slot filling should add legal started slots rather than un-filling previous slots.",
)

add(
    "Turn badge shows next slot after a player has moved on",
    card.includes("getUpcomingTurnLabel") &&
        card.includes("player.agentTurnsTaken + 1") &&
        card.includes("`Next: ${upcomingTurnLabel}`") &&
        !card.includes('"Started"'),
    "Inactive players should show the next slot, not Started Agent Turn copy.",
)

add(
    "Paused state is visible on the card",
    card.includes("Paused") &&
        card.includes("Resume in") &&
        card.includes("<Pause") &&
        page.includes("autoResumeSeconds="),
    "A selected paused card should not look like it is silently running.",
)

add(
    "Turn bonus and efficiency labels are cohesive",
    card.includes("Turn bonus") &&
        card.includes("Turn efficiency") &&
        card.includes("0s left") &&
        !card.includes("used up") &&
        !card.includes("Turn Progress"),
    "The bar should show turn bonus; the chip should show turn efficiency.",
)

add(
    "Inactive borders are neutral with colour accents",
    card.includes("border border-slate-200") &&
        card.includes("inset-y-3 left-0 w-1") &&
        card.includes("colors.bar") &&
        !card.includes("${colors.border}"),
    "Inactive cards should use neutral borders with subtle colour rails/dots.",
)

add(
    "Active state is separate from player identity",
    card.includes("bg-gradient-to-br from-amber-50 to-yellow-50") &&
        card.includes("absolute inset-x-0 top-0 h-1") &&
        card.includes("Active") &&
        card.includes("border border-amber-200"),
    "Active state should use warm fill/chip/top accent, while player colour remains rail/dot identity.",
)

add(
    "Orange is not a player identity colour",
    timerHook.includes('"rose"') &&
        card.includes("color === \"orange\" ? \"rose\"") &&
        !card.includes('value: "orange"'),
    "Orange should be reserved for app action/current-turn emphasis.",
)

add(
    "Cards keep a stable grid skeleton",
    page.includes("grid grid-cols-1") &&
        page.includes("lg:grid-cols-2") &&
        page.includes("items-stretch") &&
        card.includes("group relative h-full") &&
        card.includes("Turn bonus") &&
        card.includes("Turn efficiency"),
    "Desktop cards should stay in fixed grid positions with the same timing skeleton.",
)

add(
    "Help copy stays compact and user-facing",
    info.includes("Next turn:") &&
        info.includes("Turn slots:") &&
        info.includes("Review:") &&
        info.includes("Click a card:") &&
        !info.includes("do not unfill") &&
        !info.includes("implementation"),
    "The help card should explain the model briefly without sounding like implementation notes.",
)

add(
    "Mobile navigation follows timer semantics after game start",
    page.includes('nextPlayerCard("right")') &&
        page.includes('previousPlayerCard("left")') &&
        mobileNav.includes("Paused") &&
        mobileNav.includes("Active"),
    "Mobile arrows should use the same timer navigation once the game has started.",
)


add(
    "Page does not reference stale next-player setter",
    !page.includes("setNextPlayerIndex") && page.includes("setCurrentPlayerIndex(index)"),
    "Card focus should use the current-player setter; setNextPlayerIndex is not part of the hook API.",
)

add(
    "Manual reveal chip marks a player done",
    timerHook.includes('stage === "reveal" || stage === "done"') &&
        timerHook.includes("isOutOfRound: true") &&
        timerHook.includes("isRevealing: false") &&
        card.includes('if (player.isOutOfRound) return "Done this round"'),
    "Manual R should fill the reveal slot and mark the player done instead of leaving misleading Next Reveal copy.",
)

add(
    "Arrow navigation and card clicks have distinct run behaviour",
    timerHook.includes("scheduleAutoResume(selectedPlayer.id)") &&
        timerHook.includes("completeActiveTurn(1, { autoStartDueSlot: true, autoResumeReview: true })") &&
        timerHook.includes("completeActiveTurn(-1, { autoStartDueSlot: false, autoResumeReview: true })") &&
        timerHook.includes("selectPlayerIndex(targetIndex, {") &&
        timerHook.includes("autoStart: true") &&
        timerHook.includes("manual: false"),
    "Arrows should review with delayed resume, while card clicks resume the clicked player's timer immediately.",
)

const failed = checks.filter((check) => !check.condition)
if (failed.length > 0) {
    console.error(`Timer turn tracker checks failed (${failed.length}/${checks.length}):`)
    for (const check of failed) {
        console.error(`- ${check.name}: ${check.detail}`)
    }
    process.exit(1)
}

console.log(`✓ Timer turn tracker checks passed (${checks.length}/${checks.length})`)
