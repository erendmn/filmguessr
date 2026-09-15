import { useEffect, useState, type ReactNode } from 'react'
import { computeStats, copyText, HASHTAG, MAX_GUESSES, rankFor, RANKS, SITE_NAME, SITE_URL, todayNumber } from '../lib/game'

export type ModalKind = 'none' | 'howto' | 'about' | 'stats'

function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="close-modal" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={`Nasıl Oynanır? — ${SITE_NAME}`} onClose={onClose}>
      <p>Gösterilen sahnenin hangi Türk filmine ait olduğunu düşünüyorsan, filmi arayıp seç.</p>
      <p>6 sahnenin tamamı aynı filme aittir.</p>
      <p>Yanlış bilirsen ya da <b>Atla</b>'ya basarsan, filmden yeni bir sahne ve ek bir ipucu açılır.</p>
      <p>Toplam {MAX_GUESSES} tahmin hakkın var.</p>
      <div className="legend-row">
        <div className="guess-cube success" /> = Doğru
      </div>
      <div className="legend-row">
        <div className="guess-cube fail" /> = Yanlış
      </div>
      <div className="legend-row">
        <div className="guess-cube partial" /> = Doğru seri (ör. "Hababam Sınıfı Tatilde" yerine "Hababam Sınıfı")
      </div>
      <p style={{ marginTop: 12, fontSize: 13 }}>
        Kısayollar: <span className="kbd">1</span>–<span className="kbd">6</span> sahne değiştirir, <span className="kbd">/</span> aramaya odaklanır,{' '}
        <span className="kbd">Enter</span> tahmini gönderir.
      </p>
    </Modal>
  )
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={`${SITE_NAME} Hakkında`} onClose={onClose}>
      <p>Her gün yeni bir Türk filmi seçilir ve filmden 6 sahne sana teker teker gösterilir.</p>
      <p>
        Yeşilçam klasiklerinden Nuri Bilge Ceylan sinemasına, Kemal Sunal komedilerinden günümüz gişe filmlerine — farklı dönem ve türlerden, hem çok
        bilinen hem de daha az bilinen filmler var.
      </p>
      <p>Her gün gece yarısı (Türkiye saatiyle) yeni bir film gelir. Kaçırdığın günleri <b>Önceki Günler</b>'den oynayabilirsin.</p>
      <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
        Sahne görselleri ve film bilgileri{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          TMDB
        </a>{' '}
        üzerinden alınmıştır. Bu ürün TMDB tarafından onaylanmamıştır veya sertifikalandırılmamıştır. Oyun konsepti{' '}
        <a href="https://guessthemovie.name" target="_blank" rel="noopener noreferrer">
          Guess The Movie
        </a>
        'den esinlenmiştir.
      </p>
    </Modal>
  )
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  const stats = computeStats(todayNumber())
  const [label, setLabel] = useState('İstatistikleri Paylaş')
  const rank = rankFor(stats.won)
  const next = RANKS.find(([min]) => min > stats.won)
  const maxDist = Math.max(1, ...Object.values(stats.dist))
  const today = stats.results[stats.results.length - 1]
  const hl = today && today.state === 'win' ? today.cubes.length : -1

  const share = async () => {
    let t = `${SITE_NAME} İstatistiklerim\n`
    t += `Oynanan: ${stats.played}\nKazanılan: ${stats.won}\nKazanma: %${stats.winPct}\nSeri: ${stats.currentStreak}\nEn Uzun Seri: ${stats.maxStreak}\n\nDağılım\n`
    for (let i = 1; i <= MAX_GUESSES; i++) {
      const v = stats.dist[i] || 0
      t += '🟩'.repeat(1 + Math.ceil((v / maxDist) * 5)) + ` ${v}\n`
    }
    t += `\nRütbe: ${rank} 🎬\n${HASHTAG}\n${SITE_URL}`
    await copyText(t)
    setLabel('Kopyalandı ✓')
    setTimeout(() => setLabel('İstatistikleri Paylaş'), 2000)
  }

  return (
    <Modal title="İstatistikler" onClose={onClose}>
      <div className="stats-row">
        <div className="stat">
          <div className="stat-value">{stats.played}</div>
          <div className="stat-label">Oynanan</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.won}</div>
          <div className="stat-label">Kazanılan</div>
        </div>
        <div className="stat">
          <div className="stat-value">%{stats.winPct}</div>
          <div className="stat-label">Kazanma</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Seri</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.maxStreak}</div>
          <div className="stat-label">En Uzun Seri</div>
        </div>
      </div>
      <div className="rank-badge">
        🎬 {rank}
        {next && (
          <small>
            Sonraki rütbe: {next[1]} ({next[0] - stats.won} galibiyet kaldı)
          </small>
        )}
      </div>
      <p className="modal-mini-heading">Tahmin Dağılımı</p>
      <div className="dist">
        {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map((n) => {
          const v = stats.dist[n] || 0
          return (
            <div className="dist-row" key={n}>
              <span className="n">{n}</span>
              <div className={`dist-bar ${n === hl ? 'hl' : ''}`} style={{ width: `${Math.max(8, (v / maxDist) * 100)}%` }}>
                {v}
              </div>
            </div>
          )
        })}
      </div>
      <div className="buttons-group">
        <button className="mainButton share-results-btn" style={{ marginBottom: 0 }} onClick={share}>
          {label}
        </button>
      </div>
    </Modal>
  )
}
