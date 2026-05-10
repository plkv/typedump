'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

interface NavbarProps {
  sidebarOpen: boolean
  onSidebarToggle: () => void
  isMobile: boolean
  theme: { fg: string; bg: string }
}

export function Navbar({ sidebarOpen, onSidebarToggle, isMobile, theme }: NavbarProps) {
  const pathname = usePathname()

  return (
    <div style={{ padding: '16px' }}>
      <header className="p-4 flex-shrink-0 v2-card" style={{ color: theme.fg, zIndex: 20 }}>
        <div className="flex items-center justify-between">

          {/* Left: sidebar toggle + logo */}
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={onSidebarToggle} className="icon-btn">
                <span className="material-symbols-outlined" style={{ fontWeight: 400, fontSize: '20px' }}>
                  side_navigation
                </span>
              </button>
            )}
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

          {/* Right: nav links */}
          <div className="flex items-center gap-4">
            {isMobile ? (
              <MobileMenu pathname={pathname} theme={theme} />
            ) : (
              <DesktopMenu pathname={pathname} />
            )}
          </div>

        </div>
      </header>
    </div>
  )
}

function DesktopMenu({ pathname }: { pathname: string }) {
  return (
    <>
      <nav className="flex flex-row gap-2">
        <a href="/" className={`menu-tab ${pathname === '/' ? 'active' : ''}`}>Library</a>
        <a href="/about" className={`menu-tab ${pathname === '/about' ? 'active' : ''}`}>About</a>
      </nav>
      <a href="mailto:make@logictomagic.com" className="icon-btn" title="Send feedback">
        <span className="material-symbols-outlined" style={{ fontWeight: 400, fontSize: '20px' }}>flag_2</span>
      </a>
    </>
  )
}

function MobileMenu({ pathname, theme }: { pathname: string; theme: { fg: string; bg: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen((v: boolean) => !v)} className="icon-btn">
        <span className="material-symbols-outlined" style={{ fontWeight: 400, fontSize: '20px' }}>
          {open ? 'close' : 'menu'}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 flex flex-col gap-1 p-2 rounded-lg shadow-lg"
          style={{ backgroundColor: theme.bg, border: '1px solid var(--gray-brd-prim)', minWidth: '120px' }}
        >
          <a href="/" className={`menu-tab ${pathname === '/' ? 'active' : ''}`} onClick={() => setOpen(false)}>Library</a>
          <a href="/about" className={`menu-tab ${pathname === '/about' ? 'active' : ''}`} onClick={() => setOpen(false)}>About</a>
          <a href="mailto:make@logictomagic.com" className="menu-tab" onClick={() => setOpen(false)}>Feedback</a>
        </div>
      )}
    </div>
  )
}
