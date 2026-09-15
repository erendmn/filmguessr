import { Link, useNavigate } from 'react-router-dom'
import { computeStats, dateForNumber, randomUnplayed, todayNumber } from '../lib/game'

export function PreviousGames() {
  const navigate = useNavigate()
  const today = todayNumber()
  const stats = computeStats(today)
  const items = [...stats.results].reverse()
  const unplayed = items.filter((r) => r.state === 'unplayed').length
  const playRandom = () => {
    const n = randomUnplayed(today)
    if (n) navigate(n === today ? '/' : `/p/${n}`)
  }
  return (
    <div className="previous-games">
      <h2 className="page-title">Önceki Günler</h2>
      <div className="prev-game-legend">
        <div className="legend-row">
          <span>❓</span> Oynanmadı
        </div>
        <div className="legend-row">
          <div className="guess-cube" /> Atlandı
        </div>
        <div className="legend-row">
          <div className="guess-cube fail" /> Yanlış
        </div>
        <div className="legend-row">
          <div className="guess-cube partial" /> Seri
        </div>
        <div className="legend-row">
          <div className="guess-cube success" /> Doğru
        </div>
      </div>
      <div className="link-row" style={{ margin: '0 0 4px' }}>
        <Link to="/" className="mainButton share-results-btn" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          Bugünün Filmine Dön
        </Link>
        <button className="mainButton" style={{ height: 42 }} onClick={playRandom} disabled={unplayed === 0}>
          🎲 Rastgele Oyna ({unplayed} kaldı)
        </button>
      </div>
      <div className="prev-grid">
      {items.map((r) => {
        const d = dateForNumber(r.num)
        const done = r.state === 'win' || r.state === 'lose'
        return (
          <Link key={r.num} to={r.num === today ? '/' : `/p/${r.num}`} className="prev-item">
            <div className="num">
              #{r.num}
              <small>{d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</small>
            </div>
            {r.state === 'unplayed' ? (
              <span style={{ fontSize: 16 }}>❓</span>
            ) : (
              <div className="emoji-track">
                {r.cubes.map((c, i) => (
                  <div key={i} className={`guess-cube ${c === 's' ? 'success' : c === 'f' ? 'fail' : c === 'p' ? 'partial' : 'q'}`} />
                ))}
              </div>
            )}
            <span className={`status ${r.state}`}>
              {r.state === 'win' ? 'Bildin ✓' : r.state === 'lose' ? 'Bilemedin' : r.state === 'playing' ? 'Devam et →' : 'Oyna →'}
            </span>
            {done && <span className="answer">{r.answer}</span>}
          </Link>
        )
      })}
      </div>
    </div>
  )
}
