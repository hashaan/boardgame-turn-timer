import { Card, CardContent } from "@/components/ui/card"

export const GameInfo = () => {
    return (
        <Card className="mt-6 border-amber-200 bg-amber-50/50 text-amber-950 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/65 dark:text-zinc-300 dark:shadow-none">
            <CardContent className="p-4">
                <div className="grid gap-2 text-sm text-amber-700 dark:text-zinc-400 [&_strong]:dark:text-zinc-100 md:grid-cols-2">
                    <p>
                        <strong>Next turn:</strong> advances one seat clockwise.
                    </p>
                    <p>
                        <strong>Turn slots:</strong> filled slots are already complete.
                    </p>
                    <p>
                        <strong>Review:</strong> press ← to revisit a player; it resumes after 3 seconds.
                    </p>
                    <p>
                        <strong>Click a card:</strong> resumes that player immediately.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
