import { ACTIVE_EXPERIMENT } from '../config/experiment'
import type { ControlName, Distribution, Role, Submission, Summary } from '../types'

const CONTROLS: ControlName[] = ['weight', 'opsz', 'tracking', 'leading', 'xheight']
const RECOMMENDATION_MINIMUM = 5

function median(values: number[]): number | null {
  if (!values.length) return null
  const ordered = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(ordered.length / 2)
  return ordered.length % 2
    ? ordered[midpoint]
    : (ordered[midpoint - 1] + ordered[midpoint]) / 2
}

export function quartiles(values: number[]): Distribution {
  const ordered = [...values].sort((a, b) => a - b)
  if (!ordered.length) {
    return { count: 0, median: null, q1: null, q3: null, values: [] }
  }
  const midpoint = Math.floor(ordered.length / 2)
  const lower = ordered.slice(0, midpoint) || ordered
  const upper = ordered.slice(midpoint + (ordered.length % 2)) || ordered
  return {
    count: ordered.length,
    median: median(ordered),
    q1: median(lower),
    q3: median(upper),
    values: ordered,
  }
}

export function buildSummary(submissions: Submission[], experimentVersion?: string): Summary {
  const filtered = experimentVersion
    ? submissions.filter((item) => item.experimentVersion === experimentVersion)
    : submissions
  const completed = filtered.length
  const durations = filtered.map((item) => item.durationSeconds).filter((value) => value >= 0)
  const distributions: Summary['distributions'] = { display: {}, body: {} }

  for (const role of ['display', 'body'] as Role[]) {
    const grouped: Record<string, number[]> = Object.fromEntries(CONTROLS.map((control) => [control, []]))
    const ratings: number[] = []
    for (const submission of filtered) {
      const config = submission[role]
      for (const control of CONTROLS) {
        grouped[control].push(config.final[control])
      }
      ratings.push(config.legibilityRating)
    }
    const roleDistributions: Record<string, Distribution> = {}
    for (const control of CONTROLS) {
      roleDistributions[control] = quartiles(grouped[control])
    }
    roleDistributions.rating = quartiles(ratings)
    distributions[role] = roleDistributions
  }

  return {
    sessions: completed,
    activeSessions: 0,
    completed,
    completionRate: completed ? 1 : 0,
    medianDurationSeconds: median(durations),
    activeExperiment: ACTIVE_EXPERIMENT,
    distributions,
    smallSample: completed < 10,
    recommendationMinimum: RECOMMENDATION_MINIMUM,
    recommendationsReady: completed >= RECOMMENDATION_MINIMUM,
  }
}

export function recommendedDefaults(submissions: Submission[]): {
  display: Summary['distributions']['display']
  body: Summary['distributions']['body']
} {
  const summary = buildSummary(submissions)
  return {
    display: summary.distributions.display,
    body: summary.distributions.body,
  }
}
