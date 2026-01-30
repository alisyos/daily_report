import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, getCompanyScope } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getCompanyScope(user);
    const employees = await dbService.getEmployees(companyId);
    // Strip sensitive fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const safeEmployees = employees.map(({ passwordHash, ...rest }) => rest);
    return NextResponse.json(safeEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
