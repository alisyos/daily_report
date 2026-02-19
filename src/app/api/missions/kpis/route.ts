import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');

    if (!missionId) {
      return NextResponse.json({ error: 'missionId is required' }, { status: 400 });
    }

    const kpis = await dbService.getKpisByMissionIds([missionId]);
    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const kpiData = await request.json();

    if (!kpiData.missionId || !kpiData.kpiName || kpiData.targetValue === undefined || !kpiData.unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const kpi = await dbService.addMissionKpi(kpiData);

    if (kpi) {
      return NextResponse.json({ message: 'KPI added successfully', kpi });
    } else {
      return NextResponse.json({ error: 'Failed to add KPI' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding KPI:', error);
    return NextResponse.json({ error: 'Failed to add KPI' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, kpi } = await request.json();

    const success = await dbService.updateMissionKpi(id, kpi);

    if (success) {
      return NextResponse.json({ message: 'KPI updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update KPI' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating KPI:', error);
    return NextResponse.json({ error: 'Failed to update KPI' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();

    const success = await dbService.deleteMissionKpi(id);

    if (success) {
      return NextResponse.json({ message: 'KPI deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete KPI' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting KPI:', error);
    return NextResponse.json({ error: 'Failed to delete KPI' }, { status: 500 });
  }
}
