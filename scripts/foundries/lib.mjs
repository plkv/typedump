// Image dimensions from the first bytes of the file, so the carousel can
// reserve each slot before the picture arrives. PNG, GIF and JPEG cover every
// foundry so far; anything else comes back null and the page sizes it on load.
export async function imageSize(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-131071' } })
    if (!res.ok) return null
    return parseSize(new Uint8Array(await res.arrayBuffer()))
  } catch {
    return null
  }
}

function parseSize(b) {
  const be16 = i => (b[i] << 8) | b[i + 1]
  const be32 = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
  if (b[0] === 0x89 && b[1] === 0x50) return { width: be32(16), height: be32(20) }
  if (b[0] === 0x47 && b[1] === 0x49) return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null
      const marker = b[i + 1]
      // SOF0–SOF15 carry the frame size; C4, C8 and CC are tables, not frames.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: be16(i + 7), height: be16(i + 5) }
      }
      i += 2 + be16(i + 2)
    }
  }
  return null
}
