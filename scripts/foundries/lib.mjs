import { inflateSync } from 'node:zlib'

// Image dimensions from the first bytes of the file, so the carousel can
// reserve each slot before the picture arrives. PNG, GIF, JPEG, WebP and SVG
// (its width and height, else its viewBox); anything else comes back null and
// the source drops it.
export async function imageSize(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-131071' }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return parseSize(new Uint8Array(await res.arrayBuffer()))
  } catch {
    return null
  }
}

function parseSize(b) {
  const svg = new TextDecoder().decode(b.subarray(0, 4096)).match(/<svg\b[^>]*>/)
  if (svg) {
    const attr = name => parseFloat((svg[0].match(new RegExp(`\\s${name}="([\\d.]+)(px)?"`)) || [])[1])
    const box = (svg[0].match(/viewBox="[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/) || []).slice(1).map(Number)
    const width = attr('width') || box[0]
    const height = attr('height') || box[1]
    return width && height ? { width: Math.round(width), height: Math.round(height) } : null
  }
  const be16 = i => (b[i] << 8) | b[i + 1]
  const be32 = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
  if (b[0] === 0x89 && b[1] === 0x50) return { width: be32(16), height: be32(20) }
  if (b[0] === 0x47 && b[1] === 0x49) return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) }
  // RIFF....WEBP, then one of three chunk layouts.
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {
    const le24 = i => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15])
    if (chunk === 'VP8X') return { width: 1 + le24(24), height: 1 + le24(27) }
    if (chunk === 'VP8 ') return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff }
    if (chunk === 'VP8L') {
      return {
        width: 1 + (((b[22] & 0x3f) << 8) | b[21]),
        height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)),
      }
    }
  }
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

// The two dates in a WOFF file's head table: when the font was first made and
// when it was last built, as YYYY-MM-DD. Null for a file without one.
export function woffDates(woff) {
  for (let i = 0; i < woff.readUInt16BE(12); i++) {
    const entry = 44 + i * 20
    if (woff.toString('ascii', entry, entry + 4) !== 'head') continue
    const [offset, length, origLength] = [4, 8, 12].map(k => woff.readUInt32BE(entry + k))
    let head = woff.subarray(offset, offset + length)
    if (length < origLength) head = inflateSync(head)
    // LONGDATETIME, seconds since 1904-01-01.
    const day = at => new Date((Number(head.readBigUInt64BE(at)) - 2082844800) * 1000).toISOString().slice(0, 10)
    return { created: day(20), modified: day(28) }
  }
  return null
}
