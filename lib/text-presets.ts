// Brand lines for the Brands preset, shared by the catalogue cards and the font
// page. Each line mixes names with digits (the figures that carry the most
// alternates) and names with diacritics, so a set shows both at once. Every
// name here also has to be listed in PRESET_CHARS in
// scripts/build-preview-subsets.py, or the cut previews will miss its letters.
export const BRAND_SETS = [
  'Maison Margiela • Dries Van Noten • 1017 Alyx 9SM • Our Legacy • Porsche 911 • Kazimir Malevich • A-Cold-Wall* • Röyksopp • Levi\'s 501 • Sébastien Tellier • Y/Project • Man Ray • Rimowa • Figma • OpenAI',
  'Acne Studios • Arc\'teryx • Dr. Martens 1460 • Depeche Mode • Aimé Leon Dore • Y-3 • László Moholy-Nagy • Klarna • Boeing 747 • Justice • Off-White • El Lissitzky • 032c • Notion',
  'Byredo • Chanel N°5 • Nôze • Maison Margiela • 37signals • Erlend Øye • New Balance 990 • Hannah Höch • Roland TR-808 • Balenciaga • Leica M6 • Marcel Duchamp • 1Password • SpaceX',
  'OpenAI • Our Legacy • Porsche 911 • Röyksopp • Arc\'teryx • Y-3 • Sonia Delaunay • Klarna • Depeche Mode • Levi\'s 501 • Byredo • Roland TR-808 • Acne Studios • Nôze',
]

export function randomBrandSet(): string {
  return BRAND_SETS[Math.floor(Math.random() * BRAND_SETS.length)]
}
