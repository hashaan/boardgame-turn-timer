"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Database, CheckCircle, AlertCircle } from "lucide-react"

interface AdvancedStatsTestProps {
  playthrough: any
  gameType?: string
}

export const AdvancedStatsTest = ({ playthrough, gameType }: AdvancedStatsTestProps) => {
  const [showRawData, setShowRawData] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const runDataIntegrityTest = () => {
    const results = {
      hasAdvancedStats: false,
      missingFields: [],
      dataIntegrity: true,
      fieldCoverage: 0,
    }

    if (!playthrough?.results || playthrough.results.length === 0) {
      results.dataIntegrity = false
      results.missingFields.push("No results found")
      setTestResults(results)
      return
    }

    const expectedFields = [
      "leader",
      "leader_name",
      "leaderId",
      "victory_points",
      "finalVp",
      "final_vp",
      "spice",
      "finalResourcesSpice",
      "final_resources_spice",
      "solari",
      "finalResourcesSolari",
      "final_resources_solari",
      "water",
      "finalResourcesWater",
      "final_resources_water",
      "troops",
      "finalResourcesTroops",
      "final_resources_troops",
      "cards_trashed",
      "cardsTrashed",
      "cards_in_deck",
      "finalDeckSize",
      "final_deck_size",
      "strategic_archetype",
      "strategic_archetype_name",
      "strategicArchetypeId",
    ]

    let totalFields = 0
    let presentFields = 0

    playthrough.results.forEach((result: any) => {
      expectedFields.forEach((field) => {
        totalFields++
        if (result[field] !== undefined && result[field] !== null) {
          presentFields++
          results.hasAdvancedStats = true
        }
      })
    })

    results.fieldCoverage = Math.round((presentFields / totalFields) * 100)

    // Check for specific missing critical fields
    playthrough.results.forEach((result: any, index: number) => {
      if (!result.leader && !result.leader_name) {
        results.missingFields.push(`Player ${index + 1}: No leader data`)
      }
      if (!result.victory_points && !result.finalVp && !result.final_vp) {
        results.missingFields.push(`Player ${index + 1}: No victory points`)
      }
    })

    setTestResults(results)
  }

  const isDuneGame = gameType === "dune"

  return (
    <Card className="mt-4 border-dashed border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Database className="w-4 h-4 mr-2" />
          Advanced Stats Test Panel
          {isDuneGame && (
            <Badge variant="outline" className="ml-2">
              Dune Game
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRawData(!showRawData)}>
            {showRawData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showRawData ? "Hide" : "Show"} Raw Data
          </Button>
          <Button variant="outline" size="sm" onClick={runDataIntegrityTest}>
            <Database className="w-4 h-4 mr-2" />
            Test Data Integrity
          </Button>
        </div>

        {showRawData && (
          <div className="bg-slate-50 p-3 rounded-md">
            <h4 className="font-semibold text-sm mb-2">Raw Playthrough Data:</h4>
            <pre className="text-xs overflow-auto max-h-64 bg-white p-2 rounded border">
              {JSON.stringify(playthrough, null, 2)}
            </pre>
          </div>
        )}

        {testResults && (
          <div className="bg-slate-50 p-3 rounded-md">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              {testResults.dataIntegrity ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              )}
              Data Integrity Test Results
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Has Advanced Stats:</strong> {testResults.hasAdvancedStats ? "✅ Yes" : "❌ No"}
              </div>
              <div>
                <strong>Field Coverage:</strong> {testResults.fieldCoverage}%
              </div>
              {testResults.missingFields.length > 0 && (
                <div>
                  <strong>Missing Fields:</strong>
                  <ul className="list-disc list-inside ml-4 text-xs text-red-600">
                    {testResults.missingFields.map((field: string, index: number) => (
                      <li key={index}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {isDuneGame && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            💡 This is a Dune: Imperium game. Advanced stats should include leader selection, victory points, resources,
            and strategic archetypes.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
