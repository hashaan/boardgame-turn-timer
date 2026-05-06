import { Card, CardContent } from "@/components/ui/card"

export const GameInfo = () => {
    return (
        <Card className="mt-8 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 dark:border-white/[0.08] dark:[background-image:none] dark:bg-zinc-900/70 dark:text-zinc-300 dark:shadow-none">
            <CardContent className="p-4">
                <div className="grid gap-2 text-sm text-amber-700 dark:text-zinc-400 [&_strong]:dark:text-zinc-100 md:grid-cols-2">
                    <p>
                        <strong>Turn Flow:</strong> Use Next Turn for normal play. It advances to the next eligible player and grants the automatic +1:00 turn bonus.
                    </p>
                    <p>
                        <strong>Reveal Turns:</strong> Use Start Reveal Early only when a player chooses to reveal before using all Agent turns. After Reveal, that player is skipped for the rest of the round.
                    </p>
                    <p>
                        <strong>Corrections:</strong> Use Undo to reverse the last turn change. Use Switch only for manual correction; it does not grant +1:00.
                    </p>
                    <p>
                        <strong>Round Wrap-Up:</strong> After all players reveal, resolve Combat, Makers, and Recall before starting the next round.
                    </p>
                    <p>
                        <strong>Turn Progress:</strong> The bar shows progress through the current timed minute. Overtime appears once the turn passes 60 seconds.
                    </p>
                    <p>
                        <strong>Controls:</strong> Space = Pause/Resume, → = Next Turn, ← or Ctrl/Cmd+Z = Undo.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
