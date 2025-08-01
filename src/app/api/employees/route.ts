import { NextResponse } from 'next/server';
import GoogleSheetsService from '@/lib/google-sheets';

const sheetsService = new GoogleSheetsService();

export async function GET() {
  try {
    const employees = await sheetsService.getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}