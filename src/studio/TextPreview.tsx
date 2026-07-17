import { useEffect, useMemo, useState } from 'react'
import { studioApi } from '../lib/studioApi'
import { useStudio } from './StudioContext'

const FEATURES = [
  { id: 'tnum', label: 'Tabular figures' },
  { id: 'ss01', label: 'Stylistic set 01' },
  { id: 'cv11', label: 'Character variant 11' },
  { id: 'cv06', label: 'Character variant 06' },
  { id: 'case', label: 'Case-sensitive forms' },
  { id: 'frac', label: 'Fractions' },
] as const

const ICONS = [
  'seb-point.svg',
  'seb-spark.svg',
  'seb-search.svg',
  'seb-chat.svg',
  'seb-compose.svg',
  'seb-download.svg',
]

export function TextPreview() {
  const studio = useStudio()
  const [heading, setHeading] = useState('Distinct at 13px')
  const [body, setBody] = useState(
    'Seb Sans inherits Inter control letters, then layers frozen DNA: spurred G, footed 1, tailed l, slashed 0, round punctuation, and enlarged tittles.',
  )
  const [size, setSize] = useState(18)
  const [tracking, setTracking] = useState(0)
  const [leading, setLeading] = useState(1.5)
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(['tnum'])

  const fontFamily = 'SebSansWorking'
  const featureSettings = useMemo(
    () =>
      enabledFeatures.length
        ? enabledFeatures.map((feature) => `"${feature}" 1`).join(', ')
        : 'normal',
    [enabledFeatures],
  )

  useEffect(() => {
    let cancelled = false
    const styleId = 'seb-sans-working-font'
    fetch(studioApi.workingFontUrl(studio.fontRevision))
      .then((response) => response.blob())
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        let style = document.getElementById(styleId) as HTMLStyleElement | null
        if (!style) {
          style = document.createElement('style')
          style.id = styleId
          document.head.appendChild(style)
        }
        style.textContent = `
          @font-face {
            font-family: "${fontFamily}";
            src: url("${url}") format("truetype");
            font-weight: 100 900;
            font-style: normal;
          }
        `
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [studio.fontRevision])

  const previewStyle = {
    fontFamily: `"${fontFamily}", Inter, sans-serif`,
    fontVariationSettings: `'wght' ${studio.wght}, 'opsz' ${studio.opsz}`,
    fontFeatureSettings: featureSettings,
  } as const

  return (
    <section className="studio-panel">
      <div className="studio-panel__head">
        <div>
          <p className="eyebrow">F04</p>
          <h2>Live text preview</h2>
        </div>
      </div>

      <div className="preview-layout">
        <div className="preview-controls">
          <label>
            Heading
            <input
              className="studio-input"
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
            />
          </label>
          <label>
            Body
            <textarea
              className="studio-textarea"
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <label>
            Size {size}px
            <input
              type="range"
              min={12}
              max={72}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>
          <label>
            Tracking {tracking.toFixed(3)}em
            <input
              type="range"
              min={-0.08}
              max={0.12}
              step={0.005}
              value={tracking}
              onChange={(event) => setTracking(Number(event.target.value))}
            />
          </label>
          <label>
            Leading {leading.toFixed(2)}
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={leading}
              onChange={(event) => setLeading(Number(event.target.value))}
            />
          </label>
          <fieldset className="preview-features">
            <legend>OpenType features</legend>
            {FEATURES.map((feature) => (
              <label key={feature.id} className="studio-checkbox">
                <input
                  type="checkbox"
                  checked={enabledFeatures.includes(feature.id)}
                  onChange={(event) =>
                    setEnabledFeatures((current) =>
                      event.target.checked
                        ? [...current, feature.id]
                        : current.filter((item) => item !== feature.id),
                    )
                  }
                />
                {feature.label}
              </label>
            ))}
          </fieldset>
        </div>

        <div className="preview-stage" style={previewStyle}>
          <h3
            style={{
              fontSize: `${Math.round(size * 1.8)}px`,
              letterSpacing: `${tracking}em`,
              lineHeight: leading,
              marginBottom: '1rem',
            }}
          >
            {heading}
          </h3>
          <p
            style={{
              fontSize: `${size}px`,
              letterSpacing: `${tracking}em`,
              lineHeight: leading,
              maxWidth: '42rem',
            }}
          >
            {body}
          </p>
          <div className="icon-strip" aria-label="Seb Icons preview">
            {ICONS.map((icon) => (
              <img key={icon} src={`/icons/${icon}`} alt="" width={24} height={24} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
