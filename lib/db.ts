import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

// Configure Neon to suppress browser warnings for development
export const sql = neon(process.env.DATABASE_URL, {
  // Suppress the browser warning for development
  // Remove this in production or when you implement proper server-side only access
})

// Helper function to generate unique group codes
export async function generateUniqueGroupCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Check if code already exists
    const existing = await sql`
      SELECT id FROM groups WHERE code = ${code} LIMIT 1
    `

    if (existing.length === 0) {
      return code
    }

    attempts++
  }

  throw new Error("Unable to generate unique group code")
}

// Helper function to get user ID (in a real app, this would come from authentication)
export function getUserId(request: Request): string {
  // For demo purposes, we'll use a simple session-based approach
  // In production, you'd use proper authentication (NextAuth, Clerk, etc.)
  const userAgent = request.headers.get("user-agent") || "unknown"
  const ip = request.headers.get("x-forwarded-for") || "unknown"
  return `user_${Buffer.from(userAgent + ip)
    .toString("base64")
    .slice(0, 16)}`
}
