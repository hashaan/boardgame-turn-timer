"use client"

import { Settings, Eye, EyeOff, Volume2, VolumeX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/utils"

interface SettingsPanelProps {
  showSettings: boolean
  gameStarted: boolean
  initialTime: number
  showAdjustButtons: boolean
  showColorSelectors: boolean
  soundEnabled: boolean
  onInitialTimeChange: (time: number) => void
  onToggleAdjustButtons: () => void
  onToggleColorSelectors: () => void
  onToggleSound: () => void
}

export const SettingsPanel = ({
  showSettings,
  gameStarted,
  initialTime,
  showAdjustButtons,
  showColorSelectors,
  soundEnabled,
  onInitialTimeChange,
  onToggleAdjustButtons,
  onToggleColorSelectors,
  onToggleSound,
}: SettingsPanelProps) => {
  if (!showSettings) return null

  return (
    <Card className="mb-6 border border-blue-200/80 bg-blue-50/65 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/55 dark:text-zinc-200">
      <CardHeader className="px-5 pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-800 dark:text-zinc-100">
          <Settings className="h-4 w-4" />
          Timer settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-4 pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="initial-time" className="text-sm font-medium text-blue-700 dark:text-zinc-300">
            Starting time
          </Label>
          <Input
            id="initial-time"
            type="number"
            min="1"
            max="60"
            value={initialTime / 60}
            onChange={(e) => onInitialTimeChange(Number.parseInt(e.target.value) * 60 || 600)}
            className="h-10 w-20 bg-white dark:border-white/10 dark:bg-zinc-950/60"
          />
          <span className="text-sm text-blue-600 dark:text-zinc-400">{formatTime(initialTime)} per player</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onToggleAdjustButtons} variant="outline" size="sm" className="border-blue-300 bg-white/70 text-blue-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]">
            {showAdjustButtons ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showAdjustButtons ? "Hide" : "Show"} time controls
          </Button>
          {gameStarted && (
            <Button
              onClick={onToggleColorSelectors}
              variant="outline"
              size="sm"
              className="border-blue-300 bg-white/70 text-blue-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
            >
              {showColorSelectors ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showColorSelectors ? "Hide" : "Show"} colours
            </Button>
          )}
          <Button onClick={onToggleSound} variant="outline" size="sm" className="border-blue-300 bg-white/70 text-blue-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]">
            {soundEnabled ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
            {soundEnabled ? "Mute" : "Unmute"} sound
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SettingsPanel
