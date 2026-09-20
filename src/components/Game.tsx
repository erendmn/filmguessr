import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  copyText,
  dateForNumber,
  formatDate,
  FROZEN,
  hintText,
  IMG,
  isCorrect,
  isFranchiseMatch,
  loadSaved,
  MAX_GUESSES,
  nextMidnight,
  puzzleForNumber,
  puzzles,
  rankFor,
  computeStats,
  saveGame,
  searchTitles,
  shareText,
  SKIP,
  todayNumber,
  type Puzzle,
  type Saved,
  type TitleEntry,
} from '../lib/game'
import { NextIcon, PrevIcon } from './Icons'

const WIN_MSG: Record<number, string> = {
  1: 'İlk sahnede bildin! 🎯',
  2: 'Harika iş!',
  3: 'Harika iş!',
  4: 'Harika iş!',
  5: 'Bildin!',
  6: 'Kıl payı, ama oldu!',
}

function cubeClass(g: string | undefined, partial: boolean | undefined, p: Puzzle) {
  if (g === undefined) return ''
  if (isCorrect(g, p)) return 'success'
  if (partial) return 'partial'
  return 'fail'
}

export function Game({ num, showToast }: { num: number; showToast: (t: string) => void }) {
  const navigate = useNavigate()
  const puzzle = useMemo(() => puzzleForNumber(num), [num])
  const today = todayNumber()
  const [saved, setSaved] = useState<Saved>(() => loadSaved(num))
  const guessCount = saved.guesses.length
  const [selected, setSelected] = useState(() => Math.min(MAX_GUESSES, loadSaved(num).guesses.length + 1))
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<TitleEntry[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [showSug, setShowSug] = useState(false)
  const [shake, setShake] = useState(false)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // yeni bulmacaya geçince durumu tazele
  useEffect(() => {
    const s = loadSaved(num)
    setSaved(s)
    setSelected(s.state === 'playing' ? Math.min(MAX_GUESSES, s.guesses.length + 1) : 1)
    setInput('')
    setSuggestions([])
    setLoaded({})
    window.scrollTo({ top: 0 })
  }, [num])

  // görselleri önceden yükle (açılmış olanlar + bir sonraki)
  useEffect(() => {
    const upto = saved.state === 'playing' ? Math.min(MAX_GUESSES, guessCount + 2) : MAX_GUESSES
    for (let i = 0; i < upto; i++) {
      const v = puzzle.views[i]
      if (!v) continue
      const im = new Image()
      im.onload = () => setLoaded((l) => (l[i + 1] ? l : { ...l, [i + 1]: true }))
      im.src = IMG(v.p)
    }
  }, [puzzle, guessCount, saved.state])

  const canView = useCallback(
    (i: number) => saved.state !== 'playing' || i <= guessCount + 1,
    [saved.state, guessCount],
  )
  const changeImage = useCallback(
    (i: number) => {
      if (canView(i)) setSelected(i)
    },
    [canView],
  )

  // klavye kısayolları: 1-6 sahne, / arama
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea'
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!typing && /^[1-6]$/.test(e.key)) changeImage(Number(e.key))
      if (!typing && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [changeImage])

  const commitGuess = (raw: string | null, skip = false) => {
    if (saved.state !== 'playing') return
    const guess = skip ? SKIP : raw?.trim() || ''
    if (!guess) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    const correct = isCorrect(guess, puzzle)
    const partial = isFranchiseMatch(guess, puzzle)
    const guesses = [...saved.guesses, guess]
    const partials = [...saved.partial, partial]
    let state: Saved['state'] = 'playing'
    if (correct) state = 'win'
    else if (guesses.length >= MAX_GUESSES) state = 'lose'
    const next: Saved = { guesses, partial: partials, state, finishedAt: state !== 'playing' ? Date.now() : undefined }
    setSaved(next)
    saveGame(num, next)
    setInput('')
    setSuggestions([])
    setShowSug(false)
    if (state === 'win') {
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.55 }, colors: ['#10b981', '#34d399', '#fbbf24', '#f8fafc'] })
      setSelected(guesses.length)
    } else if (state === 'playing') {
      setSelected(guesses.length + 1)
      if (!skip) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } else {
      setSelected(MAX_GUESSES)
    }
  }

  const onInput = (v: string) => {
    setInput(v)
    if (v.trim().length < 2) {
      setSuggestions([])
      setShowSug(false)
      return
    }
    const s = searchTitles(v)
    setSuggestions(s)
    setActiveIdx(0)
    setShowSug(true)
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSug && suggestions.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        setInput(suggestions[activeIdx].t)
        setShowSug(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const pick = suggestions[activeIdx].t
        setInput(pick)
        setShowSug(false)
        commitGuess(pick)
        return
      }
    }
    if (e.key === 'Enter') commitGuess(input)
    if (e.key === 'Escape') setShowSug(false)
  }

  const view = puzzle.views[selected - 1]
  const hint = hintText(selected, puzzle)
  const remaining = MAX_GUESSES - guessCount
  const date = dateForNumber(num)
  const isToday = num === today
  const playing = saved.state === 'playing'

  return (
    <div className="current-game">
      <div className="current-game-number">
        <strong>Film #{num}</strong>
        {!FROZEN && !isToday && <> · {formatDate(date)}</>}
        {!FROZEN && isToday && <> · Bugün</>}
      </div>

      <div className="Screenshots">
        <div className="gtm-image-area">
          {puzzle.views.map((v, i) => {
            const n = i + 1
            if (!canView(n)) return null
            return (
              <div
                key={n}
                className={`game-image ${selected === n ? 'visible' : ''} ${v.z > 1 ? 'zoomed' : ''}`}
                style={{
                  backgroundImage: `url(${IMG(v.p)})`,
                  backgroundSize: v.z > 1 ? `${v.z * 100}% auto` : 'cover',
                  backgroundPosition: `${v.x}% ${v.y}%`,
                }}
                role="img"
                aria-label={`Sahne ${n}`}
              />
            )
          })}
          {view && !loaded[selected] && <div className="image-loading">Sahne yükleniyor…</div>}
          {hint && (
            <div className="guess-hint" key={selected}>
              {hint}
            </div>
          )}
          <div className="image-badge">
            Sahne {selected}/{MAX_GUESSES}
            {view?.z > 1 ? ' · yakın plan' : ''}
          </div>
        </div>

        <div className="image-selector">
          {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map((n) => {
            const locked = !canView(n)
            const cls = cubeClass(saved.guesses[n - 1], saved.partial[n - 1], puzzle)
            return (
              <button
                key={n}
                className={`gamecube ${selected === n ? 'active' : ''} ${locked ? 'locked' : ''} ${cls}`}
                onClick={() => changeImage(n)}
                disabled={locked}
                aria-label={`Sahne ${n}`}
              >
                {n}
              </button>
            )
          })}
          {playing && (
            <button className="skipButton" onClick={() => commitGuess(null, true)}>
              Atla
            </button>
          )}
        </div>
      </div>

      {playing && remaining > 1 && <p className="guesses-remaining">{remaining} tahmin hakkın kaldı</p>}
      {playing && remaining === 1 && <p className="guesses-remaining last">Son tahmin!</p>}

      {playing && (
        <div className={`PlayArea ${shake ? 'shakeme' : ''}`}>
          <div className="input-area">
            <input
              ref={inputRef}
              className="game-input"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="Film ara…"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => suggestions.length && setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
            />
            {showSug && (
              <ul className="suggestions">
                {suggestions.length === 0 && <li className="none">Sonuç yok — yazmaya devam et</li>}
                {suggestions.map((s, i) => (
                  <li
                    key={s.t + s.y}
                    className={i === activeIdx ? 'suggestion-active' : ''}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setInput(s.t)
                      setShowSug(false)
                      inputRef.current?.focus()
                    }}
                  >
                    <span>{s.t}</span>
                    {s.y && <span className="year">{s.y}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="submitButton" onClick={() => commitGuess(input)} disabled={!input.trim()}>
            Tahmin Et
          </button>
          {saved.guesses.map((g, i) => {
            const cls = cubeClass(g, saved.partial[i], puzzle)
            const icon = cls === 'success' ? '✅' : cls === 'partial' ? '🟡' : '❌'
            return (
              <div className={`guess-result ${cls}`} key={i}>
                <span>{icon}</span>
                <span className={g === SKIP ? 'skipped' : ''}>{g}</span>
                {cls === 'partial' && <span className="guess-result-franchise">Seri: {puzzle.franchise}</span>}
              </div>
            )
          })}
        </div>
      )}

      {!playing && <Result num={num} puzzle={puzzle} saved={saved} showToast={showToast} />}

      <Footer num={num} today={today} navigate={(n) => navigate(n === today ? '/' : `/p/${n}`)} />
    </div>
  )
}

function Result({ num, puzzle, saved, showToast }: { num: number; puzzle: Puzzle; saved: Saved; showToast: (t: string) => void }) {
  const [label, setLabel] = useState('Sonucu Paylaş')
  const [showGuesses, setShowGuesses] = useState(false)
  const win = saved.state === 'win'
  const stats = computeStats(todayNumber())
  const cubes = saved.guesses.map((g, i) => (isCorrect(g, puzzle) ? 's' : saved.partial[i] ? 'p' : 'f'))
  const share = async () => {
    const ok = await copyText(shareText(num, saved, puzzle, rankFor(stats.won)))
    setLabel(ok ? 'Kopyalandı ✓' : 'Kopyalanamadı')
    showToast(ok ? 'Sonuç panoya kopyalandı' : 'Kopyalanamadı')
    setTimeout(() => setLabel('Sonucu Paylaş'), 2000)
  }
  return (
    <div className="result">
      {win ? <h2 className="win-msg">{WIN_MSG[saved.guesses.length]}</h2> : <h2 className="lose-msg">Olmadı! Bir dahaki sefere…</h2>}
      <h3>
        Film: <span className="answer">{puzzle.answers[0]}</span>
      </h3>
      <div className="emoji-track">
        {cubes.map((c, i) => (
          <div key={i} className={`guess-cube ${c === 's' ? 'success' : c === 'p' ? 'partial' : 'fail'}`} />
        ))}
        {Array.from({ length: MAX_GUESSES - cubes.length }).map((_, i) => (
          <div key={'q' + i} className="guess-cube q" />
        ))}
      </div>
      <button className={`mainButton share-results-btn ${label !== 'Sonucu Paylaş' ? 'copied' : ''}`} onClick={share}>
        {label}
      </button>
      <p className="summary-toggle" onClick={() => setShowGuesses((s) => !s)}>
        Tahminleri {showGuesses ? 'gizle' : 'göster'}
      </p>
      {showGuesses && (
        <div style={{ width: '100%', marginBottom: 10 }}>
          {saved.guesses.map((g, i) => {
            const c = cubes[i]
            return (
              <div className={`guess-result ${c === 's' ? 'success' : c === 'p' ? 'partial' : 'fail'}`} key={i}>
                <span>{c === 's' ? '✅' : c === 'p' ? '🟡' : '❌'}</span>
                <span className={g === SKIP ? 'skipped' : ''}>{g}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="link-row">
        <Link to="/onceki-gunler" className="mainButton" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          Tüm Filmler
        </Link>
        <a
          className="mainButton"
          style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          href={`https://www.themoviedb.org/movie/${puzzle.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          TMDB'de Gör ↗
        </a>
      </div>
      <div className="movie-card">
        {puzzle.poster && <img src={IMG(puzzle.poster, 'w342')} alt={puzzle.answers[0]} loading="lazy" />}
        <div>
          <h4>
            {puzzle.answers[0]} ({puzzle.year})
          </h4>
          <div className="meta">
            {puzzle.director && <>Yönetmen: {puzzle.director} · </>}
            {puzzle.actor && <>Başrol: {puzzle.actor} · </>}
            {puzzle.genre} · TMDB {puzzle.rating.toFixed(1)}
          </div>
          <p>{puzzle.overview || 'Bu film için özet bulunamadı.'}</p>
        </div>
      </div>
    </div>
  )
}

function Countdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, nextMidnight().getTime() - now)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="countdown-to-next-game">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  )
}

function Footer({ num, today, navigate }: { num: number; today: number; navigate: (n: number) => void }) {
  return (
    <div className="footer">
      <div className="countdownControls">
        <button className={`iconButton ${num <= 1 ? 'hidden' : ''}`} onClick={() => navigate(num - 1)} aria-label="Önceki film">
          <PrevIcon />
        </button>
        <div style={{ textAlign: 'center' }}>
          {FROZEN ? (
            <>
              <p className="countdown-label">Film</p>
              <span className="countdown-to-next-game">
                {num} / {today}
              </span>
            </>
          ) : (
            <>
              <p className="countdown-label">Yeni film:</p>
              <Countdown />
            </>
          )}
        </div>
        <button className={`iconButton ${num >= today ? 'hidden' : ''}`} onClick={() => navigate(num + 1)} aria-label="Sonraki film">
          <NextIcon />
        </button>
      </div>
      <p className="fine">
        {FROZEN ? `Yeşilçam'dan bugüne ${today} Türk filmi.` : `Her gün gece yarısı yeni bir Türk filmi. Yeşilçam'dan bugüne ${puzzles.length} film.`} Görseller ve veriler{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          TMDB
        </a>
        'den.
      </p>
    </div>
  )
}
