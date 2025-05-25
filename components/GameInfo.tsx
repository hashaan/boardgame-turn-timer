import { Card, CardContent } from "@/components/ui/card"

export const GameInfo = () => {
  return (
    <Card className="mt-8 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="p-4">
        <div className="text-center text-sm text-amber-700">
          <p className="mb-2">
            <strong>Reveal Turn:</strong> Click "Start Reveal" to mark current turn as reveal phase. After "Next Turn",
            player exits round.
          </p>
          <p className="mb-2">
            <strong>Round Management:</strong> Click "End Round" to reset all players for next round, clear "Round
            Complete" status, and reset turn counts.
          </p>
          <p className="mb-2">
            <strong>Turn Progress:</strong> Bar decreases from right to left showing remaining time in current minute.
            Turn progression moves to the next player to the right.
          </p>
          <p className="mb-2">
            <strong>Mobile View:</strong> Portrait mode shows one card at a time with navigation. Landscape mode shows
            all cards.
          </p>
          <p>
            <strong>Controls:</strong> Space = Pause/Resume, → = Next Turn, ← = Previous Turn
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
