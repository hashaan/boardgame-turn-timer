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
  if (!showSettings && gameStarted) return null

  return (
    <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="w-5 h-5" />
          Game Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="initial-time" className="text-blue-700 font-medium">
            Initial Time (minutes):
          </Label>
          <Input
            id="initial-time"
            type="number"
            min="1"
            max="60"
            value={initialTime / 60}
            onChange={(e) => onInitialTimeChange(Number.parseInt(e.target.value) * 60 || 600)}
            className="w-20"
          />
          <span className="text-sm text-blue-600">({formatTime(initialTime)} per player)</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Button onClick={onToggleAdjustButtons} variant="outline" size="sm" className="border-blue-400 text-blue-600">
            {showAdjustButtons ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showAdjustButtons ? "Hide" : "Show"} Time Adjust Buttons
          </Button>
          {gameStarted && (
            <Button
              onClick={onToggleColorSelectors}
              variant="outline"
              size="sm"
              className="border-blue-400 text-blue-600"
            >
              {showColorSelectors ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showColorSelectors ? "Hide" : "Show"} Color Selectors
            </Button>
          )}
          <Button onClick={onToggleSound} variant="outline" size="sm" className="border-blue-400 text-blue-600">
            {soundEnabled ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
            {soundEnabled ? "Disable" : "Enable"} Sound Effects
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
