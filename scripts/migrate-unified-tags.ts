/**
 * Migration Script: Unified Tag Vocabularies
 *
 * Merges separate collection-based tag vocabularies into a single unified system
 *
 * Before:
 * - tags:vocab:appearance:Text
 * - tags:vocab:appearance:Display
 * - tags:vocab:appearance:Brutal
 * - tags:vocab:category:Text
 * - tags:vocab:category:Display
 * - tags:vocab:category:Brutal
 *
 * After:
 * - tags:vocab:appearance (unified)
 * - tags:vocab:category (unified)
 */

import { kv } from '@vercel/kv'

const COLLECTIONS = ['Text', 'Display', 'Brutal'] as const
const TYPES = ['appearance', 'category'] as const

interface MigrationResult {
  type: string
  beforeCounts: Record<string, number>
  afterCount: number
  mergedTags: string[]
}

async function migrateUnifiedTags(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []

  for (const type of TYPES) {
    console.log(`\n📦 Migrating ${type} tags...`)

    // Collect all tags from all collections
    const allTags = new Set<string>()
    const beforeCounts: Record<string, number> = {}

    // Read from old collection-based keys
    for (const collection of COLLECTIONS) {
      const oldKey = `tags:vocab:${type}:${collection}`
      const tags = await kv.get<string[]>(oldKey)

      if (Array.isArray(tags)) {
        beforeCounts[collection] = tags.length
        console.log(`  ✓ ${collection}: ${tags.length} tags`)
        tags.forEach(tag => allTags.add(tag))
      } else {
        beforeCounts[collection] = 0
        console.log(`  ⚠ ${collection}: no tags found`)
      }
    }

    // Convert to array and sort alphabetically
    const mergedTags = Array.from(allTags).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    // Save to new unified key
    const newKey = `tags:vocab:${type}`
    await kv.set(newKey, mergedTags)

    console.log(`  ✅ Merged into ${newKey}: ${mergedTags.length} unique tags`)

    results.push({
      type,
      beforeCounts,
      afterCount: mergedTags.length,
      mergedTags
    })
  }

  return results
}

async function backupOldVocabularies(): Promise<void> {
  console.log('\n💾 Creating backup of old vocabularies...')

  for (const type of TYPES) {
    for (const collection of COLLECTIONS) {
      const oldKey = `tags:vocab:${type}:${collection}`
      const backupKey = `tags:vocab:backup:${type}:${collection}`

      const tags = await kv.get<string[]>(oldKey)
      if (tags) {
        await kv.set(backupKey, tags)
        console.log(`  ✓ Backed up: ${backupKey}`)
      }
    }
  }
}

async function verifyMigration(): Promise<boolean> {
  console.log('\n🔍 Verifying migration...')

  for (const type of TYPES) {
    const newKey = `tags:vocab:${type}`
    const unified = await kv.get<string[]>(newKey)

    if (!Array.isArray(unified) || unified.length === 0) {
      console.error(`  ❌ ${newKey} is empty or invalid!`)
      return false
    }

    console.log(`  ✓ ${newKey}: ${unified.length} tags`)
  }

  return true
}

// Main execution
async function main() {
  console.log('🚀 Starting Unified Tags Migration\n')
  console.log('=' .repeat(60))

  try {
    // Step 1: Backup
    await backupOldVocabularies()

    // Step 2: Migrate
    const results = await migrateUnifiedTags()

    // Step 3: Verify
    const verified = await verifyMigration()

    // Step 4: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary\n')

    results.forEach(result => {
      console.log(`${result.type.toUpperCase()}:`)
      console.log(`  Before:`)
      Object.entries(result.beforeCounts).forEach(([coll, count]) => {
        console.log(`    - ${coll}: ${count}`)
      })
      console.log(`  After: ${result.afterCount} unified tags`)
      console.log(`  Tags: ${result.mergedTags.slice(0, 5).join(', ')}${result.mergedTags.length > 5 ? '...' : ''}`)
      console.log()
    })

    if (verified) {
      console.log('✅ Migration completed successfully!')
      console.log('\nNext steps:')
      console.log('1. Update API endpoints to use new unified keys')
      console.log('2. Update admin interface to remove collection selector')
      console.log('3. Update catalog filters')
      console.log('\nOld vocabularies backed up to tags:vocab:backup:*')
    } else {
      console.log('❌ Migration verification failed!')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { migrateUnifiedTags, backupOldVocabularies, verifyMigration }
