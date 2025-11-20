/**
 * Daily Summaries Migration Script
 * Migrates only daily summaries from Google Sheets to Supabase
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import GoogleSheetsService from '../src/lib/google-sheets';
import SupabaseService from '../src/lib/supabase';

async function migrateSummaries() {
  console.log('🚀 Starting daily summaries migration...\n');

  const sheetsService = new GoogleSheetsService();
  const supabaseService = new SupabaseService();

  try {
    const summaries = await sheetsService.getAllDailySummaries();
    console.log(`📊 Found ${summaries.length} daily summaries in Google Sheets`);

    if (summaries.length === 0) {
      console.log('ℹ️  No daily summaries to migrate');
      return;
    }

    // Filter out empty summaries
    const validSummaries = summaries.filter(s => s.date && s.summary);
    console.log(`✅ Valid summaries: ${validSummaries.length}`);

    if (validSummaries.length === 0) {
      console.log('⚠️  No valid summaries found (all entries are empty)');
      return;
    }

    // Remove duplicates by keeping the last occurrence of each date
    const uniqueSummaries = new Map<string, typeof validSummaries[0]>();
    validSummaries.forEach(summary => {
      uniqueSummaries.set(summary.date, summary);
    });

    const dedupedSummaries = Array.from(uniqueSummaries.values());

    if (dedupedSummaries.length < validSummaries.length) {
      console.log(`⚠️  Found ${validSummaries.length - dedupedSummaries.length} duplicate dates (keeping last occurrence)`);
      console.log(`📝 Unique summaries to migrate: ${dedupedSummaries.length}`);
    }

    // Migrate summaries
    const success = await supabaseService.addDailySummaries(dedupedSummaries);

    if (success) {
      console.log(`\n🎉 Successfully migrated ${dedupedSummaries.length} daily summaries!`);
    } else {
      console.log('\n❌ Failed to migrate daily summaries');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateSummaries().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
