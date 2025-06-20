"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bug } from "lucide-react"

interface DebugPlaythroughDataProps {
  playthrough: any
}

export const DebugPlaythroughData = ({ playthrough }: DebugPlaythroughDataProps) => {
  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center text-orange-700">
          <Bug className="w-4 h-4 mr-2" />
          Debug Data (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div>
            <Badge variant="outline" className="text-xs mb-2">
              Playthrough ID: {playthrough.id}
            </Badge>
          </div>
          <div className="text-xs">
            <strong>Results Count:</strong> {playthrough.results?.length || 0}
          </div>
          {playthrough.results?.map((result: any, index: number) => (
            <div key={index} className="text-xs bg-white p-2 rounded border">
              <div>
                <strong>Player {index + 1}:</strong> {result.playerName}
              </div>
              <div>
                <strong>Rank:</strong> {result.rank}
              </div>
              <div>
                <strong>Leader:</strong> {result.leader || result.leader_name || "None"}
              </div>
              <div>
                <strong>VP:</strong> {result.victory_points || result.finalVp || result.final_vp || "None"}
              </div>
              <div>
                <strong>Spice:</strong>{" "}
                {result.spice ?? result.finalResourcesSpice ?? result.final_resources_spice ?? "None"}
              </div>
              <div>
                <strong>Solari:</strong>{" "}
                {result.solari ?? result.finalResourcesSolari ?? result.final_resources_solari ?? "None"}
              </div>
              <div>
                <strong>Water:</strong>{" "}
                {result.water ?? result.finalResourcesWater ?? result.final_resources_water ?? "None"}
              </div>
              <div>
                <strong>Strategy:</strong> {result.strategic_archetype || result.strategic_archetype_name || "None"}
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-blue-600">Raw Data</summary>
                <pre className="text-xs mt-1 bg-gray-100 p-1 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
