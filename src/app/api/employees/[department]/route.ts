import { NextResponse } from 'next/server';
import GoogleSheetsService from '@/lib/google-sheets';

const sheetsService = new GoogleSheetsService();

export async function GET(
  request: Request,
  { params }: { params: { department: string } }
) {
  try {
    const department = decodeURIComponent(params.department);
    const employees = await sheetsService.getEmployeesByDepartment(department);
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
} 