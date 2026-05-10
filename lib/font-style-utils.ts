export function getFontFeatureSettings(otFeatures: Record<string, boolean>): string | undefined {
  const active = Object.entries(otFeatures)
    .filter(([, on]) => on)
    .map(([f]) => `"${f}" 1`)
  return active.length ? active.join(', ') : undefined
}

export function getFontVariationSettings(axes: Record<string, number>): string | undefined {
  const settings = Object.entries(axes).map(([axis, val]) => `"${axis}" ${val}`)
  return settings.length ? settings.join(', ') : undefined
}
