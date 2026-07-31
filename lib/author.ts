/**
 * A few source records carry a bare URL or domain in the author/foundry field.
 * Never surface a raw link as the author — strip protocol/www and any path so
 * at worst we show a readable host. Proper names pass through untouched.
 */
export function cleanAuthor(raw: string): string {
  const s = (raw || '').trim()
  const looksLikeUrl = /^https?:\/\//i.test(s) || /^www\./i.test(s) || s.includes('/')
  const looksLikeDomain = /^[\w-]+\.(com|studio|xyz|io|fr|wtf|kitchen|design|net|org|co|de)$/i.test(s)
  if (!looksLikeUrl && !looksLikeDomain) return s
  const host = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
  return host || s
}
