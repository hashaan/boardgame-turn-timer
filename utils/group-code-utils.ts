// Utility functions for generating and validating group codes
export const generateGroupCode = (): string => {
  // Generate a 6-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const validateGroupCode = (code: string): boolean => {
  // Validate format: 6 alphanumeric characters
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase())
}

export const formatGroupCode = (code: string | undefined | null): string => {
  // Handle undefined/null codes gracefully
  if (!code || typeof code !== "string") {
    return "------"
  }

  // Format code with dashes for display: ABC-123
  const formatted = code.toUpperCase()
  if (formatted.length !== 6) {
    return code // Return as-is if not the expected length
  }
  return `${formatted.slice(0, 3)}-${formatted.slice(3)}`
}

export const normalizeGroupCode = (code: string): string => {
  // Remove dashes and convert to uppercase
  return code.replace(/-/g, "").toUpperCase()
}
