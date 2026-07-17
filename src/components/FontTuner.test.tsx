import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FontConfig } from '../types'
import { FontTuner } from './FontTuner'

const config: FontConfig = {
  size: 36,
  weight: 660,
  opsz: 30,
  tracking: -0.015,
  leading: 1.1,
  xheight: 100,
}

describe('FontTuner', () => {
  it('renders all six controls and reports slider changes', () => {
    const onConfigChange = vi.fn()
    render(
      <FontTuner
        role="display"
        config={config}
        defaults={config}
        text="Readable"
        defaultText="Readable"
        rating={4}
        onConfigChange={onConfigChange}
        onTextChange={vi.fn()}
        onRatingChange={vi.fn()}
      />,
    )
    expect(screen.getByText('X-height')).toBeInTheDocument()
    expect(screen.getAllByRole('slider')).toHaveLength(5)
    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: 700 } })
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 700 }),
      'weight',
      700,
    )
  })

  it('keeps the sample editable and exposes a legibility scale', () => {
    const onTextChange = vi.fn()
    const onRatingChange = vi.fn()
    render(
      <FontTuner
        role="display"
        config={config}
        defaults={config}
        text="Readable"
        defaultText="Readable"
        rating={4}
        onConfigChange={vi.fn()}
        onTextChange={onTextChange}
        onRatingChange={onRatingChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('display sample text'), {
      target: { value: 'Edited sample' },
    })
    fireEvent.click(screen.getByLabelText('7'))
    expect(onTextChange).toHaveBeenCalledWith('Edited sample')
    expect(onRatingChange).toHaveBeenCalledWith(7)
  })
})
