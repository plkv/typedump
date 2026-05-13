'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { familyToSlug } from '@/lib/font-slug'
import { IconSearch, IconXMark, IconChevronLeft } from '@/components/icons'

interface FontSearchItem {
  name: string
  author: string
}

interface NavbarProps {
  theme?: { fg: string; bg: string }
  fonts?: FontSearchItem[]
  back?: boolean
}

const EASE_OPEN  = 'cubic-bezier(0.34, 1.12, 0.64, 1)'
const EASE_CLOSE = 'cubic-bezier(0.4, 0, 0.6, 1)'

export function Navbar({ fonts = [], back = false }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (pathname === '/') {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      router.push('/', { scroll: true })
    }
  }

  // When back is present, back island (54px) + gap (6px) = 60px offset from left
  const leftOffset = back ? 60 : 0
  const logoLeft = back ? '60px' : '0'
  const logoWidthClosed = back ? 'calc(100% - 120px)' : 'calc(100% - 60px)'
  const searchWidthOpen = back ? 'calc(100% - 120px)' : 'calc(100% - 60px)'

  const results = query.trim().length > 0
    ? fonts.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.author.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : []

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 49,
        background: 'var(--v2-dim)',
        opacity: searchOpen ? 1 : 0,
        pointerEvents: searchOpen ? 'auto' : 'none',
        transition: 'opacity 0.3s',
      }} onClick={closeSearch} />

      {/* Nav container */}
      <div
        className="navbar-container"
        style={{
          transform: 'translateX(-50%) translateY(-20px)',
          animation: `v2NavSlideTop 0.4s ${EASE_OPEN} forwards`,
        }}
      >
        {/* Island 0: Back — optional, fixed 54px at left edge */}
        {back && (
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back()
              } else {
                router.push('/')
              }
            }}
            className="navbar-back-island v2-card v2-overlay"
            style={{
              left: 0,
              width: '54px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--gray-cont-prim)',
            }}
          >
            <IconChevronLeft size={20} />
          </button>
        )}

        {/* Island 1: Logo — fills remaining left space, collapses to 0 */}
        <header
          className="navbar-logo-island v2-card v2-overlay"
          style={{
            left: logoLeft,
            width: searchOpen ? 0 : logoWidthClosed,
            opacity: searchOpen ? 0 : 1,
            overflow: 'hidden',
            pointerEvents: searchOpen ? 'none' : 'auto',
            transition: searchOpen
              ? `width 0.25s ${EASE_OPEN}, opacity 0.15s, background-color 0.2s`
              : `width 0.22s ${EASE_CLOSE}, opacity 0.15s 0.15s, background-color 0.2s`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <a
            href="/"
            onClick={handleLogoClick}
            tabIndex={searchOpen ? -1 : 0}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%',
              fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
              fontFamily: 'var(--font-inter), "Inter Variable", system-ui, -apple-system, sans-serif',
              fontSize: '22px', fontWeight: 900, lineHeight: '100%',
              textTransform: 'lowercase',
              color: 'var(--gray-cont-prim)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            typedump<sup style={{ fontWeight: 400, fontSize: '12px' }}> β</sup>
          </a>
        </header>

        {/* Island 2: Search — icon always visible, expands leftward */}
        <div
          className={`navbar-search-island v2-card v2-overlay${!searchOpen ? ' navbar-search-island-btn' : ''}`}
          style={{
            right: searchOpen ? '60px' : '0',
            width: searchOpen ? searchWidthOpen : '54px',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center',
            cursor: searchOpen ? 'default' : 'pointer',
            transition: searchOpen
              ? `right 0.25s ${EASE_OPEN}, width 0.25s ${EASE_OPEN}, background-color 0.2s`
              : `right 0.22s ${EASE_CLOSE}, width 0.22s ${EASE_CLOSE}, background-color 0.2s`,
          }}
          onClick={!searchOpen ? () => setSearchOpen(true) : undefined}
        >
          <div style={{
            width: '54px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gray-cont-prim)',
          }}>
            <IconSearch size={20} />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && closeSearch()}
            placeholder="Font name, Author, Foundry…"
            tabIndex={searchOpen ? 0 : -1}
            style={{
              flex: 1, minWidth: 0, paddingRight: '16px',
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: '"Inter Variable", sans-serif',
              fontSize: '16px', fontWeight: 500,
              color: 'var(--gray-cont-prim)',
              caretColor: 'var(--gray-cont-prim)',
              opacity: searchOpen ? 1 : 0,
              transition: `opacity 0.15s ${searchOpen ? '0.2s' : '0s'}`,
              pointerEvents: searchOpen ? 'auto' : 'none',
            }}
          />
        </div>

        {/* Island 3: Close — scale+fade, width handles layout */}
        <button
          className="navbar-close-island v2-card v2-overlay"
          onClick={closeSearch}
          style={{
            right: 0,
            width: searchOpen ? '54px' : '0',
            opacity: searchOpen ? 1 : 0,
            transform: `scale(${searchOpen ? 1 : 0.75})`,
            overflow: 'hidden',
            border: 'none', cursor: 'pointer',
            color: 'var(--gray-cont-prim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: searchOpen ? 'auto' : 'none',
            transition: searchOpen
              ? `width 0.22s ${EASE_OPEN}, opacity 0.15s 0.08s, transform 0.2s ${EASE_OPEN} 0.08s, background-color 0.2s`
              : `opacity 0.15s, transform 0.15s ${EASE_CLOSE}, width 0.12s ${EASE_CLOSE} 0.14s, background-color 0.2s`,
          }}
        >
          <IconXMark size={20} style={{ flexShrink: 0 }} />
        </button>

        {/* Dropdown */}
        {searchOpen && (results.length > 0 || query.trim().length > 0) && (
          <div
            className="v2-card v2-overlay"
            style={{
              position: 'absolute', top: '62px', left: leftOffset, right: 0,
              overflow: 'hidden', maxHeight: '60vh', overflowY: 'auto',
            }}
          >
            {results.length > 0 ? results.map(font => (
              <a
                key={font.name}
                href={`/font/${familyToSlug(font.name)}`}
                onClick={closeSearch}
                className="v2-search-result"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '12px 16px', textDecoration: 'none', color: 'var(--gray-cont-prim)',
                  borderBottom: '1px solid var(--gray-brd-prim)', gap: '2px',
                }}
              >
                <span style={{ fontFamily: '"Inter Variable", sans-serif', fontSize: '14px', fontWeight: 500 }}>
                  {font.name}
                </span>
                <span style={{ fontFamily: '"Inter Variable", sans-serif', fontSize: '14px', fontWeight: 400, color: 'var(--gray-cont-tert)' }}>
                  {font.author}
                </span>
              </a>
            )) : (
              <div style={{ padding: '16px', color: 'var(--gray-cont-tert)', fontSize: '14px', fontFamily: '"Inter Variable", sans-serif' }}>
                No results for «{query}»
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
