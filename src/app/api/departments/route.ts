import { NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function GET() {
  try {
    const departments = await dbService.getDepartments();
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}
