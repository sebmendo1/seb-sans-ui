import { describe, expect, it } from 'vitest'
import { ACTIVE_EXPERIMENT } from '../config/experiment'
import { buildSummary, quartiles } from './analytics'
import {
  buildSubmissionExport,
  exportToSubmission,
  initialSurveyState,
  mergeSubmissionExports,
  parseSubmissionExport,
} from './surveyStorage'

describe('analytics', () => {
  it('computes quartiles for numeric values', () => {
    const result = quartiles([1, 2, 3, 4, 5])
    expect(result.count).toBe(5)
    expect(result.median).toBe(3)
  })

  it('builds summary from exported submissions', () => {
    const state = initialSurveyState(ACTIVE_EXPERIMENT)
    const payload = buildSubmissionExport(
      {
        step: 5,
        state,
        events: [],
        startedAt: new Date(Date.now() - 120_000).toISOString(),
        viewport: { width: 1280, height: 800 },
        browserFamily: 'Chrome',
      },
      'SEB-ABC123',
    )
    const submission = exportToSubmission(payload, 0)
    const summary = buildSummary([submission])
    expect(summary.completed).toBe(1)
    expect(summary.activeExperiment?.version).toBe('survey-001')
  })
})

describe('surveyStorage', () => {
  it('parses valid submission exports', () => {
    const payload = buildSubmissionExport(
      {
        step: 5,
        state: initialSurveyState(ACTIVE_EXPERIMENT),
        events: [],
        startedAt: new Date().toISOString(),
        viewport: { width: 390, height: 844 },
        browserFamily: 'Safari',
      },
      'SEB-TEST01',
    )
    expect(parseSubmissionExport(payload)?.completionCode).toBe('SEB-TEST01')
  })

  it('merges submissions without duplicate completion codes', () => {
    const first = buildSubmissionExport(
      {
        step: 5,
        state: initialSurveyState(ACTIVE_EXPERIMENT),
        events: [],
        startedAt: new Date().toISOString(),
        viewport: { width: 1280, height: 800 },
        browserFamily: 'Chrome',
      },
      'SEB-AAA111',
    )
    const second = buildSubmissionExport(
      {
        step: 5,
        state: initialSurveyState(ACTIVE_EXPERIMENT),
        events: [],
        startedAt: new Date().toISOString(),
        viewport: { width: 390, height: 844 },
        browserFamily: 'Safari',
      },
      'SEB-BBB222',
    )
    const merged = mergeSubmissionExports([first], [first, second])
    expect(merged.map((item) => item.completionCode)).toEqual(['SEB-BBB222', 'SEB-AAA111'])
  })
})
