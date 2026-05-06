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

export interface DuneReferenceData {
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

export const seedDuneReferenceData = (data: Partial<DuneReferenceData> | null | undefined) => {
  if (!data) return

  const leaders = (data.leaders ?? []).map((leader) => ({
    ...leader,
    faction: leader.faction || "Other",
  }))
  const archetypes = data.archetypes ?? []

  duneReferenceDataPromise = Promise.resolve({ leaders, archetypes })
}
