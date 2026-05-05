export interface DuneLeaderReference {
  id: string
  name: string
  faction: string
}

export interface DuneStrategicArchetypeReference {
  id: string
  name: string
  description?: string
}

interface DuneReferenceData {
  leaders: DuneLeaderReference[]
  archetypes: DuneStrategicArchetypeReference[]
}

let duneReferenceDataPromise: Promise<DuneReferenceData> | null = null

const readJsonData = async <T>(response: Response): Promise<T[]> => {
  if (!response.ok) return []
  const payload = await response.json()
  return Array.isArray(payload.data) ? payload.data : []
}

export const getDuneReferenceData = async (): Promise<DuneReferenceData> => {
  if (!duneReferenceDataPromise) {
    duneReferenceDataPromise = Promise.all([fetch("/api/leaders"), fetch("/api/strategic-archetypes")])
      .then(async ([leadersResponse, archetypesResponse]) => {
        const [leaders, archetypes] = await Promise.all([
          readJsonData<DuneLeaderReference>(leadersResponse),
          readJsonData<DuneStrategicArchetypeReference>(archetypesResponse),
        ])

        return {
          leaders: leaders.map((leader) => ({
            ...leader,
            faction: leader.faction || "Other",
          })),
          archetypes,
        }
      })
      .catch((error) => {
        duneReferenceDataPromise = null
        throw error
      })
  }

  return duneReferenceDataPromise
}
