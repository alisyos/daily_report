import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, getCompanyScope, getDepartmentScope } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getCompanyScope(user);
    const departmentScope = getDepartmentScope(user);
    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get('assignee') || undefined;

    const missions = await dbService.getMissions(companyId, departmentScope, assignee);

    // Bulk fetch KPIs for all missions
    const missionIds = missions.map(m => m.id).filter(Boolean) as string[];
    const allKpis = await dbService.getKpisByMissionIds(missionIds);

    // Group KPIs by missionId
    const kpiMap: Record<string, typeof allKpis> = {};
    for (const kpi of allKpis) {
      if (!kpiMap[kpi.missionId]) kpiMap[kpi.missionId] = [];
      kpiMap[kpi.missionId].push(kpi);
    }

    const missionsWithKpis = missions.map(m => ({
      ...m,
      kpis: kpiMap[m.id!] || [],
    }));

    return NextResponse.json(missionsWithKpis);
  } catch (error) {
    console.error('Error fetching missions:', error);
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const missionData = await request.json();

    if (!missionData.missionName || !missionData.assignee || !missionData.startDate || !missionData.endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!missionData.companyId) {
      missionData.companyId = user.companyId;
    }

    const mission = await dbService.addMission(missionData);

    if (mission) {
      return NextResponse.json({ message: 'Mission added successfully', mission });
    } else {
      return NextResponse.json({ error: 'Failed to add mission' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding mission:', error);
    return NextResponse.json({ error: 'Failed to add mission' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, mission } = await request.json();

    const success = await dbService.updateMission(id, mission);

    if (success) {
      return NextResponse.json({ message: 'Mission updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating mission:', error);
    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();

    const success = await dbService.deleteMission(id);

    if (success) {
      return NextResponse.json({ message: 'Mission deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting mission:', error);
    return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 });
  }
}
