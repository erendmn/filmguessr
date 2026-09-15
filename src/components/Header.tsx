import { Link } from 'react-router-dom'
import { CalendarIcon, HelpIcon, InfoIcon, StatsIcon } from './Icons'
import type { ModalKind } from './Modals'

export function Header({ openModal }: { openModal: (m: ModalKind) => void }) {
  return (
    <header className="Header">
      <Link to="/" className="Logo">
        <span className="clap">🎬</span>
        <span>
          Film<span className="accent">Guessr</span>
          <small>Günlük Türk filmi bulmaca</small>
        </span>
      </Link>
      <Link to="/onceki-gunler" className="iconBtn" title="Önceki Günler" aria-label="Önceki Günler">
        <CalendarIcon />
      </Link>
      <button className="iconBtn" onClick={() => openModal('stats')} title="İstatistikler" aria-label="İstatistikler">
        <StatsIcon />
      </button>
      <button className="iconBtn" onClick={() => openModal('howto')} title="Nasıl Oynanır?" aria-label="Nasıl Oynanır?">
        <HelpIcon />
      </button>
      <button className="iconBtn" onClick={() => openModal('about')} title="Hakkında" aria-label="Hakkında">
        <InfoIcon />
      </button>
    </header>
  )
}
