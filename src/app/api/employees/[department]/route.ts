import { NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ department: string }> }
) {
  try {
    const { department } = await params;
    const decodedDepartment = decodeURIComponent(department);
    const employees = await dbService.getEmployeesByDepartment(decodedDepartment);
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
