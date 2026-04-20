import { useState, useEffect, useRef, lazy, Suspense } from 'react'
const ARIAModal = lazy(() => import('./ARIAModal').then(m => ({ default: m.ARIAModal })))
import { getAllReviews, getReviewStats, getDailyActivity, getSessionHistory, resetStats, awaitPendingSave, WordReview, ReviewStats, QuizSession } from '../../services/reviewStore'
import { getWord } from '../../services/dictionaryStore'
import { pushFull, pullState, exportJSON, importJSON, getLastSyncTime } from '../../services/syncService'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import './style.scss'

const STATUS_COLOR = {
  new:       '#4a4a5a',
  learning:  '#f59e0b',
  reviewing: '#5a9fd4',
  known:     '#4caf50',
} as const

const STATUS_LABEL = {
  new:       'New',
  learning:  'Learning',
  reviewing: 'Reviewing',
  known:     'Known',
} as const

const INTERVAL_BUCKETS = [
  { label: '1d',    max: 1 },
  { label: '2–3d',  max: 3 },
  { label: '4–7d',  max: 7 },
  { label: '1–2w',  max: 14 },
  { label: '2–4w',  max: 28 },
  { label: '1–3m',  max: 90 },
  { label: '3m+',   max: Infinity },
]

interface HardWord {
  baseForm: string
  surface: string
  reading: string
  difficulty: number
  total: number
}

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <div className="donut-empty">No data yet</div>

  const r = 54
  const circ = 2 * Math.PI * r
  const cx = 70
  const cy = 70

  let offset = 0
  const arcs = segments.map(seg => {
    const dash = (seg.value / total) * circ
    const gap = circ - dash
    const arc = { ...seg, dash, gap, offset }
    offset += dash
    return arc
  })

  return (
    <svg className="donut-chart" viewBox="0 0 140 140" width={140} height={140}>
      {arcs.filter(a => a.value > 0).map(arc => (
        <circle
          key={arc.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={18}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" className="donut-total">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="donut-label">words</text>
    </svg>
  )
}

function AccuracyRing({ correct, incorrect }: { correct: number; incorrect: number }) {
  const total = correct + incorrect
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="accuracy-ring-wrap">
      <svg viewBox="0 0 100 100" width={100} height={100}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#2d2d2d" strokeWidth={8} />
        <circle
          cx={50} cy={50} r={r}
          fill="none"
          stroke={pct >= 80 ? '#4caf50' : pct >= 60 ? '#f59e0b' : '#f44336'}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
        />
        <text x={50} y={46} textAnchor="middle" className="acc-pct">{pct}%</text>
        <text x={50} y={62} textAnchor="middle" className="acc-label">accuracy</text>
      </svg>
      <div className="accuracy-counts">
        <span className="acc-correct">✓ {correct.toLocaleString()}</span>
        <span className="acc-wrong">✗ {incorrect.toLocaleString()}</span>
      </div>
    </div>
  )
}

function IntervalHistogram({ reviews }: { reviews: WordReview[] }) {
  const active = reviews.filter(r => r.status !== 'new' && r.interval > 0)
  const buckets = INTERVAL_BUCKETS.map((b, i) => {
    const prev = i === 0 ? 0 : INTERVAL_BUCKETS[i - 1].max
    const count = active.filter(r => r.interval > prev && r.interval <= b.max).length
    return { ...b, count }
  })
  const max = Math.max(...buckets.map(b => b.count), 1)

  return (
    <div className="histogram">
      {buckets.map(b => (
        <div key={b.label} className="histogram-col">
          <div className="histogram-bar-wrap">
            <div
              className="histogram-bar"
              style={{ height: `${(b.count / max) * 100}%` }}
              title={`${b.count} words`}
            />
          </div>
          <span className="histogram-label">{b.label}</span>
          <span className="histogram-count">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

function DueTimeline({ reviews }: { reviews: WordReview[] }) {
  const now = Date.now()
  const day = 86400000
  const buckets = [
    { label: 'Today',     count: reviews.filter(r => r.status !== 'new' && r.dueDate <= now + day).length },
    { label: 'Tomorrow',  count: reviews.filter(r => r.status !== 'new' && r.dueDate > now + day && r.dueDate <= now + 2 * day).length },
    { label: 'This week', count: reviews.filter(r => r.status !== 'new' && r.dueDate > now + 2 * day && r.dueDate <= now + 7 * day).length },
    { label: 'Next week', count: reviews.filter(r => r.status !== 'new' && r.dueDate > now + 7 * day && r.dueDate <= now + 14 * day).length },
  ]

  return (
    <div className="due-timeline">
      {buckets.map(b => (
        <div key={b.label} className={`due-bucket${b.label === 'Today' ? ' due-bucket--today' : ''}`}>
          <span className="due-bucket__count">{b.count}</span>
          <span className="due-bucket__label">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

function ActivityHeatmap({ activity }: { activity: Record<string, number> }) {
  const WEEKS = 20
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // build grid: WEEKS cols × 7 rows, oldest top-left
  const startDay = new Date(today)
  startDay.setDate(today.getDate() - (WEEKS * 7 - 1))

  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const days: { date: string; count: number }[] = []
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(startDay)
    d.setDate(startDay.getDate() + i)
    const key = localDateStr(d)
    days.push({ date: key, count: activity[key] ?? 0 })
  }

  const maxCount = Math.max(...days.map(d => d.count), 1)

  // month labels: find first day of each month in range
  const monthLabels: { label: string; col: number }[] = []
  days.forEach((d, i) => {
    if (d.date.endsWith('-01') || i === 0) {
      const col = Math.floor(i / 7)
      const [y, m, day2] = d.date.split('-').map(Number)
      const label = new Date(y, m - 1, day2).toLocaleString('default', { month: 'short' })
      if (!monthLabels.length || monthLabels[monthLabels.length - 1].col !== col)
        monthLabels.push({ label, col })
    }
  })

  function cellColor(count: number) {
    if (count === 0) return '#1a1a1a'
    const t = Math.min(count / maxCount, 1)
    // pale blue → vivid blue
    const l = Math.round(55 - t * 30)
    const s = Math.round(40 + t * 40)
    return `hsl(210, ${s}%, ${l}%)`
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-months">
        {monthLabels.map((m, i) => (
          <span key={i} className="heatmap-month" style={{ gridColumnStart: m.col + 1 }}>{m.label}</span>
        ))}
      </div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
        {Array.from({ length: WEEKS }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const cell = days[w * 7 + d]
            return (
              <div
                key={`${w}-${d}`}
                className="heatmap-cell"
                style={{ background: cellColor(cell.count) }}
                title={cell.count > 0 ? `${cell.date}: ${cell.count} reviews` : cell.date}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function SessionHistory({ sessions }: { sessions: QuizSession[] }) {
  const [expanded, setExpanded] = useState(false)
  if (sessions.length === 0) return null
  return (
    <div className="stats-card">
      <div className="stats-card__title-row">
        <h3 className="stats-card__title">Session history</h3>
        {sessions.length > 5 && (
          <button className="session-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'show less' : `+${sessions.length - 5} more`}
          </button>
        )}
      </div>
      <div className="session-list">
        {sessions.slice(0, expanded ? 30 : 5).map(s => {
          const d = new Date(s.startedAt)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
          const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
          const acc = s.totalCards > 0 ? Math.round((s.correct / s.totalCards) * 100) : 0
          const mins = Math.round(s.durationMs / 60000)
          return (
            <div key={s.id} className="session-row">
              <div className="session-row__time">
                <span className="session-date">{dateStr}</span>
                <span className="session-time">{timeStr}</span>
              </div>
              <div className="session-row__modes">
                {s.endless
                  ? <span className="session-mode session-mode--endless">∞ endless</span>
                  : <span className={`session-mode session-mode--${s.mode}`}>{s.mode}</span>
                }
                {s.hardcore && <span className="session-mode session-mode--hardcore">💀</span>}
              </div>
              <span className="session-cards">{s.totalCards} cards</span>
              <span className={`session-acc${acc >= 80 ? ' session-acc--good' : acc >= 60 ? ' session-acc--ok' : ' session-acc--bad'}`}>{acc}%</span>
              <span className="session-dur">{mins > 0 ? `${mins}m` : '<1m'}</span>
              {s.filters && (
                <div className="session-filters">
                  {s.filters.frequencySource && <span>{s.filters.frequencySource}</span>}
                  {s.filters.minRank && <span>#{s.filters.minRank}</span>}
                  {s.filters.maxRank && <span>→#{s.filters.maxRank}</span>}
                  {s.filters.frequencyTag && <span>{s.filters.frequencyTag}</span>}
                  {s.filters.statusFilter && s.filters.statusFilter.split(',').map(st => (
                    <span key={st} className={`session-filter-status session-filter-status--${st}`}>{st}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function StatsView() {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [reviews, setReviews] = useState<WordReview[]>([])
  const [hardWords, setHardWords] = useState<HardWord[]>([])
  const [activity, setActivity] = useState<Record<string, number>>({})
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [showARIA, setShowARIA] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [statsTab, setStatsTab] = useState<'endless' | 'hardcore'>('endless')
  const [tabDir, setTabDir] = useState<'up' | 'down'>('up')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      await awaitPendingSave()
      setLoading(true)
      try {
        const [s, all, act, hist] = await Promise.all([getReviewStats(), getAllReviews(), getDailyActivity(), getSessionHistory()])
        setStats(s)
        setReviews(all)
        setActivity(act)
        setSessions(hist)

        const withHistory = all.filter(r => r.correctCount + r.incorrectCount >= 3)
        withHistory.sort((a, b) => {
          const da = a.incorrectCount / (a.correctCount + a.incorrectCount)
          const db2 = b.incorrectCount / (b.correctCount + b.incorrectCount)
          return db2 - da
        })
        const top = withHistory.slice(0, 10)
        const enriched = await Promise.all(top.map(async r => {
          const word = await getWord(r.baseForm)
          return {
            baseForm: r.baseForm,
            surface: word?.surface ?? r.baseForm,
            reading: word?.reading ?? '',
            difficulty: r.incorrectCount / (r.correctCount + r.incorrectCount),
            total: r.correctCount + r.incorrectCount,
          }
        }))
        setHardWords(enriched)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const withSync = async (fn: () => Promise<void>, successMsg: string) => {
    setSyncStatus('syncing')
    setSyncMsg(null)
    try {
      await fn()
      setSyncStatus('ok')
      setSyncMsg(successMsg)
    } catch (e) {
      setSyncStatus('error')
      setSyncMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleBackup = () => withSync(pushFull, 'Backed up to server')
  const handleRestore = async () => {
    if (!confirm('Restore from server? This overwrites your local data.')) return
    await withSync(pullState, 'Restored from server')
    window.location.reload()
  }
  const handleExportJSON = () => withSync(exportJSON, 'Downloaded')
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Import backup? This overwrites your local data.')) return
    await withSync(() => importJSON(file), 'Imported successfully')
    window.location.reload()
  }

  const BackupCard = (
    <div className="stats-card">
      <h3 className="stats-card__title">Backup &amp; restore</h3>
      <div className="backup-grid">
        <button className="backup-btn" onClick={handleBackup} disabled={syncStatus === 'syncing'}>
          <CloudUploadIcon sx={{ fontSize: 18 }} /> Backup to server
        </button>
        <button className="backup-btn" onClick={handleRestore} disabled={syncStatus === 'syncing'}>
          <CloudDownloadIcon sx={{ fontSize: 18 }} /> Restore from server
        </button>
        <button className="backup-btn" onClick={handleExportJSON} disabled={syncStatus === 'syncing'}>
          <FileDownloadIcon sx={{ fontSize: 18 }} /> Export JSON
        </button>
        <button className="backup-btn" onClick={() => fileInputRef.current?.click()} disabled={syncStatus === 'syncing'}>
          <FileUploadIcon sx={{ fontSize: 18 }} /> Import JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON} />
      </div>
      {syncMsg && (
        <p className={`backup-status backup-status--${syncStatus}`}>{syncMsg}</p>
      )}
      {getLastSyncTime() && !syncMsg && (
        <p className="backup-last-sync">Last server sync: {new Date(getLastSyncTime()!).toLocaleString()}</p>
      )}
    </div>
  )

  const handleReset = async () => {
    if (!confirm('Reset all quiz stats? This clears review history, streaks, and activity. Cannot be undone.')) return
    await resetStats()
    setStats(null)
    setReviews([])
    setHardWords([])
    setActivity({})
  }

  if (loading) return <div className="stats-view stats-loading">Loading...</div>

  if (!stats || stats.total === 0) {
    return (
      <div className="stats-view">
        <div className="stats-empty-msg">
          <p>No review data yet.</p>
          <p>Mine some books and start quizzing!</p>
        </div>
        {BackupCard}
      </div>
    )
  }

  const donutSegments = (
    ['known', 'reviewing', 'learning', 'new'] as const
  ).map(s => ({
    value: stats[`${s}Count` as keyof ReviewStats] as number,
    color: STATUS_COLOR[s],
    label: STATUS_LABEL[s],
  }))

  return (
    <div className="stats-view">
      {showARIA && (
        <Suspense fallback={null}>
          <ARIAModal onClose={() => setShowARIA(false)} />
        </Suspense>
      )}

      {/* Row 1: donut + accuracy + streak */}
      <div className="stats-row stats-row--top">
        <div className="stats-card stats-card--donut">
          <div className="stats-card__title-row">
            <h3 className="stats-card__title">Knowledge</h3>
            <button className="aria-info-btn" onClick={() => setShowARIA(true)} title="How the algorithm works">
              <InfoOutlinedIcon sx={{ fontSize: 15 }} /> ARIA
            </button>
          </div>
          <DonutChart segments={donutSegments} />
          <div className="donut-legend">
            {donutSegments.map(s => (
              <div key={s.label} className="legend-item">
                <span className="legend-dot" style={{ background: s.color }} />
                <span className="legend-label">{s.label}</span>
                <span className="legend-value">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-card-col">
          <div className="stats-card stats-card--accuracy">
            <h3 className="stats-card__title">Accuracy</h3>
            <AccuracyRing correct={stats.totalCorrect} incorrect={stats.totalIncorrect} />
          </div>

          <div className="stats-card stats-card--streak">
            <LocalFireDepartmentIcon sx={{ fontSize: 28, color: stats.dailyStreak > 0 ? '#f59e0b' : '#444' }} />
            <div className="streak-number" style={{ color: stats.dailyStreak > 0 ? '#f59e0b' : '#555' }}>
              {stats.dailyStreak}
            </div>
            <div className="streak-label">day streak</div>
            {stats.lastStudiedDate && (
              <div className="streak-date">last: {stats.lastStudiedDate}</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: interval histogram */}
      <div className="stats-card">
        <h3 className="stats-card__title">Interval distribution</h3>
        <IntervalHistogram reviews={reviews} />
      </div>

      {/* Row 3: due timeline */}
      <div className="stats-card">
        <h3 className="stats-card__title">Due timeline</h3>
        <DueTimeline reviews={reviews} />
      </div>

      {/* Row 4: hardest words */}
      {hardWords.length > 0 && (
        <div className="stats-card">
          <h3 className="stats-card__title">Hardest words</h3>
          <div className="hard-words">
            {hardWords.map(w => (
              <div key={w.baseForm} className="hard-word-row">
                <span className="hard-word-surface">{w.surface}</span>
                <span className="hard-word-reading">{w.reading}</span>
                <div className="hard-word-bar-wrap">
                  <div
                    className="hard-word-bar"
                    style={{ width: `${w.difficulty * 100}%` }}
                  />
                </div>
                <span className="hard-word-pct">{Math.round(w.difficulty * 100)}%</span>
                <span className="hard-word-total">{w.total}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="stats-card">
        <h3 className="stats-card__title">Activity — last 20 weeks</h3>
        <ActivityHeatmap activity={activity} />
      </div>

      {/* Endless / Hardcore stats */}
      {(() => {
        const endlessSessions  = sessions.filter(s => s.endless)
        const hardcoreSessions = sessions.filter(s => s.hardcore)
        if (endlessSessions.length === 0 && hardcoreSessions.length === 0) return null

        const hasBoth = endlessSessions.length > 0 && hardcoreSessions.length > 0
        const activeTab = hasBoth ? statsTab : (endlessSessions.length > 0 ? 'endless' : 'hardcore')

        // ── Endless content ──────────────────────────────────────────────────
        const EndlessContent = () => {
          const ss          = endlessSessions
          const totalAnswered  = ss.reduce((a, x) => a + x.totalCards, 0)
          const totalCorrect   = ss.reduce((a, x) => a + x.correct, 0)
          const totalWrong     = totalAnswered - totalCorrect
          const accuracy       = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0
          const topStreak      = Math.max(...ss.map(s => s.bestStreak ?? 0))
          const sessCount      = ss.length
          const wordsCovered   = reviews.filter(r => r.correctCount > 0).length
          const wordTotal      = reviews.length
          const coverage       = wordTotal > 0 ? Math.round(wordsCovered / wordTotal * 100) : 0
          const avgPerSession  = Math.round(totalAnswered / sessCount)
          const longestSession = Math.max(...ss.map(s => s.totalCards))
          const recent         = [...ss].slice(0, 15).reverse()
          return (
            <>
              <div className="endless-grid">
                <div className="endless-stat"><span className="endless-stat__value">{totalAnswered.toLocaleString()}</span><span className="endless-stat__label">answered</span></div>
                <div className="endless-stat endless-stat--correct"><span className="endless-stat__value">{totalCorrect.toLocaleString()}</span><span className="endless-stat__label">correct</span></div>
                <div className="endless-stat endless-stat--wrong"><span className="endless-stat__value">{totalWrong.toLocaleString()}</span><span className="endless-stat__label">wrong</span></div>
                <div className="endless-stat endless-stat--acc"><span className="endless-stat__value">{accuracy}%</span><span className="endless-stat__label">accuracy</span></div>
                <div className="endless-stat endless-stat--streak"><span className="endless-stat__value">{topStreak}</span><span className="endless-stat__label">best streak</span></div>
                <div className="endless-stat"><span className="endless-stat__value">{sessCount}</span><span className="endless-stat__label">sessions</span></div>
                <div className="endless-stat"><span className="endless-stat__value">{avgPerSession}</span><span className="endless-stat__label">avg / session</span></div>
                <div className="endless-stat"><span className="endless-stat__value">{longestSession}</span><span className="endless-stat__label">longest</span></div>
              </div>
              {recent.length >= 2 && (
                <div className="endless-charts">
                  <div className="endless-chart">
                    <div className="endless-chart__title">Accuracy per session</div>
                    <div className="endless-chart__bars">
                      {recent.map(s => {
                        const acc = s.totalCards > 0 ? Math.round(s.correct / s.totalCards * 100) : 0
                        const color = acc >= 80 ? '#4caf50' : acc >= 60 ? '#f59e0b' : '#f44336'
                        return (
                          <div key={s.id} className="endless-chart__col" title={`${new Date(s.startedAt).toLocaleDateString()}: ${acc}%`}>
                            <div className="endless-chart__bar-wrap"><div className="endless-chart__bar" style={{ height: `${acc}%`, background: color }} /></div>
                            <span className="endless-chart__val">{acc}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="endless-chart">
                    <div className="endless-chart__title">Cards per session</div>
                    <div className="endless-chart__bars">
                      {recent.map(s => {
                        const pct = longestSession > 0 ? (s.totalCards / longestSession) * 100 : 0
                        return (
                          <div key={s.id} className="endless-chart__col" title={`${new Date(s.startedAt).toLocaleDateString()}: ${s.totalCards} cards`}>
                            <div className="endless-chart__bar-wrap"><div className="endless-chart__bar" style={{ height: `${pct}%`, background: '#5a9fd4' }} /></div>
                            <span className="endless-chart__val">{s.totalCards}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div className="endless-coverage">
                <div className="endless-coverage__header">
                  <span>Word pool coverage</span>
                  <span className="endless-coverage__pct">{wordsCovered} / {wordTotal} words ({coverage}%)</span>
                </div>
                <div className="endless-coverage__bar"><div className="endless-coverage__fill" style={{ width: `${coverage}%` }} /></div>
              </div>
            </>
          )
        }

        // ── Hardcore content ─────────────────────────────────────────────────
        const HardcoreContent = () => {
          const ss           = hardcoreSessions
          const totalAnswered = ss.reduce((a, x) => a + x.totalCards, 0)
          const totalCorrect  = ss.reduce((a, x) => a + x.correct, 0)
          const totalWrong    = totalAnswered - totalCorrect
          const accuracy      = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0
          const topStreak     = Math.max(...ss.map(s => s.bestStreak ?? 0))
          const sessCount     = ss.length
          const avgPerSession = Math.round(totalCorrect / sessCount)
          const bestScore     = Math.max(...ss.map(s => s.correct))
          const recent        = [...ss].slice(0, 15).reverse()
          return (
            <>
              <div className="endless-grid endless-grid--3">
                <div className="endless-stat"><span className="endless-stat__value">{sessCount}</span><span className="endless-stat__label">sessions</span></div>
                <div className="endless-stat endless-stat--streak"><span className="endless-stat__value">{topStreak}</span><span className="endless-stat__label">best streak</span></div>
                <div className="endless-stat"><span className="endless-stat__value">{avgPerSession}</span><span className="endless-stat__label">avg score</span></div>
              </div>
              {(() => {
                const days14: { label: string; score: number }[] = []
                for (let i = 13; i >= 0; i--) {
                  const d = new Date()
                  d.setHours(0, 0, 0, 0)
                  d.setDate(d.getDate() - i)
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  const daySessions = ss.filter(s => {
                    const sd = new Date(s.startedAt)
                    const sk = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`
                    return sk === key
                  })
                  const score = daySessions.length > 0 ? Math.max(...daySessions.map(s => s.correct)) : 0
                  const shortLabel = i === 0 ? 'today' : i === 1 ? 'yday' : `${d.getMonth()+1}/${d.getDate()}`
                  days14.push({ label: shortLabel, score })
                }
                const maxScore = Math.max(...days14.map(d => d.score), 1)
                return (
                  <div className="endless-charts">
                    <div className="endless-chart">
                      <div className="endless-chart__title">Best score — last 14 days</div>
                      <div className="endless-chart__bars">
                        {days14.map((d, i) => {
                          const pct = (d.score / maxScore) * 100
                          const color = d.score >= bestScore * 0.8 ? '#4caf50' : d.score >= bestScore * 0.5 ? '#f59e0b' : d.score > 0 ? '#f44336' : '#1e1e1e'
                          return (
                            <div key={i} className="endless-chart__col" title={`${d.label}: ${d.score > 0 ? d.score + ' correct' : 'no session'}`}>
                              <div className="endless-chart__bar-wrap">
                                <div className="endless-chart__bar" style={{ height: `${Math.max(pct, d.score > 0 ? 4 : 0)}%`, background: color }} />
                              </div>
                              <span className="endless-chart__val">{d.score > 0 ? d.score : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </>
          )
        }

        const switchTab = (tab: 'endless' | 'hardcore') => {
          setTabDir(tab === 'hardcore' ? 'up' : 'down')
          setStatsTab(tab)
        }

        return (
          <div className="stats-card">
            <div className="stats-card__title-row">
              {hasBoth ? (
                <div className="stats-mode-tabs">
                  <button
                    className={`stats-mode-tab${activeTab === 'endless' ? ' stats-mode-tab--active' : ''}`}
                    onClick={() => switchTab('endless')}
                  >∞ Endless</button>
                  <button
                    className={`stats-mode-tab stats-mode-tab--hardcore${activeTab === 'hardcore' ? ' stats-mode-tab--active' : ''}`}
                    onClick={() => switchTab('hardcore')}
                  >💀 Hardcore</button>
                </div>
              ) : (
                <h3 className="stats-card__title">{activeTab === 'endless' ? '∞ Endless' : '💀 Hardcore'}</h3>
              )}
            </div>
            <div key={activeTab} className={`mode-content mode-content--${tabDir}`}>
              {activeTab === 'endless' ? <EndlessContent /> : <HardcoreContent />}
            </div>
          </div>
        )
      })()}

      {/* Session history */}
      <SessionHistory sessions={sessions} />

      {/* Backup & restore */}
      {BackupCard}

      {/* Reset */}
      <div className="stats-reset">
        <button className="stats-reset-btn" onClick={handleReset}>
          <DeleteForeverIcon sx={{ fontSize: 16 }} />
          Reset all stats
        </button>
      </div>
    </div>
  )
}
