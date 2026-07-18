export type Role = 'display' | 'body'
export type ControlName = 'size' | 'weight' | 'opsz' | 'tracking' | 'leading' | 'xheight'

export interface FontConfig {
  size: number
  weight: number
  opsz: number
  tracking: number
  leading: number
  xheight: number
}

export interface FontAsset {
  version: string
  url: string
  sha256: string
  axes: Record<string, { min: number; default: number; max: number }>
}

export interface Experiment {
  id: number
  version: string
  status: string
  displayDefaults: FontConfig
  bodyDefaults: FontConfig
  displaySample: string
  bodySample: string
  font: FontAsset
  createdAt: string
}

export interface SurveyState {
  display: FontConfig
  body: FontConfig
  display_text: string
  body_text: string
  display_rating: number
  body_rating: number
  likes: string
  dislikes: string
  overall_rating: number
  feelings: string
}

export interface TuningEvent {
  role: Role
  control: ControlName
  value: number
  elapsed_ms: number
}

export interface SessionCredentials {
  sessionId: string
  sessionToken: string
}

export interface Distribution {
  count: number
  median: number | null
  q1: number | null
  q3: number | null
  values: number[]
}

export interface Summary {
  sessions: number
  activeSessions: number
  completed: number
  completionRate: number
  medianDurationSeconds: number | null
  activeExperiment: Experiment | null
  distributions: Record<Role, Record<string, Distribution>>
  smallSample: boolean
  recommendationMinimum: number
  recommendationsReady: boolean
}

export interface Submission {
  id: string
  completionCode: string
  experimentVersion: string
  completedAt: string
  durationSeconds: number
  browserFamily: string | null
  viewport: { width?: number; height?: number }
  display: {
    initial: FontConfig
    final: FontConfig
    text: string
    sampleEdited: boolean
    legibilityRating: number
  }
  body: {
    initial: FontConfig
    final: FontConfig
    text: string
    sampleEdited: boolean
    legibilityRating: number
  }
  feedback: {
    likes: string
    dislikes: string
    overallRating: number
    feelings: string
  }
  events: TuningEvent[]
}

export interface SubmissionExport {
  completionCode: string
  submittedAt: string
  experimentVersion: string
  viewport: { width: number; height: number }
  browserFamily: string
  startedAt: string
  durationSeconds: number
  state: SurveyState
  tuningEvents: TuningEvent[]
  displayDefaults: FontConfig
  bodyDefaults: FontConfig
  displaySample: string
  bodySample: string
}
