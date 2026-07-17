import type { CSSProperties } from 'react'
import type { ControlName, FontConfig, Role } from '../types'
import { Rating } from './Rating'

interface FontTunerProps {
  role: Role
  config: FontConfig
  defaults: FontConfig
  text: string
  defaultText: string
  rating: number
  onConfigChange: (config: FontConfig, control: ControlName, value: number) => void
  onTextChange: (text: string) => void
  onRatingChange: (rating: number) => void
}

interface ControlDefinition {
  key: ControlName
  label: string
  min: number
  max: number
  step: number
  format: (value: number) => string
}

const shared: ControlDefinition[] = [
  { key: 'weight', label: 'Weight', min: 100, max: 900, step: 1, format: String },
  { key: 'opsz', label: 'Optical', min: 14, max: 32, step: 0.5, format: String },
  {
    key: 'tracking',
    label: 'Tracking',
    min: -0.05,
    max: 0.08,
    step: 0.001,
    format: (value) => `${value.toFixed(3)}em`,
  },
  {
    key: 'leading',
    label: 'Leading',
    min: 0.85,
    max: 2,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  { key: 'xheight', label: 'X-height', min: 82, max: 122, step: 1, format: String },
]

const controls: Record<Role, ControlDefinition[]> = {
  display: [...shared],
  body: [
    { ...shared[0], min: 300, max: 700 },
    { ...shared[1] },
    { ...shared[2], min: -0.03, max: 0.06 },
    { ...shared[3], min: 1.1, max: 2 },
    { ...shared[4] },
  ],
}

export function FontTuner({
  role,
  config,
  defaults,
  text,
  defaultText,
  rating,
  onConfigChange,
  onTextChange,
  onRatingChange,
}: FontTunerProps) {
  const fontStyle: CSSProperties = {
    fontFamily: '"Seb Sans Survey", sans-serif',
    fontSize: `${config.size}px`,
    fontVariationSettings: `'wght' ${config.weight}, 'opsz' ${config.opsz}, 'XHGT' ${config.xheight}`,
    letterSpacing: `${config.tracking}em`,
    lineHeight: config.leading,
  }

  return (
    <div className={`font-tuner ${role}`}>
      <div className="proof-shell">
        <div className="proof-meta">
          <span>{role === 'display' ? 'Display proof' : 'Body proof'} · fixed at {config.size}px</span>
          <button type="button" className="text-button" onClick={() => onTextChange(defaultText)}>
            Reset text
          </button>
        </div>
        <textarea
          aria-label={`${role} sample text`}
          className="font-proof"
          rows={role === 'display' ? 2 : 9}
          style={fontStyle}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="tuner-controls">
        <div className="controls-heading">
          <strong>Adjust the type</strong>
          <span>Move one setting at a time until the text feels easiest to read.</span>
        </div>
        {controls[role].map((control) => (
          <label className="slider-control" key={control.key}>
            <span>
              {control.label}
              <output>{control.format(config[control.key])}</output>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={config[control.key]}
              onChange={(event) => {
                const value = Number(event.target.value)
                onConfigChange({ ...config, [control.key]: value }, control.key, value)
              }}
            />
          </label>
        ))}
        <button
          type="button"
          className="secondary-button reset-settings"
          onClick={() => onConfigChange(defaults, 'weight', defaults.weight)}
        >
          Reset all settings
        </button>
      </div>

      <Rating value={rating} onChange={onRatingChange} />
    </div>
  )
}
