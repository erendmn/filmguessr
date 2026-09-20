import puzzlesRaw from '../data/puzzles.json'
import titlesRaw from '../data/titles.json'

export type View = { p: string; z: number; x: number; y: number }
export type Puzzle = {
  id: number
  num: number
  answers: string[]
  year: string
  genre: string
  rating: number
  actor: string
  director: string
  franchise: string
  overview: string
  poster: string | null
  views: View[]
}
export type TitleEntry = { t: string; y: string; f: string }
export type GameState = 'playing' | 'win' | 'lose'
export type Saved = { guesses: string[]; partial: boolean[]; state: GameState; finishedAt?: number }

export const SITE_NAME = 'FilmGuessr'
export const SITE_URL = 'https://filmguessr.vercel.app'
export const HASHTAG = '#FilmGuessr'
export const MAX_GUESSES = 6
export const SKIP = 'Atlandı!'
// Bugün = Film #300; geçmiş 299 gün arşivden oynanabilir, sonraki günler havuzdan sırayla gelir
export const START_DATE = new Date(2025, 10, 20) // 20 Kasım 2025 = Film #1
export const IMG = (path: string, size = 'w780') => `https://image.tmdb.org/t/p/${size}${path}`

export const puzzles = puzzlesRaw as Puzzle[]
export const titles = titlesRaw as TitleEntry[]

const DAY = 86400000
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
// Günlük döngü 20 Eylül 2026'da donduruldu: sayaç #305'te durur, otomatik yeni film gelmez.
// Tekrar açmak için FREEZE_AT'i Infinity yap.
export const FREEZE_AT = 305
export const FROZEN = Number.isFinite(FREEZE_AT)
export function todayNumber(): number {
  const n = Math.floor((startOfDay(new Date()).getTime() - START_DATE.getTime()) / DAY) + 1
  return Math.min(n, FREEZE_AT)
}
export function dateForNumber(n: number): Date {
  return new Date(START_DATE.getTime() + (n - 1) * DAY)
}
export function puzzleForNumber(n: number): Puzzle {
  const idx = (((n - 1) % puzzles.length) + puzzles.length) % puzzles.length
  return puzzles[idx]
}
export function nextMidnight(): Date {
  const d = startOfDay(new Date())
  return new Date(d.getTime() + DAY)
}
export function formatDate(d: Date) {
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Türkçe'ye duyarlı normalize: İ→i, I→ı, aksan/noktalama temizliği */
export function normalize(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .replace(/[’'`´"«»]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
export function isCorrect(guess: string, p: Puzzle) {
  const g = normalize(guess)
  return g !== '' && p.answers.some((a) => normalize(a) === g)
}
export function isFranchiseMatch(guess: string, p: Puzzle) {
  if (!p.franchise || guess === SKIP) return false
  const g = normalize(guess)
  const f = normalize(p.franchise)
  return g.includes(f) && !isCorrect(guess, p)
}

/* ---------- Storage ---------- */
// Kayıt anahtarı bulmaca numarasına değil filmin TMDB id'sine bağlı: havuz büyüyünce ilerleme kaymaz
const KEY = (n: number) => `fg:v2:${puzzleForNumber(n).id}`
export function loadSaved(n: number): Saved {
  try {
    const raw = localStorage.getItem(KEY(n))
    if (raw) return JSON.parse(raw) as Saved
  } catch {}
  return { guesses: [], partial: [], state: 'playing' }
}
export function saveGame(n: number, s: Saved) {
  try {
    localStorage.setItem(KEY(n), JSON.stringify(s))
  } catch {}
}

/* ---------- İstatistik ---------- */
export type Stats = {
  played: number
  won: number
  winPct: number
  currentStreak: number
  maxStreak: number
  dist: Record<number, number>
  results: { num: number; state: GameState | 'unplayed'; cubes: ('s' | 'f' | 'p' | 'q')[]; answer: string }[]
}
export function computeStats(upTo: number): Stats {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  let played = 0,
    won = 0,
    cur = 0,
    max = 0
  const results: Stats['results'] = []
  for (let n = 1; n <= upTo; n++) {
    const s = loadSaved(n)
    const p = puzzleForNumber(n)
    const cubes: Stats['results'][number]['cubes'] = []
    if (s.state === 'playing' && s.guesses.length === 0) {
      results.push({ num: n, state: 'unplayed', cubes: Array(6).fill('q'), answer: p.answers[0] })
      cur = 0
      continue
    }
    s.guesses.forEach((g, i) => {
      if (isCorrect(g, p)) cubes.push('s')
      else if (s.partial[i]) cubes.push('p')
      else cubes.push('f')
    })
    if (s.state === 'playing') {
      results.push({ num: n, state: 'playing', cubes, answer: p.answers[0] })
      continue
    }
    played++
    if (s.state === 'win') {
      won++
      cur++
      max = Math.max(max, cur)
      dist[s.guesses.length] = (dist[s.guesses.length] || 0) + 1
    } else cur = 0
    results.push({ num: n, state: s.state, cubes, answer: p.answers[0] })
  }
  return { played, won, winPct: played ? Math.round((won / played) * 100) : 0, currentStreak: cur, maxStreak: max, dist, results }
}

export const RANKS: [number, string][] = [
  [0, 'Çaylak Seyirci'],
  [5, 'Sinema Acemisi'],
  [10, 'Sahne Avcısı'],
  [20, 'Film Tutkunu'],
  [40, 'Sinefil'],
  [80, 'Yeşilçam Uzmanı'],
  [150, 'Kurgu Ustası'],
  [200, 'Yönetmen Gözü'],
  [250, 'Perde Bilgini'],
  [300, 'Sinema Mütehassısı'],
  [400, 'Beyaz Perde Efsanesi'],
  [500, 'Büyük Sinema Üstadı'],
]
export function rankFor(won: number) {
  let r = RANKS[0][1]
  for (const [min, name] of RANKS) if (won >= min) r = name
  return r
}

/* ---------- Paylaşım ---------- */
export function cubesToEmoji(cubes: ('s' | 'f' | 'p' | 'q')[]) {
  const m = { s: '🟩', f: '🟥', p: '🟨', q: '⬜' }
  const out = cubes.map((c) => m[c])
  while (out.length < MAX_GUESSES) out.push('⬜')
  return out.join(' ')
}
export function randomUnplayed(upTo: number): number | null {
  const c: number[] = []
  for (let n = 1; n <= upTo; n++) {
    const s = loadSaved(n)
    if (s.state === 'playing' && s.guesses.length === 0) c.push(n)
  }
  return c.length ? c[Math.floor(Math.random() * c.length)] : null
}
export function shareText(num: number, s: Saved, p: Puzzle, rank?: string) {
  const cubes = s.guesses.map((g, i) => (isCorrect(g, p) ? 's' : s.partial[i] ? 'p' : 'f')) as ('s' | 'f' | 'p')[]
  const score = s.state === 'win' ? `${s.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  let t = `${HASHTAG} #${num} ${score}\n\n🎬 ${cubesToEmoji(cubes)}\n\n`
  if (rank) t += `Rütbe: ${rank}\n`
  t += `${SITE_URL}/p/${num}`
  return t
}
export async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = t
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
export function hintText(view: number, p: Puzzle) {
  switch (view) {
    case 2:
      return `TMDB Puanı: ${p.rating.toFixed(1)}`
    case 3:
      return `Tür: ${p.genre}`
    case 4:
      return `Yıl: ${p.year}`
    case 5:
      return `Oyuncu: ${p.actor}`
    case 6:
      return `Yönetmen: ${p.director}`
    default:
      return ''
  }
}

/** Basit önek/içerme araması — Türkçe'ye duyarlı */
export function searchTitles(q: string, limit = 12): TitleEntry[] {
  const n = normalize(q)
  if (n.length < 2) return []
  const starts: TitleEntry[] = []
  const contains: TitleEntry[] = []
  for (const t of titles) {
    const nt = normalize(t.t)
    if (nt.startsWith(n)) starts.push(t)
    else if (nt.includes(n)) contains.push(t)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
