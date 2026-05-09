/**
 * Static font database — reads from public/fonts/fonts-data.json at build time.
 * Zero runtime dependencies: no KV, no Blob, no external services.
 */

import type { FontFamily } from './models/FontFamily'
import type { FontVariant } from './models/FontVariant'

// Imported at build time and bundled — works on Vercel without filesystem access.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const raw = require('../public/fonts/fonts-data.json') as {
  families: Array<Record<string, unknown>>
  lastUpdated: string
}

function normalizeVariant(v: Record<string, unknown>): FontVariant {
  const filename = String(v.filename ?? '')
  const url = String(v.url ?? `/fonts/${filename}`)
  return {
    id: String(v.id ?? `variant_${filename}`),
    familyId: String(v.familyId ?? ''),
    filename,
    weight: Number(v.weight ?? 400),
    isItalic: Boolean(v.isItalic ?? false),
    styleName: String(v.styleName ?? 'Regular'),
    blobUrl: url,
    fileSize: Number(v.fileSize ?? 0),
    format: String(v.format ?? 'ttf'),
    isVariable: Boolean(v.isVariable ?? false),
    variableAxes: Array.isArray(v.variableAxes) ? (v.variableAxes as any[]) : [],
    openTypeFeatures: Array.isArray(v.openTypeFeatures) ? (v.openTypeFeatures as string[]) : [],
    openTypeFeatureTags: Array.isArray(v.openTypeFeatureTags) ? (v.openTypeFeatureTags as any[]) : [],
    fontMetrics: (v.fontMetrics as any) ?? undefined,
    glyphCount: v.glyphCount != null ? Number(v.glyphCount) : undefined,
    uploadedAt: String(v.uploadedAt ?? new Date().toISOString()),
    originalFilename: String(v.originalFilename ?? filename),
    parsedAt: v.parsedAt != null ? String(v.parsedAt) : undefined,
    parsingVersion: v.parsingVersion != null ? String(v.parsingVersion) : undefined,
    isDefaultStyle: Boolean(v.isDefaultStyle ?? false),
    published: Boolean(v.published ?? true),
  }
}

function normalizeFamily(f: Record<string, unknown>): FontFamily {
  const variants = Array.isArray(f.variants)
    ? (f.variants as Record<string, unknown>[]).map(normalizeVariant)
    : []
  return {
    id: String(f.id ?? `family_${f.name}`),
    name: String(f.name ?? 'Unknown'),
    collection: (f.collection as any) ?? 'Text',
    styleTags: Array.isArray(f.styleTags) ? (f.styleTags as string[]) : [],
    languages: Array.isArray(f.languages) ? (f.languages as string[]) : ['Latin'],
    category: Array.isArray(f.category) ? (f.category as string[]) : ['Sans'],
    foundry: String(f.foundry ?? 'Unknown'),
    defaultVariantId: f.defaultVariantId != null ? String(f.defaultVariantId) : undefined,
    isVariable: Boolean(f.isVariable ?? false),
    description: f.description != null ? String(f.description) : undefined,
    variants,
    published: Boolean(f.published ?? true),
    publishedAt: f.publishedAt != null ? String(f.publishedAt) : undefined,
    createdAt: String(f.createdAt ?? new Date().toISOString()),
    updatedAt: String(f.updatedAt ?? new Date().toISOString()),
    designerInfo: (f.designerInfo as any) ?? undefined,
    downloadLink: f.downloadLink != null
      ? String(f.downloadLink)
      : variants[0]?.blobUrl ?? undefined,
    licenseInfo: (f.licenseInfo as any) ?? undefined,
  }
}

export const staticDb = {
  getAllFamilies(): FontFamily[] {
    return (raw.families as Record<string, unknown>[])
      .map(normalizeFamily)
      .filter(f => f.published && f.variants.length > 0)
  },

  getFamilyById(id: string): FontFamily | undefined {
    return this.getAllFamilies().find(f => f.id === id)
  },

  lastUpdated: raw.lastUpdated,
}
