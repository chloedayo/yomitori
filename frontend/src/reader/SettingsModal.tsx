import { useRef, useState, useEffect } from 'react'
import { AnnotationSettings, AnnotationContentColors } from '../hooks/useAnnotationSettings'

interface FrequencySource {
  id: number
  name: string
  isNumeric: boolean
}

interface DictionaryImport {
  id: string
  name: string
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentCSS: string
  onSave: (css: string) => boolean
  onReset: () => void
  error: string | null
  frequencySource: string | null
  onFrequencySourceChange: (source: string | null) => void
  minFrequencyRank: number | null
  onMinFrequencyRankChange: (rank: number | null) => void
  maxFrequencyRank: number | null
  onMaxFrequencyRankChange: (rank: number | null) => void
  frequencyTagFilter: string | null
  onFrequencyTagFilterChange: (tag: string | null) => void
  frequencySources: FrequencySource[]
  definitionDicts: DictionaryImport[]
  primaryDictName: string | null
  onPrimaryDictNameChange: (name: string | null) => void
  annotationSettings: AnnotationSettings
  onAnnotationSettingsChange: (patch: Partial<AnnotationSettings>) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  currentCSS,
  onSave,
  onReset,
  error,
  frequencySource,
  onFrequencySourceChange,
  minFrequencyRank,
  onMinFrequencyRankChange,
  maxFrequencyRank,
  onMaxFrequencyRankChange,
  frequencyTagFilter,
  onFrequencyTagFilterChange,
  frequencySources,
  definitionDicts,
  primaryDictName,
  onPrimaryDictNameChange,
  annotationSettings,
  onAnnotationSettingsChange,
}: SettingsModalProps) {
  const [css, setCSS] = useState(currentCSS)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'textarea' | 'upload' | 'frequency' | 'annotations'>('textarea')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      if (css.trim()) {
        const isValid = validateCSS(css)
        if (!isValid) {
          setLiveError('Invalid CSS syntax')
        } else {
          setLiveError(null)
          onSave(css)
        }
      } else {
        setLiveError(null)
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [css, isOpen])

  const validateCSS = (cssText: string): boolean => {
    try {
      const style = document.createElement('style')
      style.textContent = cssText
      document.head.appendChild(style)
      document.head.removeChild(style)
      return true
    } catch {
      return false
    }
  }

  if (!isOpen) return null

  const handleSave = () => {
    if (onSave(css)) {
      onClose()
    }
  }

  const handleReset = () => {
    setCSS('')
    setLiveError(null)
    onReset()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setCSS(content)
      }
      reader.readAsText(file)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'textarea' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('textarea')}
          >
            CSS Editor
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'upload' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('upload')}
          >
            Upload File
          </button>
          <button
            className="settings-tab-frequency"
            style={{
              ...styles.tab,
              ...(activeTab === 'frequency' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('frequency')}
          >
            Mining Filter
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'annotations' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('annotations')}
          >
            Annotations
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'textarea' ? (
            <textarea
              value={css}
              onChange={(e) => setCSS(e.target.value)}
              style={styles.textarea}
              placeholder="Enter custom CSS here..."
              spellCheck="false"
            />
          ) : activeTab === 'frequency' ? (
            <div style={styles.frequencySettings}>
              {definitionDicts.length > 0 && (
                <div style={styles.settingGroup}>
                  <label style={styles.label}>Primary Definition Dictionary</label>
                  <select
                    value={primaryDictName || ''}
                    onChange={(e) => onPrimaryDictNameChange(e.target.value || null)}
                    style={styles.select}
                  >
                    <option value="">No preference</option>
                    {definitionDicts.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <p style={styles.hint}>This dictionary's definition appears first when mining and in popup lookups.</p>
                </div>
              )}
              <div style={styles.settingGroup}>
                <label style={styles.label}>Frequency Dictionary Source</label>
                <select
                  value={frequencySource || ''}
                  onChange={(e) => onFrequencySourceChange(e.target.value || null)}
                  style={styles.select}
                >
                  <option value="">No filter</option>
                  {frequencySources.map((source) => (
                    <option key={source.id} value={source.name}>{source.name}</option>
                  ))}
                </select>
              </div>

              {frequencySource && (() => {
                const selectedSource = frequencySources.find(s => s.name === frequencySource)
                if (!selectedSource) return null
                if (selectedSource.isNumeric === false) {
                  return (
                    <div style={styles.settingGroup}>
                      <div style={styles.nonNumericWarning}>
                        ⚠ This frequency dictionary uses labels, not numeric ranks. Filtering uses exact match instead of a range.
                      </div>
                      <label style={styles.label}>Match Tag</label>
                      <input
                        type="text"
                        value={frequencyTagFilter ?? ''}
                        onChange={(e) => onFrequencyTagFilterChange(e.target.value || null)}
                        style={styles.numberInput}
                        placeholder="e.g. A1, idol, rare — leave empty to include all"
                      />
                      <p style={styles.hint}>Only words with this exact frequency label will be included when mining.</p>
                    </div>
                  )
                }
                return (
                  <div style={styles.settingGroup}>
                    <label style={styles.label}>Frequency Range</label>
                    <div style={styles.rangeInputs}>
                      <div>
                        <label style={styles.rangeLabel}>Min Rank</label>
                        <input
                          type="number"
                          value={minFrequencyRank ?? ''}
                          onChange={(e) => onMinFrequencyRankChange(e.target.value ? parseInt(e.target.value) : null)}
                          style={styles.numberInput}
                          placeholder="Leave empty for no minimum"
                        />
                      </div>
                      <div>
                        <label style={styles.rangeLabel}>Max Rank</label>
                        <input
                          type="number"
                          value={maxFrequencyRank ?? ''}
                          onChange={(e) => onMaxFrequencyRankChange(e.target.value ? parseInt(e.target.value) : null)}
                          style={styles.numberInput}
                          placeholder="Leave empty for no maximum"
                        />
                      </div>
                    </div>
                    <p style={styles.hint}>Lower frequency rank = more common word. Leave either field empty to skip that bound.</p>
                  </div>
                )
              })()}
            </div>
          ) : activeTab === 'annotations' ? (
            <div className="settings-annotations" style={{ padding: '12px 0' }}>
              <div className="settings-section">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={annotationSettings.contentColorsEnabled}
                    onChange={e => onAnnotationSettingsChange({ contentColorsEnabled: e.target.checked })}
                  />
                  Custom content colors
                </label>
                {annotationSettings.contentColorsEnabled && (
                  <div className="settings-color-grid">
                    {(Object.keys(annotationSettings.contentColors) as (keyof AnnotationContentColors)[]).map(key => (
                      <label key={key} className="settings-color-row">
                        <span>{key}</span>
                        <input
                          type="color"
                          value={annotationSettings.contentColors[key]}
                          onChange={e => onAnnotationSettingsChange({
                            contentColors: { ...annotationSettings.contentColors, [key]: e.target.value }
                          })}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".css"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                style={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose CSS File
              </button>
              {css && <p style={styles.uploadInfo}>✓ CSS loaded</p>}
            </div>
          )}

          {(liveError || error) && (
            <div style={styles.error}>{liveError || error}</div>
          )}

          {activeTab !== 'frequency' && activeTab !== 'annotations' && <details style={styles.guide}>
            <summary style={styles.guideSummary}>Available Selectors</summary>
            <div style={styles.guideContent}>
              <p><code>.reader-text</code> — Main text container</p>
              <p><code>.reader-ui</code> — Control bar at bottom</p>
              <p><code>.progress-text</code> — Character count display</p>
              <p><code>.font-size-btn</code> — Font size buttons</p>
              <p><code>.font-size-slider</code> — Font size slider</p>
              <p><code>h1, h2, h3, etc.</code> — Headings inside reader</p>
            </div>
          </details>}
        </div>

        <div style={styles.buttons}>
          <button style={styles.resetBtn} onClick={handleReset}>
            Reset
          </button>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.saveBtn} onClick={handleSave}>
            Validate & Save
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#e8e8e8',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#a8a8a8',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #404040',
    backgroundColor: '#0f0f0f',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    color: '#a8a8a8',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    fontSize: '14px',
  },
  tabActive: {
    color: '#e8e8e8',
    borderBottomColor: '#5a9fd4',
  },
  content: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  textarea: {
    flex: 1,
    minHeight: '400px',
    padding: '16px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    resize: 'none' as const,
    overflow: 'auto' as const,
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px 20px',
  },
  uploadBtn: {
    padding: '12px 24px',
    backgroundColor: '#5a9fd4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  uploadInfo: {
    color: '#5a9fd4',
    fontSize: '14px',
    margin: 0,
  },
  error: {
    backgroundColor: '#3a2d2d',
    color: '#ff8888',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '13px',
    border: '1px solid #5a4040',
  },
  guide: {
    marginTop: '8px',
  },
  guideSummary: {
    cursor: 'pointer',
    color: '#a8a8a8',
    padding: '8px 0',
    userSelect: 'none' as const,
  },
  guideContent: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#a8a8a8',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #404040',
    justifyContent: 'flex-end',
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.2s',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.2s',
  },
  saveBtn: {
    padding: '8px 16px',
    backgroundColor: '#5a9fd4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.2s',
  },
  frequencySettings: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    color: '#a8a8a8',
    fontSize: '13px',
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  rangeInputs: {
    display: 'flex',
    gap: '16px',
  },
  rangeLabel: {
    color: '#808080',
    fontSize: '12px',
    display: 'block',
    marginBottom: '4px',
  },
  numberInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    fontSize: '13px',
  },
  hint: {
    color: '#808080',
    fontSize: '12px',
    margin: '8px 0 0 0',
    fontStyle: 'italic' as const,
  },
  nonNumericWarning: {
    backgroundColor: '#3a3020',
    color: '#d4a843',
    border: '1px solid #5a4a20',
    borderRadius: '4px',
    padding: '10px 12px',
    fontSize: '12px',
  },
}
