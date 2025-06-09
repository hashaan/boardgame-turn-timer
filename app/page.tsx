"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Clock,
  Trophy,
  Users,
  Play,
  Star,
  Timer,
  BarChart3,
  Search,
  Target,
  Award,
  Sparkles,
  Coffee,
  Gamepad2,
} from "lucide-react"
import Link from "next/link"
import { track } from "@vercel/analytics/react"
import { Toaster } from "sonner"

const availableGames = [
  {
    id: "dune-imperium",
    name: "Dune: Imperium",
    description: "Strategic turn-based timer with round management and player efficiency tracking",
    image: "/images/dune-imperium-cover.png",
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
    href: "/dune-imperium",
    leaderboardHref: "/leaderboard",
  },
]

const upcomingGame = {
  id: "spirit-island",
  name: "Spirit Island",
  description: "Cooperative timer with spirit powers and invader phase management coming soon!",
  image: "/images/spirit-island-board.png",
  category: "Cooperative",
  players: "1-4 Players",
  duration: "90-120 min",
  difficulty: "Complex",
  features: ["Phase management", "Spirit power tracking", "Invader progression", "Fear level tracking"],
}

const categories = ["All", "Strategy", "Cooperative"]

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredAvailableGames = availableGames.filter((game) => {
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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
      <Toaster richColors />

      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Board Game Timers</h1>
                <p className="text-sm text-orange-600">Made with ❤️ by gamers, for gamers</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#games" className="text-slate-600 hover:text-orange-600 transition-colors font-medium">
                Games
              </a>
              <a href="#upcoming" className="text-slate-600 hover:text-orange-600 transition-colors font-medium">
                What's Next
              </a>
              <Link href="/leaderboard" className="text-slate-600 hover:text-orange-600 transition-colors font-medium">
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
            <Badge className="mb-6 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-800 border-orange-200 px-4 py-2 text-sm font-medium">
              <Coffee className="w-4 h-4 mr-2" />
              Crafted by Board Game Enthusiasts
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
              Game Night,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">
                {" "}
                Elevated
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Join our growing community of board game lovers! Start with our polished Dune: Imperium timer, and stay
              tuned for more amazing timers coming soon. 🎲
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/dune-imperium">
                  <Play className="w-5 h-5 mr-2" />
                  Try Dune: Imperium Timer
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 px-8 py-4 text-lg font-semibold"
              >
                <Link href="/leaderboard">
                  <Trophy className="w-5 h-5 mr-2" />
                  Explore Leaderboards
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white/70 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Why Our Community Loves Us</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Every feature is lovingly crafted based on real feedback from board game groups just like yours.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Precision Timing</h3>
              <p className="text-slate-600 leading-relaxed">
                Accurate turn and round management with efficiency tracking to help players improve their game pace and
                have more fun!
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Smart Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Beautiful leaderboards and statistics that make tracking performance across game sessions actually
                enjoyable.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Friend Groups</h3>
              <p className="text-slate-600 leading-relaxed">
                Create cozy private groups, share game codes easily, and keep those competitive leaderboards going
                strong!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Available Games Section */}
      <section id="games" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Ready to Play Right Now! 🎮</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Jump in and start timing your games today with our fully-featured, battle-tested Dune: Imperium timer.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-4 h-4" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={
                    selectedCategory === category
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
                      : "border-orange-300 text-orange-700 hover:bg-orange-50"
                  }
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Available Games Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {filteredAvailableGames.map((game) => (
              <Card
                key={game.id}
                className="group transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-orange-100 hover:border-orange-200"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={game.image || "/placeholder.svg"}
                    alt={game.name}
                    className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  {game.popular && (
                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
                      <Star className="w-3 h-3 mr-1" />
                      Community Favorite
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2 text-slate-800">{game.name}</CardTitle>
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                        {game.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-slate-600">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-orange-500" />
                      {game.players}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-orange-500" />
                      {game.duration}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-sm text-slate-700 mb-3">What makes it special:</h4>
                    <ul className="text-xs text-slate-600 space-y-2">
                      {game.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      asChild
                      className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      onClick={() => handleGameSelect(game.id, game.name)}
                    >
                      <Link href={game.href}>
                        <Play className="w-4 h-4 mr-2" />
                        Start Playing
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => handleLeaderboardAccess(game.id, game.name)}
                    >
                      <Link href={game.leaderboardHref}>
                        <Trophy className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Game Section */}
      <section id="upcoming" className="py-16 bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">What's Coming Next? 🚀</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We're working on exciting new timers to enhance your board gaming experience. Here's what's in
              development!
            </p>
          </div>

          {/* Spirit Island Card */}
          <div className="max-w-2xl mx-auto">
            <Card className="group transition-all duration-300 hover:shadow-2xl border-rose-200 bg-white/90 backdrop-blur-sm">
              <div className="relative overflow-hidden">
                <img
                  src={upcomingGame.image || "/placeholder.svg"}
                  alt={upcomingGame.name}
                  className="w-full h-64 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                />
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 shadow-lg px-3 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Coming Soon
                </Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2 text-slate-800">{upcomingGame.name}</CardTitle>
                <Badge variant="outline" className="text-sm border-rose-300 text-rose-700 mx-auto">
                  {upcomingGame.category}
                </Badge>
                <CardDescription className="text-base leading-relaxed text-slate-600 mt-3">
                  {upcomingGame.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6 text-sm text-slate-600">
                  <div className="flex items-center justify-center">
                    <Users className="w-4 h-4 mr-2 text-rose-500" />
                    {upcomingGame.players}
                  </div>
                  <div className="flex items-center justify-center">
                    <Clock className="w-4 h-4 mr-2 text-rose-500" />
                    {upcomingGame.duration}
                  </div>
                  <div className="flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 mr-2 text-rose-500" />
                    {upcomingGame.difficulty}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-sm text-slate-700 mb-3 text-center">Planned awesome features:</h4>
                  <ul className="text-sm text-slate-600 space-y-2">
                    {upcomingGame.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-rose-500 rounded-full mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-center">
                  <Button
                    disabled
                    className="w-full text-lg font-semibold py-4 bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    In Development
                  </Button>
                  <p className="text-center text-sm text-slate-500 mt-3">
                    Stay tuned for updates on our development progress! 🎉
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Award className="w-16 h-16 text-orange-100 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Make Game Night Amazing? 🎲</h2>
            <p className="text-xl text-orange-100 mb-8">
              Join our wonderful community of board game enthusiasts who are already timing their games like absolute
              pros!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/dune-imperium">
                  <Play className="w-5 h-5 mr-2" />
                  Start Your First Game
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white/50 text-white hover:bg-white hover:text-orange-600 px-8 py-4 text-lg font-semibold transition-all"
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
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">Board Game Timers</span>
              </div>
              <p className="text-sm text-slate-400">
                Made with lots of ❤️ by board game enthusiasts, for board game enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Games</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dune-imperium" className="hover:text-orange-400 transition-colors">
                    Dune: Imperium Timer
                  </Link>
                </li>
                <li>
                  <span className="text-slate-500">Spirit Island (Coming Soon)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Community</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#upcoming" className="hover:text-orange-400 transition-colors">
                    Upcoming Timers
                  </a>
                </li>
                <li>
                  <Link href="/leaderboard" className="hover:text-orange-400 transition-colors">
                    Friend Group Leaderboards
                  </Link>
                </li>
                <li>
                  <span className="text-slate-400">Feature Suggestions</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-slate-400">How to Use Timers</span>
                </li>
                <li>
                  <span className="text-slate-400">Get in Touch</span>
                </li>
                <li>
                  <span className="text-slate-400">Share Feedback</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Board Game Timers. Built with ❤️ by the board gaming community, for the community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
