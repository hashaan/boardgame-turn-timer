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

add(
  "Patch folders are excluded from typecheck",
  tsconfig.includes('"patches"'),
  "tsconfig should exclude patches/ so extracted patch source files are not compiled.",
)

add(
  "Settings stay collapsed until opened",
  page.includes("showSettings={showSettings}") &&
    settings.includes("if (!showSettings) return null") &&
    !page.includes("showSettings || !gameStarted"),
  "Settings should not auto-expand before starting the timer.",
)

add(
  "Top controls keep the live actions simple",
  controls.includes("Start new game") &&
    controls.includes("Resume") &&
    controls.includes("Pause") &&
    controls.includes("Next turn") &&
    !controls.includes("Switch here") &&
    !controls.includes("Return to ") &&
    !controls.includes("Correction"),
  "The top panel should expose Start/Resume/Pause and Next turn, not switch/correction terminology.",
)

add(
  "Primary controls are larger than utilities",
  controls.includes("h-14") &&
    controls.includes("min-w-[11rem]") &&
    controls.includes("utilityButtonClass") &&
    controls.includes("h-9") &&
    controls.includes('size="lg"') &&
    controls.includes('size="sm"'),
  "Live timer controls should be visibly larger than utility buttons.",
)

add(
  "End game stays after Reveal turn in the utility row",
  controls.includes("End game") &&
    controls.includes('title="End the timer and open the playthrough form"') &&
    controls.includes("utilityButtonClass") &&
    controls.indexOf("Reveal turn") < controls.indexOf("End game") &&
    !controls.includes("endGamePrimaryClass") &&
    !controls.includes('isRoundWrapUp ? "Log playthrough" : "End game"'),
  "End game should stay consistent, secondary, and ordered after Reveal turn to avoid accidental presses.",
)

add(
  "Reset copy names the timer scope",
  controls.includes("Reset game") &&
    controls.includes("Timers and turn slots will be cleared.") &&
    !controls.includes("fresh game"),
  "Reset should say Reset game and briefly state what will be cleared.",
)

add(
  "No manual combat shortcut remains in player-turn controls",
  !controls.includes("Go to combat") && !controls.includes("skip-wrap-up"),
  "Player turns should enter cleanup automatically after the last Reveal; no extra Go to combat control should be needed.",
)

add(
  "Round cleanup starts the next round explicitly",
  controls.includes("Start round") &&
    page.includes('if (roundPhase === "round-wrap-up") return') &&
    timerHook.includes('if (roundPhase === "round-wrap-up") return'),
  "Keyboard/card navigation should not accidentally start the next round from cleanup.",
)

add(
  "Desktop grid rotates to the current round starter",
  page.includes("orderedPlayers") &&
    page.includes("displayPlayers") &&
    page.includes("currentDisplayIndex") &&
    page.includes("currentOrderIndex") &&
    page.includes("playerOrder"),
  "The visible grid should rotate so the current round starter appears first.",
)


add(
  "Hook returns round order state for the rotated grid",
  timerHook.includes("playerOrder,") &&
    timerHook.includes("currentOrderIndex,") &&
    page.includes("playerOrder") &&
    page.includes("currentOrderIndex"),
  "useGameTimer should return playerOrder/currentOrderIndex when page.tsx consumes them.",
)

add(
  "Keyboard shortcuts wire arrows to cursor navigation",
  keyboard.includes("ArrowRight") &&
    keyboard.includes("ArrowLeft") &&
    page.includes("handleShortcutNextPlayer") &&
    page.includes("handleShortcutPreviousPlayer"),
  "Arrow keys should move the timer cursor except during cleanup.",
)

add(
  "Card click resumes the selected player during player turns",
  page.includes("onPlayerClick={focusPlayerCard}") &&
    page.includes("switchToPlayer(playerId)") &&
    timerHook.includes('if (roundPhase === "round-wrap-up") return') &&
    timerHook.includes("autoStart: true") &&
    timerHook.includes("manual: false"),
  "Clicking a card should resume that player during player turns, but not reopen cards during cleanup.",
)

add(
  "Arrow review pauses and auto-resumes started slots",
  timerHook.includes("scheduleAutoResume") &&
    timerHook.includes("autoResumeSeconds") &&
    timerHook.includes("completeActiveTurn(-1") &&
    timerHook.includes("autoStartDueSlot: false") &&
    card.includes("Resume in"),
  "Arrow review should pause briefly, then resume a started slot.",
)

add(
  "Running slot settlement is centralised",
  timerHook.includes("freezeActiveTurn") &&
    timerHook.includes("turnBonusAppliedThisTurn") &&
    timerHook.includes("getLiveTurnTimeRemaining") &&
    timerHook.includes("shouldSettleRunning"),
  "Navigation should settle the running slot once rather than repeatedly subtracting time.",
)

add(
  "Finished player turns enter cleanup automatically",
  timerHook.includes("allPlayersFinishedTurns") &&
    timerHook.includes("enterRoundWrapUp()") &&
    timerHook.includes("direction === 1 && allPlayersFinishedTurns(updatedPlayers)"),
  "Moving forward after the last reveal should enter cleanup automatically.",
)

add(
  "Cleanup supports explicit reveal reopen only",
  timerHook.includes("reopenPlayerTurn") &&
    card.includes("Reopen Reveal") &&
    card.includes("without adding a bonus") &&
    card.includes("disabled={!gameStarted || !onTurnStageChange || isRoundWrapUp}") &&
    card.includes("disabled={!onAddTurn || isRoundWrapUp}"),
  "During cleanup, turn chips/card clicks should not reopen a player; use Reopen Reveal.",
)

add(
  "Started-slot invariant is explicit",
  timerHook.includes("canStartNextSlot") &&
    timerHook.includes("getPreviousIndexInOrder") &&
    timerHook.includes("cannot overtake") &&
    timerHook.includes("roundStarterIndex"),
  "Started turn slots should preserve the clockwise wave and prevent overtaking.",
)

add(
  "Manual fill uses the same invariant",
  timerHook.includes("fillPlayerToStartedLevel") &&
    timerHook.includes("canManuallyFillTargetLevel") &&
    timerHook.includes("setPlayerTurnStage") &&
    timerHook.includes("startNextSlotWithoutActivating"),
  "Manual circle/reveal fills should grant only legal started slots.",
)


add(
  "Manual fills do not disturb another running player",
  timerHook.includes("const targetWasActive = Boolean(targetPlayer.isActive)") &&
    timerHook.includes("if (player.id !== playerId) return player") &&
    timerHook.includes("targetWasActive && isRunning && turnStartTime !== null") &&
    timerHook.includes("fillPlayerToStartedLevel"),
  "Filling another player's circle should not settle or pause the currently running player.",
)

add(
  "Manual reveal does not fill unused agent turns",
  timerHook.includes("getRevealCompletionLevel") &&
    timerHook.includes("startRevealWithoutActivating") &&
    timerHook.includes("!canStartNextSlot(players, targetIndex, orderIndices, 1)") &&
    timerHook.includes("isOutOfRound: true") &&
    timerHook.includes("isRevealing: false") &&
    !timerHook.includes("? limit + 1"),
  "Manual R/Reveal should complete the reveal slot without pretending skipped agent turns received a bonus.",
)

add(
  "Manual fill cannot rewind completed slots",
  timerHook.includes('typeof stage === "number"') &&
    timerHook.includes("requestedLevel <= currentStartedLevel") &&
    timerHook.includes("return"),
  "Clicking an already completed earlier slot should not reopen or unfill that player.",
)

add(
  "Manual reveal marks done without consuming spare agents",
  timerHook.includes("const isRevealStage = stage ===") &&
    timerHook.includes("projectRevealDone") &&
    timerHook.includes("startRevealWithoutActivating(player)") &&
    timerHook.includes("isOutOfRound: true") &&
    timerHook.includes("isRevealing: false"),
  "Manual R/reveal should mark the reveal complete without filling spare agent circles.",
)

add(
  "Reveal button starts early reveal without filling spare agents",
  timerHook.includes("const startRevealTurn = () =>") &&
    timerHook.includes("isRevealing: true") &&
    timerHook.includes("Math.min(") &&
    timerHook.includes("getAgentTurnLimit(settledPlayer)") &&
    timerHook.includes("return prepareActiveTurn(revealBase"),
  "Reveal turn should start Reveal timing without filling unused agent-turn circles.",
)

add(
  "Adding a turn from Reveal moves to the inserted agent turn",
  timerHook.includes("shouldStartInsertedTurn") &&
    timerHook.includes("wasAtRevealOrDone") &&
    timerHook.includes("return prepareActiveTurn(") &&
    timerHook.includes("extraTurnsThisRound") &&
    timerHook.includes("+ 1"),
  "+ Turn should not snap a revealing player back to the previous turn.",
)

add(
  "Removing turns can reduce base turns down to Reveal only",
  timerHook.includes("oldLimit <= 0") &&
    timerHook.includes("newExtraTurns") &&
    timerHook.includes("BASE_AGENT_TURNS + (target.hasSwordmaster ? 1 : 0) + newExtraTurns") &&
    card.includes("Remove one Agent turn this round"),
  "− Turn should work beyond manually added turns, down to a Reveal-only round.",
)

add(
  "Clicking forward from Reveal completes that reveal",
  timerHook.includes("isForwardInOrder") &&
    timerHook.includes("shouldEndActiveReveal") &&
    timerHook.includes("allPlayersFinishedTurns(settledPlayers)"),
  "Selecting a forward player from Reveal should end the current Reveal; selecting backward should not.",
)

add(
  "New round starts the first slot immediately",
  timerHook.includes("return startNextSlotWithoutActivating({") &&
    timerHook.includes("isActive: true") &&
    timerHook.includes("setTurnStartTime(Date.now())"),
  "Starting a new round should immediately start the new round starter's first slot.",
)

add(
  "Turn badge names the current or next slot cleanly",
  card.includes("getUpcomingTurnLabel") &&
    card.includes("Next:") &&
    card.includes("Now") &&
    card.includes("Paused") &&
    !card.includes('"Started"'),
  "Cards should not show stale Started Agent Turn wording.",
)

add(
  "Turn tracker copy uses completed wording",
  card.includes("Reveal complete") &&
    card.includes("agent turns completed") &&
    !card.includes("credited"),
  "Turn tracker copy should use completed wording, not credited wording.",
)

add(
  "Early reveal is labelled and leaves spare agent circles unfilled",
  card.includes("Reveal early") &&
    card.includes("Revealing early") &&
    card.includes("revealing early") &&
    timerHook.includes("startRevealWithoutActivating") &&
    !timerHook.includes("agentTurnsTaken: getAgentTurnLimit(settledPlayer)"),
  "Early Reveal should be visible in the UI and should not mark unused agent turns as completed.",
)

add(
  "Turn bonus and efficiency labels stay cohesive",
  card.includes("Turn bonus") &&
    card.includes("Turn efficiency") &&
    card.includes("0s left") &&
    !card.includes("used up") &&
    !card.includes("Turn Progress"),
  "The bar should show turn bonus and the numeric chip should show turn efficiency.",
)

add(
  "Card skeleton is stable before and after game start",
  card.includes("Start game to track turns") &&
    card.includes("not started") &&
    page.includes("items-stretch") &&
    card.includes("group relative h-full") &&
    card.includes("invisible") &&
    card.includes("h-8 items-center"),
  "Cards should reserve the same layout rows before and after the game starts.",
)

add(
  "Player identity uses real token colours",
  card.includes('value: "blue"') &&
    card.includes('value: "green"') &&
    card.includes('value: "yellow"') &&
    card.includes('value: "red"') &&
    !card.includes('value: "purple"') &&
    !card.includes('value: "rose"') &&
    timerHook.includes('"Player 3", "yellow"') &&
    timerHook.includes('"Player 4", "red"'),
  "Player colour choices should match the real Dune token colours.",
)

add(
  "Active highlight is clear but separate from token colours",
  card.includes("border-2 border-amber-500 bg-amber-50/80") &&
    card.includes("left-3 right-3 top-0 h-1.5 rounded-t-lg bg-amber-500/95") &&
    card.includes("left-0 w-1") &&
    card.includes("colors.bar") &&
    !card.includes("ring-4 ring-amber-400/70") &&
    !card.includes("pointer-events-none absolute inset-0 rounded-xl border-2") &&
    !card.includes("border border-slate-800") &&
    !card.includes("bg-slate-900"),
  "Active status should be obvious at a glance without masking the player-colour rail/dot.",
)

add(
  "Inactive borders are neutral with colour accents",
  card.includes("border border-slate-200") &&
    card.includes("left-0 w-1") &&
    card.includes("colors.bar") &&
    !card.includes("border-${colors") &&
    !card.includes("ring-offset"),
  "Inactive cards should use neutral borders with a small player-colour rail/dot.",
)

add(
  "Done cards are muted but selectable",
  card.includes("player.isOutOfRound") &&
    card.includes("text-slate-400") &&
    card.includes("hover:text-slate-500") &&
    card.includes("cursor-default"),
  "Done cards should be quieter without looking disabled.",
)


add(
  "Active card has local live controls",
  card.includes("Local live controls") &&
    card.includes("onStartPause?.()") &&
    card.includes("onNextTurn?.()") &&
    page.includes("onStartPause={startPauseTimer}") &&
    page.includes("onNextTurn={nextTurn}"),
  "The active card should expose local Pause/Resume and Next turn controls so users do not need to reach for the top toolbar.",
)

add(
  "End game can open the playthrough log at any time",
  controls.includes("End game") &&
    controls.includes("Log playthrough?") &&
    controls.includes("Open form") &&
    page.includes("if (isRunning)") &&
    page.includes("setShowPlaythroughLog(true)"),
  "Users should be able to stop mid-round and open the playthrough form without clearing timer state.",
)

add(
  "Cards reserve a stable timing skeleton",
  card.includes("min-h-[27rem]") &&
    card.includes("Start game to track turns") &&
    card.includes("not started") &&
    card.includes("Local live controls") &&
    card.includes("flex min-h-8 items-center gap-2 flex-wrap justify-end") &&
    card.includes('aria-hidden={!showColorSelectors}'),
  "Player cards should reserve timing, status, and setup rows so game start does not resize the grid.",
)

add(
  "Timing metric text is consistent",
  card.includes("Turn bonus") &&
    card.includes("Turn efficiency") &&
    card.includes("text-xs font-medium") &&
    !card.includes("text-[11px] font-medium"),
  "Turn bonus and Turn efficiency should use the same compact text scale as other supporting card details.",
)

add(
  "Mobile navigation exposes paused state",
  mobileNav.includes("isPaused") &&
    page.includes("isPaused={gameStarted && !isRunning}"),
  "Mobile controls should also show when the selected timer is paused.",
)

add(
  "Help copy is compact and user-facing",
  info.includes("Next turn:") &&
    info.includes("Review:") &&
    info.includes("Click a card:") &&
    info.includes("filled slots are already complete") &&
    !info.includes("do not unfill") &&
    !info.includes("implementation"),
  "The helper card should explain the interaction briefly without sounding like a spec.",
)

add(
  "No stale next-player setter remains",
  !page.includes("setNextPlayerIndex") && !timerHook.includes("setNextPlayerIndex"),
  "Remove stale setNextPlayerIndex references; current cursor state uses currentPlayerIndex.",
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
