export const TYPETRAY_URL = 'https://typetray.plkv.works/'

// GA4's automatic outbound-click event did not fire for this link when
// checked on the live site, so clicks are sent explicitly. `placement` tells
// the navbar icon, the link in the hero copy and the one on a font's page.
export function trackTypeTrayClick(placement: 'navbar' | 'hero' | 'font_page') {
  ;(window as any).gtag?.('event', 'typetray_click', { placement })
}
