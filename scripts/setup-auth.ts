/**
 * Auth Setup Script
 *
 * This script sets up the initial operator account for the system.
 * Run this after applying the database migration (005_auth_and_companies.sql).
 *
 * Usage:
 *   npx tsx scripts/setup-auth.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   JWT_SECRET (optional, but recommended)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('=== Auth Setup Script ===\n');

  // 1. Ensure default company exists
  console.log('1. Checking default company (GPT코리아)...');
  let { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('company_name', 'GPT코리아')
    .single();

  if (!company) {
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({ company_name: 'GPT코리아' })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create default company:', error);
      process.exit(1);
    }
    company = newCompany;
    console.log('   Created default company: GPT코리아');
  } else {
    console.log('   Default company already exists.');
  }

  const companyId = company!.id;

  // 2. Assign company_id to any employees missing it
  console.log('\n2. Assigning company to unassigned employees...');
  const { data: updateResult } = await supabase
    .from('employees')
    .update({ company_id: companyId })
    .is('company_id', null)
    .select('id');

  console.log(`   Updated ${updateResult?.length || 0} employees.`);

  // 3. Assign company_id to unassigned daily_reports
  console.log('\n3. Assigning company to unassigned daily_reports...');
  const { data: reportResult } = await supabase
    .from('daily_reports')
    .update({ company_id: companyId })
    .is('company_id', null)
    .select('id');

  console.log(`   Updated ${reportResult?.length || 0} daily_reports.`);

  // 4. Assign company_id to unassigned projects
  console.log('\n4. Assigning company to unassigned projects...');
  const { data: projectResult } = await supabase
    .from('projects')
    .update({ company_id: companyId })
    .is('company_id', null)
    .select('id');

  console.log(`   Updated ${projectResult?.length || 0} projects.`);

  // 5. Create initial operator account
  console.log('\n5. Setting up initial operator account...');

  // Check if any operator already exists
  const { data: existingOperator } = await supabase
    .from('employees')
    .select('id, employee_name, email')
    .eq('role', 'operator')
    .limit(1)
    .single();

  if (existingOperator) {
    console.log(`   Operator already exists: ${existingOperator.employee_name} (${existingOperator.email})`);
    console.log('\n=== Setup Complete ===');
    return;
  }

  // Check first employee and promote to operator
  const { data: firstEmployee } = await supabase
    .from('employees')
    .select('*')
    .order('employee_code', { ascending: true })
    .limit(1)
    .single();

  if (firstEmployee) {
    const defaultEmail = firstEmployee.email || 'admin@gptkorea.com';
    const defaultPassword = 'admin123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const { error } = await supabase
      .from('employees')
      .update({
        email: defaultEmail,
        password_hash: passwordHash,
        role: 'operator',
        company_id: companyId,
      })
      .eq('id', firstEmployee.id);

    if (error) {
      console.error('   Failed to create operator:', error);
    } else {
      console.log(`   Created operator account:`);
      console.log(`   Name: ${firstEmployee.employee_name}`);
      console.log(`   Email: ${defaultEmail}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log(`   ** Please change this password after first login! **`);
    }
  } else {
    // No employees exist, create a new one
    const defaultPassword = 'admin123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const { error } = await supabase
      .from('employees')
      .insert({
        employee_code: '1',
        employee_name: '운영자',
        position: '운영자',
        department: '관리',
        company_id: companyId,
        email: 'admin@gptkorea.com',
        password_hash: passwordHash,
        role: 'operator',
      });

    if (error) {
      console.error('   Failed to create operator:', error);
    } else {
      console.log('   Created new operator account:');
      console.log('   Name: 운영자');
      console.log('   Email: admin@gptkorea.com');
      console.log(`   Password: ${defaultPassword}`);
      console.log('   ** Please change this password after first login! **');
    }
  }

  console.log('\n=== Setup Complete ===');
}

setup().catch(console.error);
