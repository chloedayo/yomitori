import { useState, useEffect, useRef, useCallback } from 'react'
import { toHiragana as wanaToHiragana } from 'wanakana'
import {
  getDueCards,
  submitAnswer,
  getReviewStats,
  syncWordsFromDictionary,
  saveSession,
  WordReview,
  ReviewStats,
  QuizSession,
} from '../../services/reviewStore'
import { getAllWords, getWord, DictionaryWord } from '../../services/dictionaryStore'
import { useProxy } from '../../hooks/useProxy'
import { pushReviews } from '../../services/syncService'
import QuizIcon from '@mui/icons-material/Quiz'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import TuneIcon from '@mui/icons-material/Tune'
import './style.scss'

type Screen = 'config' | 'quiz' | 'results'
type QuizMode = 'scheduled' | 'custom'

interface FrequencySource { id: number; name: string; isNumeric: boolean }

interface QuizCard {
  review: WordReview
  word: DictionaryWord
}

interface SessionResult {
  card: QuizCard
  correct: boolean
  userInput: string
  timeRatio: number
}

const TIME_LIMITS = [5, 10, 15, 20, 30, 60] as const
const STATUS_OPTIONS = ['new', 'learning', 'reviewing', 'known'] as const

function normalizeReading(r: string): string {
  return wanaToHiragana(r.trim().replace(/\s+/g, ''), { passRomaji: false })
}

function TimerArc({ ratio, timeLimit }: { ratio: number; timeLimit: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = circ * Math.max(0, Math.min(1, ratio))
  const hue = Math.round(ratio * 120)
  const color = `hsl(${hue}, 80%, 55%)`
  return (
    <svg className="timer-arc" viewBox="0 0 88 88" width={88} height={88}>
      <circle cx={44} cy={44} r={r} className="timer-arc__track" />
      <circle
        cx={44} cy={44} r={r}
        className="timer-arc__fill"
        style={{
          stroke: color,
          strokeDasharray: `${dash} ${circ}`,
          transform: 'rotate(-90deg)',
          transformOrigin: '44px 44px',
        }}
      />
      <text x={44} y={49} textAnchor="middle" className="timer-arc__text">
        {Math.ceil(ratio * timeLimit)}
      </text>
    </svg>
  )
}

export function QuizView() {
  const [screen, setScreen] = useState<Screen>('config')
  const [mode, setMode] = useState<QuizMode>('scheduled')
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [sessionSize, setSessionSize] = useState<number | ''>(25)
  const [timeLimit, setTimeLimit] = useState(15)
  const [isLooping, setIsLooping] = useState(false)

  // custom mode filters
  const [freqSources, setFreqSources] = useState<FrequencySource[]>([])
  const [customFreqSource, setCustomFreqSource] = useState<string>('')
  const [customMinRank, setCustomMinRank] = useState<number | ''>('')
  const [customMaxRank, setCustomMaxRank] = useState<number | ''>('')
  const [customFreqTag, setCustomFreqTag] = useState('')
  const [customStatus, setCustomStatus] = useState<Set<WordReview['status']>>(new Set())

  const [cards, setCards] = useState<QuizCard[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const [input, setInput] = useState('')
  const [timerRatio, setTimerRatio] = useState(1)
  const [phase, setPhase] = useState<'answering' | 'result'>('answering')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<SessionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [noWords, setNoWords] = useState(false)
  const [sessionMode, setSessionMode] = useState<QuizMode>('scheduled')
  const [_sessionFilters, setSessionFilters] = useState<QuizSession['filters']>()
  const [isEndless, setIsEndless] = useState(false)
  const [isHardcore, setIsHardcore] = useState(false)
  const [shakeOnWrong, setShakeOnWrong] = useState(() => localStorage.getItem('quiz-shake') !== 'false')
  const [sessionStreak, setSessionStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastCorrectRef = useRef<boolean | null>(null)
  const sessionStartRef = useRef<number>(0)
  const sessionMetaRef = useRef<{ endless: boolean; hardcore: boolean; mode: QuizMode; filters: QuizSession['filters'] | undefined } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  const allWordsPoolRef = useRef<DictionaryWord[]>([])

  useEffect(() => {
    getReviewStats().then(setStats).catch(() => {})
    const url = useProxy('/api/dictionary/frequency-sources')
    fetch(url).then(r => r.ok ? r.json() : []).then(setFreqSources).catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem('quiz-shake', String(shakeOnWrong))
  }, [shakeOnWrong])

  const selectedSource = freqSources.find(s => s.name === customFreqSource)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const handleExit = useCallback(async () => {
    stopTimer()
    if (phase === 'answering' && !submittedRef.current) {
      submittedRef.current = true
      const card = cards[cardIndex]
      if (card) {
        await submitAnswer(card.review.baseForm, false, 1.5)
        setResults(prev => [...prev, { card, correct: false, userInput: '', timeRatio: 1.5 }])
      }
    }
    getReviewStats().then(s => { setStats(s); setScreen('results') }).catch(() => setScreen('results'))
  }, [phase, cards, cardIndex, stopTimer])

  const handleAnswer = useCallback(async (forced?: boolean) => {
    if (submittedRef.current) return
    submittedRef.current = true
    stopTimer()

    const card = cards[cardIndex]
    if (!card) return

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const timeRatio = Math.min(elapsed / timeLimit, 1.5)
    const userInput = forced ? '' : input.trim()
    const correct = !forced && normalizeReading(userInput) === normalizeReading(card.word.reading)

    setLastCorrect(correct)
    lastCorrectRef.current = correct
    setPhase('result')
    setSessionStreak(prev => {
      const next = correct ? prev + 1 : 0
      setBestStreak(best => Math.max(best, next))
      return next
    })
    await submitAnswer(card.review.baseForm, correct, timeRatio)
    setResults(prev => [...prev, { card, correct, userInput, timeRatio }])
  }, [cards, cardIndex, input, timeLimit, stopTimer])

  const startTimer = useCallback(() => {
    stopTimer()
    startTimeRef.current = Date.now()
    setTimerRatio(1)
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const ratio = Math.max(0, 1 - elapsed / timeLimit)
      setTimerRatio(ratio)
      if (ratio <= 0) { stopTimer(); handleAnswer(true) }
    }, 50)
  }, [timeLimit, stopTimer, handleAnswer])

  const advanceCard = useCallback(() => {
    if (isHardcore && lastCorrectRef.current === false) {
      getReviewStats().then(s => {
        setStats(s)
        setScreen('results')
      }).catch(() => setScreen('results'))
      return
    }
    if (cardIndex + 1 >= cards.length) {
      if (isEndless && allWordsPoolRef.current.length > 0) {
        // refill with random words from pool
        const pool = [...allWordsPoolRef.current]
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]]
        }
        const refill: QuizCard[] = pool.slice(0, 20).map(word => ({
          word,
          review: { baseForm: word.baseForm, interval: 0, easeFactor: 2.5, dueDate: 0,
            streak: 0, correctCount: 0, incorrectCount: 0, recentResults: [], status: 'new', lastReviewed: 0 },
        }))
        setCards(prev => [...prev, ...refill])
        setCardIndex(i => i + 1)
        setInput('')
        setPhase('answering')
        setLastCorrect(null)
        submittedRef.current = false
        return
      }
      getReviewStats().then(s => {
        setStats(s)
        setScreen('results')
      }).catch(() => setScreen('results'))
      return
    }
    setCardIndex(i => i + 1)
    setInput('')
    setPhase('answering')
    setLastCorrect(null)
    submittedRef.current = false
  }, [cardIndex, cards.length, isEndless, isHardcore])

  useEffect(() => {
    if (screen === 'quiz' && phase === 'answering' && cards.length > 0) {
      startTimer()
      inputRef.current?.focus()
    }
    return () => stopTimer()
  }, [screen, phase, cardIndex, cards.length])

  useEffect(() => {
    if (phase === 'result') {
      const t = setTimeout(advanceCard, 1200)
      return () => clearTimeout(t)
    }
  }, [phase])

  // save session when results screen is reached
  useEffect(() => {
    if (screen !== 'results' || results.length === 0) return
    const meta = sessionMetaRef.current
    if (!meta) return
    const correct = results.filter(r => r.correct).length
    saveSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startedAt: sessionStartRef.current,
      durationMs: Date.now() - sessionStartRef.current,
      mode: meta.mode,
      endless: meta.endless,
      hardcore: meta.hardcore,
      bestStreak,
      filters: meta.filters,
      totalCards: results.length,
      correct,
      incorrect: results.length - correct,
    }).then(() => pushReviews()).catch(() => {})
  }, [screen])

  const buildCustomCards = async (): Promise<QuizCard[]> => {
    const allWords = await getAllWords()
    const filtered = allWords.filter(w => {
      if (customStatus.size > 0) {
        // status filter applied after syncing reviews — checked below
      }
      if (customFreqSource) {
        const freq = w.frequencies.find(f => f.sourceName === customFreqSource)
        if (!freq) return false
        if (selectedSource?.isNumeric !== false) {
          const min = typeof customMinRank === 'number' ? customMinRank : null
          const max = typeof customMaxRank === 'number' ? customMaxRank : null
          if (min !== null && freq.frequency < min) return false
          if (max !== null && freq.frequency > max) return false
        } else {
          if (customFreqTag && (freq as any).frequencyTag !== customFreqTag) return false
        }
      }
      return true
    })

    await syncWordsFromDictionary(filtered.map(w => w.baseForm))

    const enriched: QuizCard[] = []
    for (const word of filtered) {
      const review = await (async () => {
        const { getAllReviews } = await import('../../services/reviewStore')
        const all = await getAllReviews()
        return all.find(r => r.baseForm === word.baseForm)
      })()
      if (!review) continue
      if (customStatus.size > 0 && !customStatus.has(review.status)) continue
      enriched.push({ review, word })
    }
    return enriched
  }

  const handleStart = async (retainMode = mode, endless = false) => {
    setLoading(true)
    setNoWords(false)
    try {
      let enriched: QuizCard[] = []
      const filters: QuizSession['filters'] = {}

      if (retainMode === 'scheduled') {
        const allWords = await getAllWords()
        await syncWordsFromDictionary(allWords.map(w => w.baseForm))
        const size = endless ? null : (typeof sessionSize === 'number' && sessionSize > 0 ? sessionSize : null)
        const due = await getDueCards(size)
        for (const review of due) {
          const word = await getWord(review.baseForm)
          if (word) enriched.push({ review, word })
        }
      } else {
        enriched = await buildCustomCards()
        if (customFreqSource) filters.frequencySource = customFreqSource
        if (typeof customMinRank === 'number') filters.minRank = customMinRank
        if (typeof customMaxRank === 'number') filters.maxRank = customMaxRank
        if (customFreqTag) filters.frequencyTag = customFreqTag
        if (customStatus.size > 0) filters.statusFilter = [...customStatus].join(',')
        const size = endless ? null : (typeof sessionSize === 'number' && sessionSize > 0 ? sessionSize : null)
        if (size) enriched = enriched.slice(0, size)
      }

      if (enriched.length === 0) { setNoWords(true); setLoading(false); return }

      const requestedSize = endless ? null : (typeof sessionSize === 'number' && sessionSize > 0 ? sessionSize : null)
      let looping = false
      if (requestedSize && enriched.length < requestedSize) {
        looping = true
        const base = [...enriched]
        while (enriched.length < requestedSize) {
          enriched.push(...base.slice(0, requestedSize - enriched.length))
        }
      }
      setIsLooping(looping)

      for (let i = enriched.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [enriched[i], enriched[j]] = [enriched[j], enriched[i]]
      }

      setIsEndless(endless)
      setSessionStreak(0)
      setBestStreak(0)
      if (endless) {
        const pool = await getAllWords()
        allWordsPoolRef.current = pool
      }
      const resolvedFilters = Object.keys(filters).length ? filters : undefined
      sessionMetaRef.current = { endless, hardcore: isHardcore, mode: retainMode, filters: resolvedFilters }
      setSessionMode(retainMode)
      setSessionFilters(resolvedFilters)
      sessionStartRef.current = Date.now()
      setCards(enriched)
      setCardIndex(0)
      setResults([])
      setInput('')
      setPhase('answering')
      setLastCorrect(null)
      submittedRef.current = false
      setScreen('quiz')
    } finally {
      setLoading(false)
    }
  }

  // ── Config screen ─────────────────────────────────────────────────────────

  if (screen === 'config') {
    const isNumericSource = selectedSource ? selectedSource.isNumeric !== false : true

    return (
      <div className="quiz-view">
        <div className="quiz-config">
          <div className="quiz-config__header">
            <QuizIcon sx={{ fontSize: 32 }} />
            <h2>Reading Quiz</h2>
          </div>

          {stats && (
            <div className="quiz-stats-grid">
              <div className="quiz-stat">
                <span className="quiz-stat__value">{stats.dueCount}</span>
                <span className="quiz-stat__label">due</span>
              </div>
              <div className="quiz-stat">
                <span className="quiz-stat__value">{stats.newCount}</span>
                <span className="quiz-stat__label">new</span>
              </div>
              <div className="quiz-stat">
                <span className="quiz-stat__value">{stats.knownCount}</span>
                <span className="quiz-stat__label">known</span>
              </div>
              <div className="quiz-stat quiz-stat--streak">
                <span className="quiz-stat__value">{stats.dailyStreak}</span>
                <span className="quiz-stat__label">streak</span>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="quiz-mode-toggle">
            <button
              className={`quiz-mode-btn${mode === 'scheduled' ? ' quiz-mode-btn--active' : ''}`}
              onClick={() => setMode('scheduled')}
            >Scheduled</button>
            <button
              className={`quiz-mode-btn${mode === 'custom' ? ' quiz-mode-btn--active' : ''}`}
              onClick={() => setMode('custom')}
            >
              <TuneIcon sx={{ fontSize: 14 }} /> Custom
            </button>
          </div>

          <div className="quiz-config__options">
            {/* Custom filters */}
            {mode === 'custom' && (
              <div className="quiz-custom-filters">
                <div className="quiz-config__row">
                  <label>Status</label>
                  <div className="quiz-status-pills">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        className={`quiz-status-pill quiz-status-pill--${s}${customStatus.has(s) ? ' quiz-status-pill--active' : ''}`}
                        onClick={() => setCustomStatus(prev => {
                          const next = new Set(prev)
                          next.has(s) ? next.delete(s) : next.add(s)
                          return next
                        })}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {freqSources.length > 0 && (
                  <div className="quiz-config__row">
                    <label>Frequency</label>
                    <select
                      className="quiz-size-input quiz-size-input--wide"
                      value={customFreqSource}
                      onChange={e => { setCustomFreqSource(e.target.value); setCustomMinRank(''); setCustomMaxRank(''); setCustomFreqTag('') }}
                    >
                      <option value="">Any</option>
                      {freqSources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {customFreqSource && isNumericSource && (
                  <div className="quiz-config__row">
                    <label>Rank</label>
                    <input
                      type="number" min={1} placeholder="min"
                      className="quiz-size-input quiz-size-input--half"
                      value={customMinRank}
                      onChange={e => setCustomMinRank(e.target.value ? Number(e.target.value) : '')}
                    />
                    <span className="quiz-rank-sep">–</span>
                    <input
                      type="number" min={1} placeholder="max"
                      className="quiz-size-input quiz-size-input--half"
                      value={customMaxRank}
                      onChange={e => setCustomMaxRank(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                )}

                {customFreqSource && !isNumericSource && (
                  <div className="quiz-config__row">
                    <label>Tag</label>
                    <input
                      type="text" placeholder="e.g. ★★★"
                      className="quiz-size-input"
                      value={customFreqTag}
                      onChange={e => setCustomFreqTag(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="quiz-config__row">
              <label>Time limit</label>
              <div className="quiz-time-buttons">
                {TIME_LIMITS.map(t => (
                  <button
                    key={t}
                    className={`quiz-time-btn${timeLimit === t ? ' quiz-time-btn--active' : ''}`}
                    onClick={() => setTimeLimit(t)}
                  >{t}s</button>
                ))}
              </div>
            </div>

            <div className="quiz-config__row">
              <label>Session size</label>
              <input
                type="number" min={1} max={500}
                className="quiz-size-input"
                value={sessionSize}
                onChange={e => setSessionSize(e.target.value ? Number(e.target.value) : '')}
              />
              <span className="quiz-size-hint">cards</span>
            </div>

            <div className="quiz-config__row">
              <label>Hardcore</label>
              <button
                className={`quiz-hardcore-toggle${isHardcore ? ' quiz-hardcore-toggle--active' : ''}`}
                onClick={() => setIsHardcore(h => !h)}
              >
                {isHardcore ? '💀 ON' : 'OFF'}
              </button>
              <span className="quiz-size-hint">one mistake ends it</span>
            </div>

            <div className="quiz-config__row">
              <label>Shake</label>
              <button
                className={`quiz-hardcore-toggle${shakeOnWrong ? ' quiz-hardcore-toggle--active' : ''}`}
                onClick={() => setShakeOnWrong(s => !s)}
              >
                {shakeOnWrong ? 'ON' : 'OFF'}
              </button>
              <span className="quiz-size-hint">shake on wrong answer</span>
            </div>
          </div>

          {noWords && (
            <p className="quiz-no-words">No words match. Adjust filters or mine more books!</p>
          )}

          <div className="quiz-start-row">
            <button className="quiz-start-btn" onClick={() => handleStart(mode, false)} disabled={loading}>
              {loading ? 'Loading...' : 'Start'}
            </button>
            <button className="quiz-start-btn quiz-start-btn--endless" onClick={() => handleStart(mode, true)} disabled={loading}>
              ∞ Endless
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────

  if (screen === 'quiz') {
    const card = cards[cardIndex]
    if (!card) return null
    const progress = cardIndex / cards.length

    return (
      <div className="quiz-view">
        {!isEndless && (
          <div className="quiz-progress-bar">
            <div className="quiz-progress-bar__fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        {isLooping && (
          <div className="quiz-loop-warning">
            ⚠ Session size exceeds your word count — words repeat. Repeated reviews in one session distort SRS intervals.
          </div>
        )}
        <div className="quiz-card-area">
          <div className="quiz-session-bar">
            <div className="quiz-session-bar__left">
              <span className="quiz-session-label">
                {isEndless ? 'Endless' : sessionMode === 'scheduled' ? 'Scheduled' : 'Custom'}
              </span>
              {!isEndless && (
                <span className="quiz-session-remaining">{cards.length - cardIndex} left</span>
              )}
              {isHardcore && <span className="quiz-session-hardcore">💀</span>}
            </div>
            <button className="quiz-exit-btn" onClick={handleExit}>×</button>
          </div>
          <div className={`quiz-card${phase === 'result' ? (lastCorrect ? ' quiz-card--correct' : ` quiz-card--wrong${shakeOnWrong ? ' quiz-card--shake' : ''}`) : ''}`}>
            <div className="quiz-expression">{card.word.surface}</div>

            {phase === 'answering' && <TimerArc ratio={timerRatio} timeLimit={timeLimit} />}

            {phase === 'result' && (
              <div className="quiz-result-icon">
                {lastCorrect
                  ? <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50' }} />
                  : <CancelIcon sx={{ fontSize: 48, color: '#f44336' }} />}
                <div className="quiz-correct-reading">{card.word.reading}</div>
              </div>
            )}

            <input
              ref={inputRef}
              className="quiz-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && phase === 'answering') handleAnswer() }}
              placeholder="reading..."
              disabled={phase === 'result'}
              autoComplete="off"
              autoCapitalize="none"
            />

            {phase === 'answering' && (
              <button className="quiz-submit-btn" onClick={() => handleAnswer()}>Submit</button>
            )}
          </div>
          <div className="quiz-counter">
            {isEndless
              ? <>{cardIndex + 1} answered {sessionStreak >= 3 && <span className="quiz-session-streak">🔥 {sessionStreak}</span>}</>
              : <>{cardIndex + 1} / {cards.length} {sessionStreak >= 3 && <span className="quiz-session-streak">🔥 {sessionStreak}</span>}</>
            }
          </div>
        </div>
      </div>
    )
  }

  // ── Results screen ────────────────────────────────────────────────────────

  const correctCount = results.filter(r => r.correct).length
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const newlyKnown = results.filter(r => r.correct && r.card.review.status === 'known').length

  return (
    <div className="quiz-view">
      <div className="quiz-results">
        <div className="quiz-results__header">
          <EmojiEventsIcon sx={{ fontSize: 40, color: '#ffd700' }} />
          <h2>Session Complete</h2>
          {sessionMode === 'custom' && <span className="quiz-results__mode-badge">custom</span>}
          {isHardcore && <span className="quiz-results__mode-badge quiz-results__mode-badge--hardcore">💀 hardcore</span>}
        </div>

        <div className="quiz-accuracy-ring">
          <svg viewBox="0 0 120 120" width={120} height={120}>
            <circle cx={60} cy={60} r={50} className="accuracy-ring__track" />
            <circle
              cx={60} cy={60} r={50}
              className="accuracy-ring__fill"
              style={{
                strokeDasharray: `${2 * Math.PI * 50 * accuracy / 100} ${2 * Math.PI * 50}`,
                transform: 'rotate(-90deg)',
                transformOrigin: '60px 60px',
              }}
            />
            <text x={60} y={65} textAnchor="middle" className="accuracy-ring__text">{accuracy}%</text>
          </svg>
        </div>

        <div className="quiz-results__stats">
          <div className="quiz-result-stat">
            <span>{results.length}</span><label>reviewed</label>
          </div>
          <div className="quiz-result-stat quiz-result-stat--correct">
            <span>{correctCount}</span><label>correct</label>
          </div>
          <div className="quiz-result-stat quiz-result-stat--wrong">
            <span>{results.length - correctCount}</span><label>wrong</label>
          </div>
          {newlyKnown > 0 && (
            <div className="quiz-result-stat quiz-result-stat--known">
              <span>{newlyKnown}</span><label>newly known</label>
            </div>
          )}
          {bestStreak > 0 && (
            <div className="quiz-result-stat quiz-result-stat--streak">
              <span>{bestStreak}</span><label>best streak</label>
            </div>
          )}
          {stats && (
            <div className="quiz-result-stat quiz-result-stat--streak">
              <span>{stats.dailyStreak}</span><label>daily streak</label>
            </div>
          )}
        </div>

        {results.filter(r => !r.correct).length > 0 && (
          <div className="quiz-missed">
            <h3>Missed</h3>
            {results.filter(r => !r.correct).map((r, i) => (
              <div key={i} className="quiz-missed-row">
                <span className="quiz-missed-expr">{r.card.word.surface}</span>
                <span className="quiz-missed-reading">{r.card.word.reading}</span>
                {r.userInput && <span className="quiz-missed-input">you: {r.userInput}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="quiz-results__actions">
          <button className="quiz-start-btn" onClick={() => setScreen('config')}>New Session</button>
          <button className="quiz-start-btn quiz-start-btn--secondary" onClick={() => handleStart(sessionMode, isEndless)}>Retry</button>
        </div>
      </div>
    </div>
  )
}
