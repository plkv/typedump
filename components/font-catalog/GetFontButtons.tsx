import { IconGitHub, IconGitLab } from '@/components/icons'

// The download pair shared by the catalogue card and the font page. "Get font"
// opens the designer's own site, or downloads our zip (desktop and web files
// with the licence) where there is none; a font that also lives in a public
// repository gets that as an icon button beside it. The main button sits on
// the right.
export function GetFontButtons({ name, downloadLink, gitLink }: { name: string; downloadLink?: string; gitLink?: string }) {
  const track = (event: string) => (window as any).gtag?.('event', event, { font_name: name })
  const isZip = downloadLink?.endsWith('.zip')
  const host = gitLink ? new URL(gitLink).hostname : ''
  const GitIcon = host.includes('github') ? IconGitHub : IconGitLab
  return (
    <>
      {gitLink && (
        <a
          href={gitLink}
          target="_blank"
          rel="noopener noreferrer"
          className="v2-badge v2-badge-icon v2-button-inactive"
          aria-label={`${name} on ${host.includes('github') ? 'GitHub' : 'GitLab'}`}
          title={host.includes('github') ? 'GitHub' : 'GitLab'}
          onClick={() => track('open_repo')}
        >
          <GitIcon size={16} />
        </a>
      )}
      {downloadLink && (
        <a
          href={downloadLink}
          {...(isZip ? { download: '' } : { target: '_blank', rel: 'noopener noreferrer' })}
          className="v2-badge v2-button-active"
          onClick={() => track('get_font')}
        >
          Get font
        </a>
      )}
    </>
  )
}
