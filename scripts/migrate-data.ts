/**
 * Google Sheets to Supabase Data Migration Script
 *
 * This script migrates all data from Google Sheets to Supabase.
 * Run this script after setting up your Supabase database with the schema from
 * supabase/migrations/001_initial_schema.sql
 *
 * Prerequisites:
 * 1. Both Google Sheets and Supabase credentials configured in .env.local
 * 2. Supabase database schema created
 * 3. Run: npm run migrate
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import GoogleSheetsService from '../src/lib/google-sheets';
import SupabaseService from '../src/lib/supabase';

// Helper function to clean data
function cleanDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  return dateStr;
}

function cleanReport(report: any): any {
  return {
    ...report,
    date: cleanDate(report.date) || new Date().toISOString().split('T')[0],
  };
}

function cleanProject(project: any): any {
  const { id, ...projectData } = project;
  return {
    ...projectData,
    targetEndDate: cleanDate(projectData.targetEndDate),
    revisedEndDate: cleanDate(projectData.revisedEndDate),
  };
}

async function migrateData() {
  console.log('🚀 Starting data migration from Google Sheets to Supabase...\n');

  const sheetsService = new GoogleSheetsService();
  const supabaseService = new SupabaseService();

  let totalSuccess = 0;
  let totalErrors = 0;

  try {
    // 1. Migrate Employees
    console.log('📊 Migrating Employees...');
    try {
      const employees = await sheetsService.getEmployees();
      console.log(`   Found ${employees.length} employees`);

      for (const employee of employees) {
        const success = await supabaseService.addEmployee(employee);
        if (success) {
          totalSuccess++;
          console.log(`   ✅ Migrated: ${employee.employeeName} (${employee.employeeCode})`);
        } else {
          totalErrors++;
          console.log(`   ❌ Failed: ${employee.employeeName}`);
        }
      }
    } catch (error) {
      console.error('   ❌ Error migrating employees:', error);
      totalErrors++;
    }

    // 2. Migrate Daily Reports
    console.log('\n📊 Migrating Daily Reports...');
    try {
      const reports = await sheetsService.getDailyReports();
      console.log(`   Found ${reports.length} daily reports`);

      // Clean and batch insert for better performance
      const cleanedReports = reports.map(cleanReport);
      const batchSize = 100;
      for (let i = 0; i < cleanedReports.length; i += batchSize) {
        const batch = cleanedReports.slice(i, i + batchSize);
        const success = await supabaseService.addDailyReports(batch);

        if (success) {
          totalSuccess += batch.length;
          console.log(`   ✅ Migrated batch ${Math.floor(i / batchSize) + 1} (${batch.length} reports)`);
        } else {
          totalErrors += batch.length;
          console.log(`   ❌ Failed batch ${Math.floor(i / batchSize) + 1}`);
        }
      }
    } catch (error) {
      console.error('   ❌ Error migrating daily reports:', error);
      totalErrors++;
    }

    // 3. Migrate Projects
    console.log('\n📊 Migrating Projects...');
    try {
      const projects = await sheetsService.getProjects();
      console.log(`   Found ${projects.length} projects`);

      for (const project of projects) {
        // Clean project data (remove id, handle empty dates)
        const cleanedProject = cleanProject(project);
        const success = await supabaseService.addProject(cleanedProject);

        if (success) {
          totalSuccess++;
          console.log(`   ✅ Migrated: ${project.projectName}`);
        } else {
          totalErrors++;
          console.log(`   ❌ Failed: ${project.projectName}`);
        }
      }
    } catch (error) {
      console.error('   ❌ Error migrating projects:', error);
      totalErrors++;
    }

    // 4. Migrate Daily Summaries
    console.log('\n📊 Migrating Daily Summaries...');
    try {
      const summaries = await sheetsService.getAllDailySummaries();
      console.log(`   Found ${summaries.length} daily summaries`);

      if (summaries.length > 0) {
        // Filter out empty summaries
        const validSummaries = summaries.filter(s => s.date && s.summary);

        if (validSummaries.length > 0) {
          // Remove duplicates by keeping the last occurrence of each date
          const uniqueSummaries = new Map();
          validSummaries.forEach(summary => {
            uniqueSummaries.set(summary.date, summary);
          });
          const dedupedSummaries = Array.from(uniqueSummaries.values());

          if (dedupedSummaries.length < validSummaries.length) {
            console.log(`   ⚠️  Found ${validSummaries.length - dedupedSummaries.length} duplicate dates (keeping last occurrence)`);
          }

          const success = await supabaseService.addDailySummaries(dedupedSummaries);

          if (success) {
            totalSuccess += dedupedSummaries.length;
            console.log(`   ✅ Migrated ${dedupedSummaries.length} daily summaries`);
          } else {
            totalErrors += dedupedSummaries.length;
            console.log(`   ❌ Failed to migrate daily summaries`);
          }
        } else {
          console.log('   ℹ️  No valid daily summaries to migrate');
        }
      } else {
        console.log('   ℹ️  No daily summaries found in Google Sheets');
      }
    } catch (error) {
      console.error('   ❌ Error migrating daily summaries:', error);
      totalErrors++;
    }

    // 5. Migrate Stats Dashboard
    console.log('\n📊 Migrating Stats Dashboard...');
    try {
      const stats = await sheetsService.getStatsDashboard();
      const success = await supabaseService.updateStatsDashboard({
        monthlyAverageRate: stats.monthlyAverageRate,
        weeklyAverageRate: stats.weeklyAverageRate,
        departmentStats: stats.departmentStats,
        calculatedAt: new Date().toISOString(),
      });

      if (success) {
        totalSuccess++;
        console.log('   ✅ Migrated stats dashboard');
      } else {
        totalErrors++;
        console.log('   ❌ Failed to migrate stats dashboard');
      }
    } catch (error) {
      console.error('   ❌ Error migrating stats dashboard:', error);
      totalErrors++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total Successful: ${totalSuccess}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log('\n🎉 Data migration completed!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. Test your application with Supabase');
    console.log('3. Update environment variables for production');
    console.log('4. Remove Google Sheets dependencies if no longer needed');

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateData().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
