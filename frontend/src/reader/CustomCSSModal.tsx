import { useRef, useState } from 'react'

interface CustomCSSModalProps {
  isOpen: boolean
  onClose: () => void
  currentCSS: string
  onSave: (css: string) => boolean
  onReset: () => void
  error: string | null
}

export function CustomCSSModal({
  isOpen,
  onClose,
  currentCSS,
  onSave,
  onReset,
  error,
}: CustomCSSModalProps) {
  const [css, setCSS] = useState(currentCSS)
  const [activeTab, setActiveTab] = useState<'textarea' | 'upload'>('textarea')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleSave = () => {
    if (onSave(css)) {
      onClose()
    }
  }

  const handleReset = () => {
    setCSS('')
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
          <h2 style={styles.title}>Reader Custom CSS</h2>
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

          {error && <div style={styles.error}>{error}</div>}

          <details style={styles.guide}>
            <summary style={styles.guideSummary}>Available Selectors</summary>
            <div style={styles.guideContent}>
              <p><code>.reader-text</code> — Main text container</p>
              <p><code>.reader-ui</code> — Control bar at bottom</p>
              <p><code>.progress-text</code> — Character count display</p>
              <p><code>.font-size-btn</code> — Font size buttons</p>
              <p><code>.font-size-slider</code> — Font size slider</p>
              <p><code>h1, h2, h3, etc.</code> — Headings inside reader</p>
            </div>
          </details>
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
    maxWidth: '600px',
    maxHeight: '80vh',
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
    padding: '12px',
    backgroundColor: '#2d2d2d',
    color: '#e8e8e8',
    border: '1px solid #404040',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    resize: 'none' as const,
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
}
