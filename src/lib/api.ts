import type {
  Experiment,
  FontConfig,
  SessionCredentials,
  Submission,
  Summary,
  SurveyState,
  TuningEvent,
} from '../types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: unknown,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      typeof data?.detail === 'string' ? data.detail : 'Request failed',
      response.status,
      data?.detail,
    )
  }
  return data as T
}

const sessionHeaders = (token: string) => ({ 'X-Session-Token': token })

export const api = {
  getConfig: () => request<Experiment>('/api/survey/config'),
  createSession: (payload: Record<string, unknown>) =>
    request<
      SessionCredentials & { revision: number; experiment: Experiment }
    >('/api/survey/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSession: (credentials: SessionCredentials) =>
    request<{
      revision: number
      currentStep: number
      state: SurveyState | Record<string, never>
      completed: boolean
      completionCode: string | null
      experiment: Experiment
    }>(`/api/survey/sessions/${credentials.sessionId}`, {
      headers: sessionHeaders(credentials.sessionToken),
    }),
  saveDraft: (
    credentials: SessionCredentials,
    payload: {
      revision: number
      current_step: number
      state: SurveyState
      events: TuningEvent[]
    },
  ) =>
    request<{ revision: number }>(
      `/api/survey/sessions/${credentials.sessionId}/draft`,
      {
        method: 'PUT',
        headers: sessionHeaders(credentials.sessionToken),
        body: JSON.stringify(payload),
      },
    ),
  submit: (
    credentials: SessionCredentials,
    payload: { revision: number; state: SurveyState; events: TuningEvent[] },
  ) =>
    request<{ completionCode: string; alreadyCompleted: boolean }>(
      `/api/survey/sessions/${credentials.sessionId}/submit`,
      {
        method: 'POST',
        headers: sessionHeaders(credentials.sessionToken),
        body: JSON.stringify(payload),
      },
    ),
  adminLogin: (pin: string) =>
    request<{ ok: boolean }>('/api/admin/session', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  adminMe: () => request<{ authenticated: boolean }>('/api/admin/me'),
  summary: (experimentId?: number) =>
    request<Summary>(
      `/api/admin/summary${experimentId ? `?experiment_id=${experimentId}` : ''}`,
    ),
  submissions: (experimentId?: number) =>
    request<{ items: Submission[] }>(
      `/api/admin/submissions${experimentId ? `?experiment_id=${experimentId}` : ''}`,
    ),
  experiments: () => request<{ items: Experiment[] }>('/api/admin/experiments'),
  createExperiment: (payload: {
    display_defaults: FontConfig
    body_defaults: FontConfig
    display_sample: string
    body_sample: string
  }) =>
    request<Experiment>('/api/admin/experiments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  activateExperiment: (id: number) =>
    request<Experiment>(`/api/admin/experiments/${id}/activate`, {
      method: 'POST',
    }),
  backup: () =>
    request<{ ok: boolean; path: string }>('/api/admin/backup', {
      method: 'POST',
    }),
}
