'use client'

interface NavbarProps {
  theme: { fg: string; bg: string }
}

export function Navbar({ theme }: NavbarProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '440px',
      zIndex: 50,
    }}>
      <header className="p-4 flex-shrink-0 v2-card" style={{ color: theme.fg }}>
        <div className="flex items-center gap-4">
          <a
            href="/"
            style={{
              fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
              fontFamily: 'Inter Variable',
              fontSize: '22px',
              fontWeight: 900,
              lineHeight: '100%',
              textTransform: 'lowercase',
              color: theme.fg,
              textDecoration: 'none',
            }}
          >
            typedump<sup style={{ fontWeight: 400, fontSize: '12px' }}> β</sup>
          </a>
        </div>
      </header>
    </div>
  )
}
