import Link from 'next/link'

// ─── helpers ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--gray-cont-tert)', marginBottom: 24, paddingBottom: 12,
        borderBottom: '1px solid var(--gray-brd-prim)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginTop: 8, fontFamily: 'var(--font-space-mono)' }}>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>{children}</div>
}

function HardcodeTag({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      display: 'inline-block', fontSize: 11, padding: '2px 6px', borderRadius: 4,
      backgroundColor: 'rgba(255,80,80,0.12)', color: '#ff5050',
      fontFamily: 'var(--font-space-mono)',
    }}>
      {children}
    </code>
  )
}

// ─── color swatch ────────────────────────────────────────────────────────────

function Swatch({ varName, note }: { varName: string; note?: string }) {
  return (
    <div style={{ width: 120 }}>
      <div style={{
        width: '100%', height: 48, borderRadius: 10,
        backgroundColor: `var(${varName})`,
        border: '1px solid var(--gray-brd-prim)',
      }} />
      <Label>{varName}{note && <><br /><span style={{ color: 'var(--gray-cont-quart)' }}>{note}</span></>}</Label>
    </div>
  )
}

// ─── component demo ──────────────────────────────────────────────────────────

function ComponentDemo({ name, source, children }: { name: string; source: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-cont-prim)' }}>{name}</span>
        <code style={{ fontSize: 11, color: 'var(--gray-cont-tert)', fontFamily: 'var(--font-space-mono)' }}>{source}</code>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <div style={{ backgroundColor: 'var(--gray-surface-prim)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--gray-cont-tert)', textDecoration: 'none' }}>← Library</Link>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginTop: 16, color: 'var(--gray-cont-prim)' }}>
            Design System
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gray-cont-sec)', marginTop: 8 }}>
            Foundation tokens, components, and hardcoded values audit — <code style={{ fontFamily: 'var(--font-space-mono)', fontSize: 12 }}>globals.css</code> + <code style={{ fontFamily: 'var(--font-space-mono)', fontSize: 12 }}>v2/v2.css</code>
          </p>
        </div>

        {/* ── FOUNDATION ──────────────────────────────────────────────────── */}

        <Section title="Colors — gray tokens (globals.css)">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 20 }}>
            Light: base <HardcodeTag>#0a0a0a</HardcodeTag> / Dark: base <HardcodeTag>#fcfcfc</HardcodeTag>. Theme via <code style={{ fontSize: 11, fontFamily: 'var(--font-space-mono)' }}>prefers-color-scheme</code>, no manual toggle.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginBottom: 12 }}>Content</div>
              <Row>
                <Swatch varName="--gray-cont-prim" />
                <Swatch varName="--gray-cont-sec" note="64% opacity" />
                <Swatch varName="--gray-cont-tert" note="40% opacity" />
                <Swatch varName="--gray-cont-quart" note="24% opacity" />
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginBottom: 12 }}>Accent</div>
              <Row>
                <Swatch varName="--gray-accent-prim" />
                <Swatch varName="--gray-accent-sec" />
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginBottom: 12 }}>Fill</div>
              <Row>
                <Swatch varName="--gray-fill-prim" note="4% opacity" />
                <Swatch varName="--gray-fill-sec" note="8% opacity" />
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginBottom: 12 }}>Borders</div>
              <Row>
                <Swatch varName="--gray-brd-prim" note="8% opacity" />
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginBottom: 12 }}>Surfaces</div>
              <Row>
                <Swatch varName="--gray-surface-prim" />
                <Swatch varName="--gray-surface-sec" />
              </Row>
            </div>
          </div>
        </Section>

        <Section title="Colors — misc tokens">
          <Row>
            <Swatch varName="--misc-cont-inverse" note="inverse of surface" />
            <Swatch varName="--misc-cont-sec" />
            <Swatch varName="--misc-cont-tert" />
          </Row>
        </Section>

        <Section title="Colors — v2 component tokens (v2/v2.css)">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 20 }}>
            Hardcoded hex inside the token — <HardcodeTag>--v2-active-bg: #0a0a0a</HardcodeTag> / dark: <HardcodeTag>#fcfcfc</HardcodeTag>. Used by v2-button-active and download-btn.
          </p>
          <Row>
            <Swatch varName="--v2-active-bg" />
            <Swatch varName="--v2-active-fg" />
            <Swatch varName="--v2-inactive-bg" />
            <Swatch varName="--v2-inactive-fg" />
            <Swatch varName="--v2-card-bg" />
            <Swatch varName="--v2-card-border" />
            <Swatch varName="--v2-shimmer-base" />
            <Swatch varName="--v2-shimmer-highlight" />
          </Row>
        </Section>

        <Section title="Colors — shadcn/radix tokens (globals.css)">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 20 }}>
            Used by admin pages and shadcn components only. Main catalog UI does not reference these.
          </p>
          <Row>
            <Swatch varName="--background" />
            <Swatch varName="--foreground" />
            <Swatch varName="--primary" />
            <Swatch varName="--primary-foreground" />
            <Swatch varName="--secondary" />
            <Swatch varName="--secondary-foreground" />
            <Swatch varName="--muted" />
            <Swatch varName="--muted-foreground" />
            <Swatch varName="--border" />
            <Swatch varName="--input" />
            <Swatch varName="--ring" />
          </Row>
        </Section>

        <Section title="Typography — interface fonts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <div style={{ fontSize: 32, fontFamily: 'var(--font-inter)', fontWeight: 500, color: 'var(--gray-cont-prim)' }}>
                Inter Variable
              </div>
              <Label>--font-inter · loaded via next/font/google · main UI font</Label>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {[300, 400, 500, 600, 700].map(w => (
                  <span key={w} style={{ fontFamily: 'var(--font-inter)', fontWeight: w, fontSize: 14, color: 'var(--gray-cont-prim)' }}>
                    {w} The quick brown fox
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontFamily: 'var(--font-space-grotesk)', fontWeight: 500, color: 'var(--gray-cont-prim)' }}>
                Space Grotesk
              </div>
              <Label>--font-space-grotesk · alias: --font-serif in Tailwind theme · used in: unknown</Label>
            </div>
            <div>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-space-mono)', fontWeight: 400, color: 'var(--gray-cont-prim)' }}>
                Space Mono
              </div>
              <Label>--font-space-mono · alias: --font-mono in Tailwind theme · used for: code labels</Label>
            </div>
          </div>
        </Section>

        <Section title="Typography — utility classes (globals.css)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="text-sidebar-title">Sidebar title · .text-sidebar-title</div>
              <Label>.text-sidebar-title — Inter Variable 12/14 500, cv06+cv11+ss03</Label>
            </div>
            <div>
              <div className="text-font-name">Font name · .text-font-name</div>
              <Label>.text-font-name — Inter Variable 14/20 500</Label>
            </div>
            <div>
              <div className="text-menu">Menu item · .text-menu</div>
              <Label>.text-menu — same spec as .text-font-name</Label>
            </div>
            <div>
              <div className="text-author">by Some Author · .text-author</div>
              <Label>.text-author — Inter Variable 14/20 500, color: --gray-cont-tert</Label>
            </div>
          </div>
        </Section>

        <Section title="Radius">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 20 }}>
            Token <code style={{ fontFamily: 'var(--font-space-mono)', fontSize: 11 }}>--radius: 0.625rem (10px)</code> from shadcn. Components use <HardcodeTag>border-radius: 12px</HardcodeTag> (badges, buttons) and <HardcodeTag>border-radius: 16px</HardcodeTag> (cards) hardcoded in v2.css — not referencing the token.
          </p>
          <Row>
            {[
              { r: 'calc(var(--radius) - 4px)', label: '--radius-sm · 6px' },
              { r: 'calc(var(--radius) - 2px)', label: '--radius-md · 8px' },
              { r: 'var(--radius)', label: '--radius-lg · 10px' },
              { r: 'calc(var(--radius) + 4px)', label: '--radius-xl · 14px' },
              { r: '12px', label: 'hardcoded 12px (badge/btn)', hard: true },
              { r: '16px', label: 'hardcoded 16px (card)', hard: true },
            ].map(({ r, label, hard }) => (
              <div key={label}>
                <div style={{
                  width: 80, height: 48,
                  borderRadius: r,
                  backgroundColor: hard ? 'rgba(255,80,80,0.1)' : 'var(--gray-fill-sec)',
                  border: `1px solid ${hard ? 'rgba(255,80,80,0.3)' : 'var(--gray-brd-prim)'}`,
                }} />
                <Label>{label}</Label>
              </div>
            ))}
          </Row>
        </Section>

        <Section title="Spacing">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-sec)' }}>
            No spacing tokens defined. All spacing is <HardcodeTag>hardcoded inline</HardcodeTag> — px values in inline styles (page.tsx, FontDetail.tsx) and in v2.css class definitions (padding: 13px 12px, etc.).
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48].map(s => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div style={{
                  width: s, height: s,
                  backgroundColor: 'var(--gray-fill-sec)',
                  border: '1px solid var(--gray-brd-prim)',
                  borderRadius: 2,
                }} />
                <div style={{ fontSize: 10, color: 'var(--gray-cont-tert)', marginTop: 4 }}>{s}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── COMPONENTS ──────────────────────────────────────────────────── */}

        <Section title="Components — v2 catalog (v2/v2.css)">

          <ComponentDemo name="Badge" source=".v2-badge">
            <div className="v2-badge">Label</div>
            <div className="v2-badge">4 styles</div>
            <div className="v2-badge">Variable</div>
          </ComponentDemo>

          <ComponentDemo name="Button — active" source=".v2-button .v2-button-active">
            <button className="v2-button v2-button-active">Get font</button>
            <button className="v2-button v2-button-active">Download</button>
          </ComponentDemo>

          <ComponentDemo name="Button — inactive" source=".v2-button .v2-button-inactive">
            <button className="v2-button v2-button-inactive">Inactive</button>
            <button className="v2-button v2-button-inactive">Cancel</button>
          </ComponentDemo>

          <ComponentDemo name="Approach button" source=".v2-approach-button">
            <button className="v2-approach-button v2-button-inactive" style={{ minWidth: 80 }}>
              <span>Ag</span>
              <span>Text</span>
            </button>
            <button className="v2-approach-button v2-button-active" style={{ minWidth: 80 }}>
              <span>Ag</span>
              <span>Display</span>
            </button>
          </ComponentDemo>

          <ComponentDemo name="Card" source=".v2-card">
            <div className="v2-card" style={{ padding: 20, width: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--gray-cont-prim)' }}>Card content</div>
            </div>
          </ComponentDemo>

          <ComponentDemo name="Dropdown" source=".v2-dropdown">
            <div className="v2-dropdown" style={{ display: 'flex', alignItems: 'center' }}>
              <select style={{ padding: '10px 36px 10px 12px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500 }}>
                <option>Regular</option>
                <option>Bold</option>
              </select>
            </div>
          </ComponentDemo>

          <ComponentDemo name="Shimmer" source=".v2-shimmer">
            <div className="v2-shimmer" style={{ width: 200, height: 24, borderRadius: 6 }} />
            <div className="v2-shimmer" style={{ width: 120, height: 24, borderRadius: 6 }} />
          </ComponentDemo>

        </Section>

        <Section title="Components — utility (globals.css)">

          <ComponentDemo name="Button sm" source=".btn-sm">
            <button className="btn-sm">Default</button>
            <button className="btn-sm active">Active</button>
          </ComponentDemo>

          <ComponentDemo name="Button md" source=".btn-md">
            <button className="btn-md">Default</button>
            <button className="btn-md active">Active</button>
          </ComponentDemo>

          <ComponentDemo name="Menu tab" source=".menu-tab">
            <a href="#" className="menu-tab">Library</a>
            <a href="#" className="menu-tab active">About</a>
          </ComponentDemo>

          <ComponentDemo name="Icon button" source=".icon-btn">
            <button className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>tune</span>
            </button>
            <button className="icon-btn active">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </ComponentDemo>

          <ComponentDemo name="Download button" source=".download-btn">
            <button className="download-btn">Get font</button>
          </ComponentDemo>

          <ComponentDemo name="Dropdown wrap" source=".dropdown-wrap + .dropdown-select">
            <div className="dropdown-wrap">
              <select className="dropdown-select">
                <option>Sans-serif</option>
                <option>Serif</option>
              </select>
              <span className="dropdown-icon material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
            </div>
          </ComponentDemo>

          <ComponentDemo name="Segmented control" source=".segmented-control + .segmented-control-button">
            <div className="segmented-control" style={{ width: 240 }}>
              <button className="segmented-control-button active">
                <span>Ag</span>
                <span>Text</span>
              </button>
              <button className="segmented-control-button">
                <span>Ag</span>
                <span>Display</span>
              </button>
              <button className="segmented-control-button">
                <span>Ag</span>
                <span>Weirdo</span>
              </button>
            </div>
          </ComponentDemo>

        </Section>

        <Section title="Components — ds-* utilities (globals.css)">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 20 }}>
            Semantic aliases over gray tokens. Usage in codebase: sparse — mostly defined, not actively used.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['ds-bg-surface', 'background: --gray-surface-prim'],
              ['ds-bg-surface-2', 'background: --gray-surface-sec'],
              ['ds-bg-fill-1', 'background: --gray-fill-prim'],
              ['ds-bg-fill-2', 'background: --gray-fill-sec'],
              ['ds-text-prim', 'color: --gray-cont-prim'],
              ['ds-text-sec', 'color: --gray-cont-sec'],
              ['ds-text-tert', 'color: --gray-cont-tert'],
              ['ds-text-quart', 'color: --gray-cont-quart'],
              ['ds-text-inverse', 'color: --misc-cont-inverse'],
              ['ds-border', 'border-color: --gray-brd-prim'],
            ].map(([cls, note]) => (
              <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <code style={{ fontSize: 11, fontFamily: 'var(--font-space-mono)', width: 160, color: 'var(--gray-cont-prim)' }}>.{cls}</code>
                <div style={{ fontSize: 12, color: 'var(--gray-cont-tert)' }}>→ {note}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── HARDCODED AUDIT ─────────────────────────────────────────────── */}

        <Section title="Hardcoded values audit">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                loc: 'v2/v2.css: --v2-active-bg, --v2-active-fg',
                issue: 'Hardcoded hex #0a0a0a / #fcfcfc inside token definition instead of referencing --gray-surface-prim / --gray-cont-prim',
                values: ['#0a0a0a', '#fcfcfc'],
              },
              {
                loc: 'globals.css: .download-btn (light/dark @media)',
                issue: 'Hardcoded #fcfcfc, #0a0a0a for contrast — intentional, but duplicates the invert pattern already in --v2-active-*',
                values: ['#0a0a0a', '#fcfcfc', 'rgba(10,10,10,0.8)', 'rgba(252,252,252,0.8)'],
              },
              {
                loc: 'v2/v2.css: .v2-badge, .v2-button, .v2-card',
                issue: 'border-radius hardcoded to 12px and 16px, not referencing --radius token',
                values: ['border-radius: 12px', 'border-radius: 16px'],
              },
              {
                loc: 'app/page.tsx, app/v2/page.tsx: inline styles',
                issue: 'All spacing, most colors via var() tokens (fine), but padding/gap/margin values are hardcoded numbers (px) throughout',
                values: ['padding: 48px 24px', 'gap: 12', 'marginBottom: 16', '…'],
              },
              {
                loc: 'app/font/[slug]/FontDetail.tsx: inline styles',
                issue: 'New detail page uses only inline styles — no classes at all. All spacing and colors hardcoded as string literals',
                values: ['padding: 48px 24px 40px', 'fontSize: 13', 'fontSize: clamp(48px, 8vw, 120px)'],
              },
              {
                loc: 'layout.tsx: metadataBase URL',
                issue: 'Old Vercel URL still hardcoded',
                values: ['https://baseline-fonts.vercel.app'],
              },
            ].map(({ loc, issue, values }) => (
              <div key={loc} style={{
                padding: 16, borderRadius: 10,
                backgroundColor: 'rgba(255,80,80,0.06)',
                border: '1px solid rgba(255,80,80,0.15)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-cont-prim)', marginBottom: 4, fontFamily: 'var(--font-space-mono)' }}>
                  {loc}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-cont-sec)', marginBottom: 8 }}>{issue}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {values.map(v => <HardcodeTag key={v}>{v}</HardcodeTag>)}
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
