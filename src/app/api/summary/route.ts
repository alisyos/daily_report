import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const department = searchParams.get('department');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    if (department) {
      // 특정 부서의 요약 단건 반환
      const summary = await dbService.getDailySummary(date, department);
      return NextResponse.json(summary);
    } else {
      // 해당 날짜의 모든 부서별 요약 배열 반환
      const summaries = await dbService.getDailySummaries(date);
      return NextResponse.json(summaries);
    }
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ error: 'Failed to fetch daily summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    if (!data.date || !data.summary) {
      return NextResponse.json({ error: 'Date and summary are required' }, { status: 400 });
    }

    const success = await dbService.upsertDailySummary({
      date: data.date,
      department: data.department,
      summary: data.summary,
    });

    if (success) {
      return NextResponse.json({ message: 'Daily summary saved successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to save daily summary' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving daily summary:', error);
    return NextResponse.json({ error: 'Failed to save daily summary' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    if (!data.date || !data.summary) {
      return NextResponse.json({ error: 'Date and summary are required' }, { status: 400 });
    }

    const success = await dbService.upsertDailySummary({
      date: data.date,
      department: data.department,
      summary: data.summary,
    });

    if (success) {
      return NextResponse.json({ message: 'Daily summary updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update daily summary' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
    return NextResponse.json({ error: 'Failed to update daily summary' }, { status: 500 });
  }
}
