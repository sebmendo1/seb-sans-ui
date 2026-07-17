interface RatingProps {
  value: number
  onChange: (value: number) => void
  label?: string
}

export function Rating({
  value,
  onChange,
  label = 'How easy is this to read?',
}: RatingProps) {
  return (
    <fieldset className="rating">
      <legend>{label}</legend>
      <div className="rating-scale">
        {Array.from({ length: 7 }, (_, index) => index + 1).map((score) => (
          <label key={score} className={value === score ? 'selected' : ''}>
            <input
              type="radio"
              name={label}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
            />
            <span>{score}</span>
          </label>
        ))}
      </div>
      <div className="rating-labels" aria-hidden="true">
        <span>Difficult</span>
        <span>Effortless</span>
      </div>
    </fieldset>
  )
}
