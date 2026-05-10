import { FontMetadata } from './font-parser'

const KV_FONTS_KEY = 'fonts:metadata'

// Check if we're in production with Vercel storage available
const hasVercelStorage = process.env.BLOB_READ_WRITE_TOKEN && process.env.KV_REST_API_URL

// Dynamic imports for Vercel storage (only in production)
let put: any, del: any, kv: any

if (hasVercelStorage) {
  try {
    const blobModule = require('@vercel/blob')
    const kvModule = require('@vercel/kv')
    put = blobModule.put
    del = blobModule.del
    kv = kvModule.kv
  } catch (error) {
    console.warn('Vercel storage not available, using fallback')
  }
}

// In-memory fallback storage for development
let memoryFonts: FontMetadata[] = []

export class VercelFontStorage {
  
  async addFont(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    if (hasVercelStorage && put && kv) {
      try {
        console.log(`☁️ Using Vercel Blob storage for: ${fontMetadata.family}`)
        
        // Upload font file to Vercel Blob
        const blobFilename = `fonts/${fontMetadata.filename}`
        const blob = await put(blobFilename, fontBuffer, {
          access: 'public',
          contentType: this.getContentType(fontMetadata.format)
        })
        
        // Enhanced metadata with blob URL
        const enhancedMetadata = {
          ...fontMetadata,
          url: blob.url,
          uploadedAt: new Date().toISOString(),
          storage: 'vercel-blob'
        }
        
        // Store metadata in Vercel KV
        const existingFonts = await this.getAllFonts()
        const updatedFonts = existingFonts.filter(f => f.filename !== fontMetadata.filename)
        updatedFonts.push(enhancedMetadata)
        
        await kv.set(KV_FONTS_KEY, updatedFonts)
        
        console.log(`✅ Production: Font stored in Vercel Blob: ${fontMetadata.family} -> ${blob.url}`)
        return enhancedMetadata
        
      } catch (error) {
        console.error('Vercel Blob storage error:', error)
        console.log('Falling back to local storage')
        return this.fallbackAddFont(fontMetadata, fontBuffer)
      }
    } else {
      console.log(`📁 Using local file storage for: ${fontMetadata.family}`)
      return this.fallbackAddFont(fontMetadata, fontBuffer)
    }
  }

  private async fallbackAddFont(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    // Check if we're in a Node.js environment with filesystem access
    const hasFileSystem = typeof window === 'undefined' && typeof process !== 'undefined'
    
    if (hasFileSystem) {
      try {
        // Development: Save font file to public/fonts/ directory
        const fs = require('fs').promises
        const path = require('path')
        
        const fontsDir = path.join(process.cwd(), 'public', 'fonts')
        await fs.mkdir(fontsDir, { recursive: true })
        
        const fontPath = path.join(fontsDir, fontMetadata.filename)
        await fs.writeFile(fontPath, new Uint8Array(fontBuffer))
        
        // Enhanced metadata with consistent URL paths
        const enhancedMetadata = {
          ...fontMetadata,
          path: `/fonts/${fontMetadata.filename}`,
          url: `/fonts/${fontMetadata.filename}`,
          uploadedAt: new Date().toISOString(),
          storage: 'local'
        }
        
        // Store in memory for development
        memoryFonts = memoryFonts.filter(f => f.filename !== fontMetadata.filename)
        memoryFonts.push(enhancedMetadata)
        
        // Also save to JSON file for persistence during development
        const dataFile = path.join(fontsDir, 'fonts-data.json')
        await fs.writeFile(dataFile, JSON.stringify({
          fonts: memoryFonts,
          lastUpdated: new Date().toISOString()
        }, null, 2))
        
        console.log(`✅ Development: Font stored locally: ${fontMetadata.family} -> ${enhancedMetadata.url}`)
        return enhancedMetadata
        
      } catch (error) {
        console.error('Local file storage error:', error)
        // Fall through to memory-only storage
      }
    }
    
    // Production fallback: Memory-only storage (no persistence)
    const enhancedMetadata = {
      ...fontMetadata,
      url: undefined,
      uploadedAt: new Date().toISOString(),
      storage: 'memory-only',
      note: 'Font stored in memory only. Enable Vercel KV+Blob for persistence.'
    }
    
    // Store in memory (will be lost on restart)
    memoryFonts = memoryFonts.filter(f => f.filename !== fontMetadata.filename)
    memoryFonts.push(enhancedMetadata)
    
    console.log(`⚠️ Production fallback: Font stored in memory only: ${fontMetadata.family}`)
    console.log('💡 To enable persistent storage, configure Vercel KV and Blob in your dashboard')
    
    return enhancedMetadata
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    if (hasVercelStorage && kv) {
      try {
        // Production: Get fonts from Vercel KV
        const fonts = await kv.get(KV_FONTS_KEY) as FontMetadata[] | null
        return fonts || []
      } catch (error) {
        console.error('KV retrieval error:', error)
        return this.fallbackGetAllFonts()
      }
    } else {
      // Development: Get fonts from local storage
      return this.fallbackGetAllFonts()
    }
  }

  private async fallbackGetAllFonts(): Promise<FontMetadata[]> {
    // Check if we're in a Node.js environment with filesystem access
    const hasFileSystem = typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
    
    if (hasFileSystem) {
      try {
        // Development: Load from JSON file
        const fs = require('fs').promises
        const path = require('path')
        
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        const data = await fs.readFile(dataFile, 'utf-8')
        const db = JSON.parse(data)
        
        // Update memory cache
        memoryFonts = db.fonts || []
        return memoryFonts
        
      } catch (error) {
        console.log('No local font data file, returning memory cache')
        return memoryFonts
      }
    } else {
      // Production: Return memory cache only
      console.log('Production environment: returning memory-only font cache')
      return memoryFonts
    }
  }

  async removeFont(filename: string): Promise<boolean> {
    if (hasVercelStorage && del && kv) {
      try {
        // Production: Remove from Vercel Blob
        await del(`fonts/${filename}`)
        
        // Remove from KV metadata
        const existingFonts = await this.getAllFonts()
        const updatedFonts = existingFonts.filter(f => f.filename !== filename)
        await kv.set(KV_FONTS_KEY, updatedFonts)
        
        return true
      } catch (error) {
        console.error('Font removal error:', error)
        return false
      }
    } else {
      // Development: Remove from local storage
      return this.fallbackRemoveFont(filename)
    }
  }

  private async fallbackRemoveFont(filename: string): Promise<boolean> {
    // Check if we're in a Node.js environment with filesystem access
    const hasFileSystem = typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
    
    if (hasFileSystem) {
      try {
        const fs = require('fs').promises
        const path = require('path')
        
        // Remove font file
        const fontPath = path.join(process.cwd(), 'public', 'fonts', filename)
        await fs.unlink(fontPath)
        
        // Update memory and JSON
        memoryFonts = memoryFonts.filter(f => f.filename !== filename)
        
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        await fs.writeFile(dataFile, JSON.stringify({
          fonts: memoryFonts,
          lastUpdated: new Date().toISOString()
        }, null, 2))
        
        console.log(`✅ Development: Font removed: ${filename}`)
        return true
      } catch (error) {
        console.error('Fallback removal error:', error)
        return false
      }
    } else {
      // Production: Remove from memory cache only
      const initialLength = memoryFonts.length
      memoryFonts = memoryFonts.filter(f => f.filename !== filename)
      const removed = memoryFonts.length < initialLength
      
      if (removed) {
        console.log(`⚠️ Production: Font removed from memory only: ${filename}`)
      }
      return removed
    }
  }

  async updateFontMetadata(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    if (hasVercelStorage && kv) {
      try {
        // Production: Update in Vercel KV
        const existingFonts = await this.getAllFonts()
        const updatedFonts = existingFonts.map(font => 
          font.filename === filename ? { ...font, ...updates } : font
        )
        await kv.set(KV_FONTS_KEY, updatedFonts)
        return true
      } catch (error) {
        console.error('Metadata update error:', error)
        return false
      }
    } else {
      // Development: Update in local storage
      return this.fallbackUpdateMetadata(filename, updates)
    }
  }

  private async fallbackUpdateMetadata(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    // Check if we're in a Node.js environment with filesystem access
    const hasFileSystem = typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
    
    if (hasFileSystem) {
      try {
        // Update memory
        memoryFonts = memoryFonts.map(font => 
          font.filename === filename ? { ...font, ...updates } : font
        )
        
        // Update JSON file
        const fs = require('fs').promises
        const path = require('path')
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        
        await fs.writeFile(dataFile, JSON.stringify({
          fonts: memoryFonts,
          lastUpdated: new Date().toISOString()
        }, null, 2))
        
        console.log(`✅ Development: Font metadata updated: ${filename}`)
        return true
      } catch (error) {
        console.error('Fallback metadata update error:', error)
        return false
      }
    } else {
      // Production: Update memory cache only
      const initialFonts = [...memoryFonts]
      memoryFonts = memoryFonts.map(font => 
        font.filename === filename ? { ...font, ...updates } : font
      )
      
      const updated = JSON.stringify(initialFonts) !== JSON.stringify(memoryFonts)
      if (updated) {
        console.log(`⚠️ Production: Font metadata updated in memory only: ${filename}`)
      }
      return updated
    }
  }

  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'ttf':
        return 'font/ttf'
      case 'otf':
        return 'font/otf'
      case 'woff':
        return 'font/woff'
      case 'woff2':
        return 'font/woff2'
      default:
        return 'application/octet-stream'
    }
  }
}

// Export singleton instance
export const vercelFontStorage = new VercelFontStorage()