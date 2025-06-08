// Utility functions for managing group codes in localStorage
interface StoredGroupCode {
  groupId: string
  code: string
  joinedAt: number
  groupName: string
}

const STORAGE_KEY = "dune-timer-group-codes"

export const groupStorage = {
  // Get all stored group codes
  getStoredCodes(): StoredGroupCode[] {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Error reading group codes from localStorage:", error)
      return []
    }
  },

  // Store a new group code
  storeGroupCode(groupId: string, code: string, groupName: string): void {
    if (typeof window === "undefined") return
    try {
      const existing = this.getStoredCodes()
      const updated = existing.filter((item) => item.groupId !== groupId) // Remove if exists
      updated.push({
        groupId,
        code,
        joinedAt: Date.now(),
        groupName,
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error("Error storing group code:", error)
    }
  },

  // Check if we have a code for a specific group
  hasCodeForGroup(groupId: string): boolean {
    const codes = this.getStoredCodes()
    return codes.some((item) => item.groupId === groupId)
  },

  // Get stored group IDs
  getStoredGroupIds(): string[] {
    return this.getStoredCodes().map((item) => item.groupId)
  },

  // Remove a group code (when leaving a group)
  removeGroupCode(groupId: string): void {
    if (typeof window === "undefined") return
    try {
      const existing = this.getStoredCodes()
      const updated = existing.filter((item) => item.groupId !== groupId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error("Error removing group code:", error)
    }
  },

  // Clear all stored codes
  clearAllCodes(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error("Error clearing group codes:", error)
    }
  },
}
