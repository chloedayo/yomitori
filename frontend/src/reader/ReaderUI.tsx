interface ReaderUIProps {
  currentCharPos: number
  totalChars: number
  fontSize: number
  onFontSizeChange: (size: number) => void
}

export function ReaderUI({
  currentCharPos,
  totalChars,
  fontSize,
  onFontSizeChange,
}: ReaderUIProps) {

  const handleFontIncrease = () => {
    if (fontSize < 64) {
      onFontSizeChange(fontSize + 1)
    }
  }

  const handleFontDecrease = () => {
    if (fontSize > 12) {
      onFontSizeChange(fontSize - 1)
    }
  }

  return (
    <div className="reader-ui">
      <div className="progress-text">
        {Math.max(0, currentCharPos*-1).toLocaleString()} / {totalChars.toLocaleString()}
      </div>

      <div className="font-size-section">
        <button
          className="font-size-btn"
          onClick={handleFontDecrease}
          disabled={fontSize <= 12}
        >
          A−
        </button>
        <input
          type="range"
          min="12"
          max="64"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="font-size-slider"
        />
        <button
          className="font-size-btn"
          onClick={handleFontIncrease}
          disabled={fontSize >= 64}
        >
          A+
        </button>
        <span style={{ fontSize: '12px', color: '#a8a8a8', marginLeft: '8px' }}>
          {fontSize}px
        </span>
      </div>
    </div>
  )
}
