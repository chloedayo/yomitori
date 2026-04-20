import CloseIcon from '@mui/icons-material/Close'
import './aria-modal.scss'

interface Props { onClose: () => void }

export function ARIAModal({ onClose }: Props) {
  return (
    <div className="aria-overlay" onClick={onClose}>
      <div className="aria-modal" onClick={e => e.stopPropagation()}>
        <button className="aria-close" onClick={onClose}><CloseIcon sx={{ fontSize: 20 }} /></button>

        <h2 className="aria-title">ARIA</h2>
        <p className="aria-subtitle">Adaptive Response Interval Algorithm</p>
        <p className="aria-tagline">An extension of SM-2 with speed weighting, consistency bonuses, and difficulty penalties.</p>

        <hr className="aria-divider" />

        {/* ── Overview ── */}
        <section>
          <h3>Overview</h3>
          <p>
            SM-2 schedules reviews by updating an <em>ease factor</em> (EF) based on recall quality,
            then multiplying the previous interval by EF to get the next interval.
            ARIA keeps SM-2's core but layers three corrections on top:
          </p>
          <ol>
            <li><strong>Speed weighting</strong> — how quickly you recalled the answer affects quality</li>
            <li><strong>Consistency bonus</strong> — stable recall over recent attempts earns a multiplier</li>
            <li><strong>Difficulty penalty</strong> — historically hard words get shorter intervals regardless of EF</li>
          </ol>
          <p>
            Together these prevent two SM-2 failure modes: words drifting to multi-month intervals
            after a lucky streak, and hard words escaping to the back of the queue.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Step 1: Quality score ── */}
        <section>
          <h3>Step 1 — Quality score <code>q</code></h3>
          <p>
            SM-2 uses a 0–5 integer quality grade. ARIA replaces it with a continuous score
            derived from whether the answer was correct and the response time ratio
            <code> r = timeUsed / timeLimit</code>:
          </p>
          <table className="aria-table">
            <thead><tr><th>Condition</th><th>q</th></tr></thead>
            <tbody>
              <tr><td>Wrong answer</td><td>0.0</td></tr>
              <tr><td>Correct, r &lt; 0.3 (fast)</td><td>1.0</td></tr>
              <tr><td>Correct, 0.3 ≤ r &lt; 0.7 (comfortable)</td><td>0.75</td></tr>
              <tr><td>Correct, r ≥ 0.7 (slow)</td><td>0.5</td></tr>
            </tbody>
          </table>
          <p className="aria-note">
            Rationale: a word recalled instantly is better learned than one recalled with effort.
            Timeout (r &gt; 1.0) is forced wrong.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Step 2: Ease factor ── */}
        <section>
          <h3>Step 2 — Ease factor <code>EF</code></h3>
          <p>Identical to SM-2, clamped to [1.3, 4.0]:</p>
          <div className="aria-formula">
            EF′ = clamp(EF + 0.15 × (q − 0.6),  1.3,  4.0)
          </div>
          <p>
            The pivot is q = 0.6. Above it EF grows (easier next time); below it EF shrinks.
            Fast correct answers (q = 1.0) add <strong>+0.06</strong> per review.
            Wrong answers (q = 0.0) subtract <strong>−0.09</strong>.
          </p>
          <div className="aria-example">
            <span className="aria-example__label">Example</span>
            EF = 2.5, slow correct (q = 0.5):<br />
            EF′ = 2.5 + 0.15 × (0.5 − 0.6) = 2.5 − 0.015 = <strong>2.485</strong>
          </div>
        </section>

        <hr className="aria-divider" />

        {/* ── Step 3: Consistency factor ── */}
        <section>
          <h3>Step 3 — Consistency factor <code>C</code></h3>
          <p>
            Tracks the last 5 answer outcomes as a boolean window.
            The fraction correct in that window determines a multiplier:
          </p>
          <div className="aria-formula">
            recentRate = (correct answers in last 5) / 5<br />
            C = 1.0 + 0.2 × (recentRate − 0.5)
          </div>
          <p>Range: C ∈ [0.9, 1.1]</p>
          <table className="aria-table">
            <thead><tr><th>Last 5</th><th>recentRate</th><th>C</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>✓✓✓✓✓</td><td>1.0</td><td>1.10</td><td>+10% interval</td></tr>
              <tr><td>✓✓✓✓✗</td><td>0.8</td><td>1.06</td><td>+6% interval</td></tr>
              <tr><td>✓✓✓✗✗</td><td>0.6</td><td>1.02</td><td>+2% interval</td></tr>
              <tr><td>✓✓✗✗✗</td><td>0.4</td><td>0.98</td><td>−2% interval</td></tr>
              <tr><td>✗✗✗✗✗</td><td>0.0</td><td>0.90</td><td>−10% interval</td></tr>
            </tbody>
          </table>
          <p className="aria-note">
            A word you recall perfectly every session earns a compounding bonus. A word
            you get right by luck amid failures gets penalised even on correct answers.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Step 4: Difficulty penalty ── */}
        <section>
          <h3>Step 4 — Difficulty penalty <code>D</code></h3>
          <p>
            Measures lifetime hardness as the fraction of all attempts that were wrong,
            with a +1 smoothing term to avoid division-by-zero on new words:
          </p>
          <div className="aria-formula">
            difficulty = incorrectCount / (correctCount + incorrectCount + 1)<br />
            D = 1 − difficulty × 0.3
          </div>
          <p>Range: D ∈ (0.7, 1.0]</p>
          <table className="aria-table">
            <thead><tr><th>Miss rate</th><th>difficulty</th><th>D</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>0%</td><td>≈ 0.00</td><td>≈ 1.00</td><td>no penalty</td></tr>
              <tr><td>25%</td><td>≈ 0.25</td><td>≈ 0.925</td><td>−7.5% interval</td></tr>
              <tr><td>50%</td><td>≈ 0.50</td><td>≈ 0.85</td><td>−15% interval</td></tr>
              <tr><td>100%</td><td>≈ 1.00</td><td>≈ 0.70</td><td>−30% interval</td></tr>
            </tbody>
          </table>
          <p className="aria-note">
            SM-2 has no memory of historical difficulty once the EF recovers. ARIA keeps
            hard words closer via D, acting as a permanent drag that only fades as you
            accumulate correct answers and lower the lifetime miss rate.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Step 5: Interval ── */}
        <section>
          <h3>Step 5 — New interval</h3>
          <p>Early streaks use fixed ramps to build the schedule from scratch:</p>
          <div className="aria-formula">
            streak = 1 → interval = 1 day<br />
            streak = 2 → interval = 3 days<br />
            streak ≥ 3 → interval = round(prevInterval × EF′ × C × D)
          </div>
          <p>Wrong answer resets streak to 0 and forces interval = 1 day. Maximum interval is capped at 180 days.</p>
          <div className="aria-example">
            <span className="aria-example__label">Full worked example</span>
            <table className="aria-table">
              <thead><tr><th>Input</th><th>Value</th></tr></thead>
              <tbody>
                <tr><td>Previous interval</td><td>7 days</td></tr>
                <tr><td>EF</td><td>2.5</td></tr>
                <tr><td>Answer</td><td>correct, r = 0.25 (fast)</td></tr>
                <tr><td>Last 5 results</td><td>✓✓✓✓ + this ✓</td></tr>
                <tr><td>Lifetime: 8 correct, 2 wrong</td><td></td></tr>
              </tbody>
            </table>
            <table className="aria-table" style={{ marginTop: 10 }}>
              <thead><tr><th>Step</th><th>Calculation</th><th>Result</th></tr></thead>
              <tbody>
                <tr><td>q</td><td>correct, r &lt; 0.3</td><td>1.0</td></tr>
                <tr><td>EF′</td><td>2.5 + 0.15 × (1.0 − 0.6)</td><td>2.56</td></tr>
                <tr><td>recentRate</td><td>5/5</td><td>1.0</td></tr>
                <tr><td>C</td><td>1.0 + 0.2 × (1.0 − 0.5)</td><td>1.10</td></tr>
                <tr><td>difficulty</td><td>2 / (8 + 2 + 1)</td><td>0.182</td></tr>
                <tr><td>D</td><td>1 − 0.182 × 0.3</td><td>0.945</td></tr>
                <tr><td>interval</td><td>round(7 × 2.56 × 1.10 × 0.945)</td><td><strong>19 days</strong></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="aria-divider" />

        {/* ── Status lifecycle ── */}
        <section>
          <h3>Status lifecycle</h3>
          <div className="aria-status-flow">
            <span className="aria-status aria-status--new">new</span>
            <span className="aria-arrow">→</span>
            <span className="aria-status aria-status--learning">learning</span>
            <span className="aria-arrow">→</span>
            <span className="aria-status aria-status--reviewing">reviewing</span>
            <span className="aria-arrow">→</span>
            <span className="aria-status aria-status--known">known</span>
          </div>
          <table className="aria-table" style={{ marginTop: 14 }}>
            <thead><tr><th>Status</th><th>Condition</th></tr></thead>
            <tbody>
              <tr><td><span className="aria-status aria-status--new">new</span></td><td>No attempts yet</td></tr>
              <tr><td><span className="aria-status aria-status--learning">learning</span></td><td>At least 1 attempt, interval &lt; 7 days</td></tr>
              <tr><td><span className="aria-status aria-status--reviewing">reviewing</span></td><td>interval ≥ 7 days</td></tr>
              <tr><td><span className="aria-status aria-status--known">known</span></td><td>interval ≥ 21 days <em>and</em> streak ≥ 5</td></tr>
            </tbody>
          </table>
          <p className="aria-note">
            Words never retire. Even <em>known</em> words are reviewed — just infrequently.
            A wrong answer resets the streak and shrinks the interval, potentially dropping status.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Due card priority ── */}
        <section>
          <h3>Due card priority</h3>
          <p>Cards are sorted by two criteria:</p>
          <ol>
            <li>
              <strong>Urgency</strong> — percentage overdue:
              <div className="aria-formula">urgency = (now − dueDate) / (interval × 86400000)</div>
              A card due 2× its interval has urgency = 1.0 and outranks one due 1 day late.
            </li>
            <li>
              <strong>Difficulty</strong> — tiebreak for cards within 0.5 urgency of each other:
              <div className="aria-formula">difficulty = incorrectCount / (correctCount + incorrectCount + 1)</div>
              Hard words surface first within similarly-urgent groups.
            </li>
          </ol>
          <p>
            New words are injected at ~15% of session size (min 3), shuffled into the first 5 positions.
            This keeps new vocabulary flowing without drowning out due reviews.
          </p>
        </section>

        <hr className="aria-divider" />

        {/* ── Why it works ── */}
        <section>
          <h3>Why it works</h3>
          <p>
            SM-2's weakness is that a lucky streak can inflate EF and push a difficult word out
            for months. ARIA adds three dampening forces:
          </p>
          <ul>
            <li>
              <strong>Speed signal</strong>: even correct-but-slow answers lower EF slightly,
              signalling weak encoding before it becomes a miss.
            </li>
            <li>
              <strong>Consistency window</strong>: C &lt; 1 for shaky recall ensures that even
              a correct answer during a bad patch doesn't extend the interval as much.
            </li>
            <li>
              <strong>Lifetime penalty</strong>: D is monotonically increasing in miss rate and
              only decreases as correct answers accumulate — it can never be erased by a short winning streak.
            </li>
          </ul>
          <p>
            Together, the effective multiplier per review is bounded above by
            <strong> EF × 1.1 × 1.0 = EF × 1.1</strong> (perfect recall) and below by
            <strong> EF × 0.9 × 0.7 = EF × 0.63</strong> (shaky, historically hard word).
            This compresses the interval growth range relative to plain SM-2,
            keeping hard words closer and letting easy words still grow — but not runaway.
          </p>
        </section>

      </div>
    </div>
  )
}
