import { NextResponse } from "next/server"

type TimingMetric = {
  name: string
  duration: number
}

function normaliseMetricName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40) || "metric"
}

export function createServerTiming() {
  const startedAt = performance.now()
  const metrics: TimingMetric[] = []

  function mark(name: string, started = startedAt) {
    metrics.push({ name: normaliseMetricName(name), duration: performance.now() - started })
  }

  async function time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const metricStartedAt = performance.now()
    try {
      return await fn()
    } finally {
      mark(name, metricStartedAt)
    }
  }

  function headerValue() {
    const seen = new Set<string>()
    const parts = [...metrics, { name: "total", duration: performance.now() - startedAt }]
      .filter((metric) => {
        if (seen.has(metric.name)) return false
        seen.add(metric.name)
        return true
      })
      .map((metric) => metric.name + ";dur=" + Math.max(0, metric.duration).toFixed(1))

    return parts.join(", ")
  }

  function json(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers)
    headers.set("Server-Timing", headerValue())
    return NextResponse.json(body, { ...init, headers })
  }

  return { mark, time, json }
}
