const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
export const StatsIcon = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
export const HelpIcon = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
)
export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
)
export const PrevIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
export const NextIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base}>
    <path d="M9 18l6-6-6-6" />
  </svg>
)
