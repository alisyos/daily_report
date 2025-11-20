import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const summary = await dbService.getDailySummary(date);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ error: 'Failed to fetch daily summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.date || !data.summary) {
      return NextResponse.json({ error: 'Date and summary are required' }, { status: 400 });
    }

    // Check if summary already exists for this date
    const existingSummary = await dbService.getDailySummary(data.date);

    if (existingSummary) {
      // Update existing summary
      const success = await dbService.updateDailySummary(data.date, data);

      if (success) {
        return NextResponse.json({ message: 'Daily summary updated successfully' });
      } else {
        return NextResponse.json({ error: 'Failed to update daily summary' }, { status: 500 });
      }
    } else {
      // Add new summary
      const success = await dbService.addDailySummary(data);

      if (success) {
        return NextResponse.json({ message: 'Daily summary added successfully' });
      } else {
        return NextResponse.json({ error: 'Failed to add daily summary' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error saving daily summary:', error);
    return NextResponse.json({ error: 'Failed to save daily summary' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.date || !data.summary) {
      return NextResponse.json({ error: 'Date and summary are required' }, { status: 400 });
    }

    const success = await dbService.updateDailySummary(data.date, data);

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