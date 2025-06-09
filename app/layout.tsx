import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Board Game Timers - Professional Timing Solutions",
  description:
    "Professional timing solutions for board game enthusiasts. Track turns, manage rounds, and maintain competitive leaderboards.",
  generator: "v0.dev",
  keywords: ["board game", "timer", "leaderboard", "dune imperium", "game tracker", "turn timer"],
  authors: [{ name: "Board Game Timers Team" }],
  openGraph: {
    title: "Board Game Timers - Professional Timing Solutions",
    description: "Elevate your game night with professional timing solutions for board games",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
