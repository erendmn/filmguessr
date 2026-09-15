import { Link } from 'react-router-dom'
import { computeStats, dateForNumber, todayNumber } from '../lib/game'

export function PreviousGames() {
  const today = todayNumber()
  const stats = computeStats(today)
  const items = [...stats.results].reverse()
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
      <Link to="/" className="mainButton share-results-btn" style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        Bugünün Filmine Dön
      </Link>
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
            {done && <span className="answer">{r.answer}</span>}
            <span className={`status ${r.state}`}>
              {r.state === 'win' ? 'Bildin ✓' : r.state === 'lose' ? 'Bilemedin' : r.state === 'playing' ? 'Devam et →' : 'Oyna →'}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
