import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { studioApi, type FontStatus, type GlyphEntry } from '../lib/studioApi'

type StudioTab = 'browser' | 'editor' | 'preview' | 'batch' | 'export'

type StudioContextValue = {
  tab: StudioTab
  setTab: (tab: StudioTab) => void
  status: FontStatus | null
  refreshStatus: () => Promise<void>
  fontRevision: string
  bumpFontRevision: () => void
  selectedGlyph: string | null
  setSelectedGlyph: (name: string | null) => void
  selectedGlyphs: string[]
  toggleGlyphSelection: (name: string) => void
  clearSelection: () => void
  selectGlyphs: (names: string[]) => void
  wght: number
  opsz: number
  setWght: (value: number) => void
  setOpsz: (value: number) => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<StudioTab>('browser')
  const [status, setStatus] = useState<FontStatus | null>(null)
  const [fontRevision, setFontRevision] = useState('initial')
  const [selectedGlyph, setSelectedGlyph] = useState<string | null>(null)
  const [selectedGlyphs, setSelectedGlyphs] = useState<string[]>([])
  const [wght, setWght] = useState(430)
  const [opsz, setOpsz] = useState(14)

  const refreshStatus = useCallback(async () => {
    await studioApi.ensureWorking()
    setStatus(await studioApi.status())
  }, [])

  const bumpFontRevision = useCallback(() => {
    setFontRevision(`${Date.now()}`)
  }, [])

  const toggleGlyphSelection = useCallback((name: string) => {
    setSelectedGlyphs((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )
  }, [])

  const clearSelection = useCallback(() => setSelectedGlyphs([]), [])

  const selectGlyphs = useCallback((names: string[]) => setSelectedGlyphs(names), [])

  const value = useMemo(
    () => ({
      tab,
      setTab,
      status,
      refreshStatus,
      fontRevision,
      bumpFontRevision,
      selectedGlyph,
      setSelectedGlyph,
      selectedGlyphs,
      toggleGlyphSelection,
      clearSelection,
      selectGlyphs,
      wght,
      opsz,
      setWght,
      setOpsz,
    }),
    [
      tab,
      status,
      refreshStatus,
      fontRevision,
      bumpFontRevision,
      selectedGlyph,
      selectedGlyphs,
      toggleGlyphSelection,
      clearSelection,
      selectGlyphs,
      wght,
      opsz,
    ],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error('useStudio must be used within StudioProvider')
  }
  return context
}

export function openGlyphEditor(
  glyph: GlyphEntry,
  context: StudioContextValue,
) {
  context.setSelectedGlyph(glyph.name)
  if (!context.selectedGlyphs.includes(glyph.name)) {
    context.selectGlyphs([glyph.name])
  }
  context.setTab('editor')
}
