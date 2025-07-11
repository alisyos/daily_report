import { NextResponse } from 'next/server';
import GoogleSheetsService from '@/lib/google-sheets';

const sheetsService = new GoogleSheetsService();

export async function GET() {
  try {
    const stats = await sheetsService.getStatsDashboard();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}