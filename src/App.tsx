import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import { Game } from './components/Game'
import { PreviousGames } from './components/PreviousGames'
import { AboutModal, HowToPlayModal, StatsModal, type ModalKind } from './components/Modals'
import { todayNumber } from './lib/game'

function PuzzleRoute({ showToast }: { showToast: (t: string) => void }) {
  const { id } = useParams()
  const n = Number(id)
  const today = todayNumber()
  if (!Number.isInteger(n) || n < 1 || n > today) return <Navigate to="/" replace />
  return <Game num={n} showToast={showToast} />
}

export default function App() {
  const [modal, setModal] = useState<ModalKind>('none')
  const [toast, setToast] = useState<string | null>(null)
  const close = useCallback(() => setModal('none'), [])
  const showToast = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(null), 2200)
  }, [])

  // ilk ziyarette "nasıl oynanır" göster
  useEffect(() => {
    try {
      if (!localStorage.getItem('fg:seen-howto')) {
        setModal('howto')
        localStorage.setItem('fg:seen-howto', '1')
      }
    } catch {}
  }, [])

  return (
    <BrowserRouter>
      <div className="App">
        <Header openModal={setModal} />
        <Routes>
          <Route path="/" element={<Game num={todayNumber()} showToast={showToast} />} />
          <Route path="/p/:id" element={<PuzzleRoute showToast={showToast} />} />
          <Route path="/onceki-gunler" element={<PreviousGames />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {modal === 'howto' && <HowToPlayModal onClose={close} />}
        {modal === 'about' && <AboutModal onClose={close} />}
        {modal === 'stats' && <StatsModal onClose={close} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </BrowserRouter>
  )
}
