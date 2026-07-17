export type FontStatus = {
  sourcePath: string
  workingPath: string
  sourceBytes: number
  workingBytes: number
  sourceSha256: string
  workingSha256: string
  workingMatchesSource: boolean
  historyCount: number
}

export type GlyphEntry = {
  name: string
  unicode: string | null
  group: string
  dna: boolean
  index: number
}

export type GlyphCatalog = {
  glyphs: GlyphEntry[]
  groups: string[]
  total: number
}

export type OutlinePoint = {
  x: number
  y: number
  onCurve: boolean
}

export type GlyphOutline = {
  name: string
  wght: number
  opsz: number
  advanceWidth: number
  contours: Array<{ points: OutlinePoint[] }>
  pointCount: number
}

export type PrincipleChecks = {
  distinctAt13px: {
    glyph: string | null
    confusables: Array<{
      glyph: string
      advanceWidth: number
      bboxWidth: number
      suspicious: boolean
    }>
    flags: string[]
  }
  warmthIsDetail: {
    selectionCount: number
    totalGlyphs: number
    coverageRatio?: number
    flags: string[]
  }
  rhythmBeforeLetterforms: {
    deltas: Array<{ glyph: string; advanceDelta: number }>
    flags: string[]
  }
  advisoryOnly: boolean
}

export type ExportStatus = {
  status: 'running' | 'failed' | 'passed_awaiting_confirm' | 'complete'
  gates: Record<string, { ok: boolean; failures?: string[]; warnings?: string[]; skipped?: boolean }>
  zipPath: string | null
  checklist: Array<{ id: string; required: boolean; text: string }>
  steps: Array<Record<string, unknown>>
  error: string | null
}

export class StudioApiError extends Error {
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
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : typeof detail?.error === 'string'
          ? detail.error
          : 'Request failed'
    throw new StudioApiError(message, response.status, detail)
  }
  return data as T
}

export const studioApi = {
  ensureWorking: () =>
    request<{ ok: boolean }>('/api/font/ensure-working', { method: 'POST' }),
  status: () => request<FontStatus>('/api/font/status'),
  save: () =>
    request<{ ok: boolean; historyPath: string }>('/api/font/save', {
      method: 'POST',
    }),
  discardWorking: () =>
    request<{ ok: boolean }>('/api/font/discard-working', { method: 'POST' }),
  glyphs: () => request<GlyphCatalog>('/api/glyphs'),
  outline: (name: string, wght: number, opsz: number) =>
    request<GlyphOutline>(`/api/glyphs/${encodeURIComponent(name)}/outline?wght=${wght}&opsz=${opsz}`),
  applyEdit: (body: {
    intent: string
    glyphs: string[]
    payload: Record<string, unknown>
    confirmAdvanced?: boolean
  }) =>
    request<{ ok: boolean; glyphs: Array<{ name: string; pointCount: number }> }>(
      '/api/edits/apply',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  previewBatch: (body: { glyphs: string[]; payload: Record<string, unknown> }) =>
    request<{ ok: boolean; previewGlyphCount: number; previews: Array<{ name: string; contours: GlyphOutline['contours'] }> }>(
      '/api/edits/preview-batch',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  undo: () => request<{ ok: boolean }>('/api/edits/undo', { method: 'POST' }),
  redo: () => request<{ ok: boolean }>('/api/edits/redo', { method: 'POST' }),
  principles: (glyph?: string, batchCount?: number) => {
    const params = new URLSearchParams()
    if (glyph) params.set('glyph', glyph)
    if (batchCount !== undefined) params.set('batchCount', String(batchCount))
    const query = params.toString()
    return request<PrincipleChecks>(`/api/checks/principles${query ? `?${query}` : ''}`)
  },
  exportRun: (version: string, changelog: string) =>
    request<{ jobId: string; status: string }>('/api/export/run', {
      method: 'POST',
      body: JSON.stringify({ version, changelog }),
    }),
  exportStatus: (jobId: string) =>
    request<ExportStatus>(`/api/export/status/${jobId}`),
  workingFontUrl: (cacheBust: string) =>
    `/api/font/working?cache=${encodeURIComponent(cacheBust)}`,
}
