"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Clock, Trophy, Users, Play, Star, Timer, BarChart3, Gamepad2, Search, Zap, Target, Award } from "lucide-react"
import Link from "next/link"
import { track } from "@vercel/analytics/react"

const gameTimers = [
  {
    id: "dune-imperium",
    name: "Dune: Imperium",
    description: "Strategic turn-based timer with round management and player efficiency tracking",
    image: "/placeholder.svg?height=200&width=300",
    category: "Strategy",
    players: "1-4 Players",
    duration: "60-120 min",
    difficulty: "Medium",
    features: [
      "Turn-based timing",
      "Round management",
      "Player efficiency tracking",
      "Reveal phase support",
      "Mobile-friendly interface",
    ],
    available: true,
    popular: true,
    href: "/",
    leaderboardHref: "/leaderboard",
  },
  {
    id: "wingspan",
    name: "Wingspan",
    description: "Coming soon - Engine building timer with action tracking",
    image: "/placeholder.svg?height=200&width=300",
    category: "Engine Building",
    players: "1-5 Players",
    duration: "40-70 min",
    difficulty: "Medium",
    features: ["Action phase timing", "Round progression", "Bird card tracking", "End game scoring"],
    available: false,
    popular: false,
    href: "#",
    leaderboardHref: "#",
  },
  {
    id: "azul",
    name: "Azul",
    description: "Coming soon - Tile placement timer with pattern tracking",
    image: "/placeholder.svg?height=200&width=300",
    category: "Abstract",
    players: "2-4 Players",
    duration: "30-45 min",
    difficulty: "Easy",
    features: ["Turn timing", "Round management", "Pattern completion", "Scoring assistance"],
    available: false,
    popular: false,
    href: "#",
    leaderboardHref: "#",
  },
]

const categories = ["All", "Strategy", "Engine Building", "Abstract"]

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredGames = gameTimers.filter((game) => {
    const matchesSearch =
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || game.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleGameSelect = (gameId: string, gameName: string) => {
    track("landing_game_selected", { game_id: gameId, game_name: gameName })
  }

  const handleLeaderboardAccess = (gameId: string, gameName: string) => {
    track("landing_leaderboard_accessed", { game_id: gameId, game_name: gameName })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Board Game Timers</h1>
                <p className="text-sm text-slate-600">Professional timing solutions</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#games" className="text-slate-600 hover:text-slate-800 transition-colors">
                Games
              </Link>
              <Link href="#features" className="text-slate-600 hover:text-slate-800 transition-colors">
                Features
              </Link>
              <Link href="/leaderboard" className="text-slate-600 hover:text-slate-800 transition-colors">
                Leaderboards
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
              <Zap className="w-3 h-3 mr-1" />
              Professional Board Game Timing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
              Elevate Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {" "}
                Game Night
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Professional timing solutions for board game enthusiasts. Track turns, manage rounds, and maintain
              competitive leaderboards with precision timing tools designed for serious players.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Timing
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3"
              >
                <Trophy className="w-5 h-5 mr-2" />
                View Leaderboards
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Why Choose Our Timers?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built by board game enthusiasts for board game enthusiasts. Every feature is designed to enhance your
              gaming experience.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Precision Timing</h3>
              <p className="text-slate-600">
                Accurate turn and round management with efficiency tracking to help players improve their game pace.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Advanced Analytics</h3>
              <p className="text-slate-600">
                Comprehensive leaderboards and statistics to track performance across multiple game sessions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Group Management</h3>
              <p className="text-slate-600">
                Create friend groups, share game codes, and maintain persistent leaderboards across sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section id="games" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Available Game Timers</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose from our collection of specialized timing solutions, each tailored to specific board games.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => (
              <Card
                key={game.id}
                className={`group transition-all duration-300 hover:shadow-xl ${
                  game.available ? "hover:-translate-y-1" : "opacity-75"
                }`}
              >
                <div className="relative">
                  <img
                    src={game.image || "/placeholder.svg"}
                    alt={game.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  {game.popular && (
                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {!game.available && (
                    <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
                      <Badge variant="secondary" className="bg-white/90 text-slate-700">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">{game.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {game.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">{game.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {game.players}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {game.duration}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">Features:</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {game.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    {game.available ? (
                      <>
                        <Button
                          asChild
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          onClick={() => handleGameSelect(game.id, game.name)}
                        >
                          <Link href={game.href}>
                            <Play className="w-4 h-4 mr-2" />
                            Start Timer
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaderboardAccess(game.id, game.name)}
                        >
                          <Link href={game.leaderboardHref}>
                            <Trophy className="w-4 h-4" />
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button disabled className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="text-center py-12">
              <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-600 mb-2">No games found</h3>
              <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Award className="w-16 h-16 text-blue-200 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Level Up Your Game Night?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of board game enthusiasts who trust our timing solutions for their competitive gaming
              sessions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3">
                <Link href="/">
                  <Play className="w-5 h-5 mr-2" />
                  Start Your First Game
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-blue-300 text-white hover:bg-blue-700 px-8 py-3"
              >
                <Link href="/leaderboard">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Explore Leaderboards
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">Board Game Timers</span>
              </div>
              <p className="text-sm text-slate-400">
                Professional timing solutions for serious board game enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Games</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Dune: Imperium
                  </Link>
                </li>
                <li>
                  <span className="text-slate-500">Wingspan (Soon)</span>
                </li>
                <li>
                  <span className="text-slate-500">Azul (Soon)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Features</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/leaderboard" className="hover:text-white transition-colors">
                    Leaderboards
                  </Link>
                </li>
                <li>
                  <span className="text-slate-400">Turn Timing</span>
                </li>
                <li>
                  <span className="text-slate-400">Group Management</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-slate-400">Documentation</span>
                </li>
                <li>
                  <span className="text-slate-400">Contact</span>
                </li>
                <li>
                  <span className="text-slate-400">Feedback</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Board Game Timers. Built for the board gaming community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
