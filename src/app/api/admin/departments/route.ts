import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, requireRole, getCompanyScope } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getCompanyScope(user);
    const departments = await dbService.getDepartmentsFromTable(companyId);
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Only operator can add departments
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: '부서 추가는 운영자만 가능합니다.' }, { status: 403 });
    }

    const departmentData = await request.json();

    if (!departmentData.departmentName || !departmentData.companyId) {
      return NextResponse.json({ error: '부서명과 업체를 입력해주세요.' }, { status: 400 });
    }

    const result = await dbService.addDepartment(departmentData);

    if (result) {
      return NextResponse.json({ message: 'Department added successfully', department: result });
    } else {
      return NextResponse.json({ error: '부서 추가에 실패했습니다. 중복된 부서명인지 확인해주세요.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding department:', error);
    return NextResponse.json({ error: 'Failed to add department' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Only operator can update departments
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: '부서 수정은 운영자만 가능합니다.' }, { status: 403 });
    }

    const { id, department } = await request.json();

    if (!id || !department) {
      return NextResponse.json({ error: 'Missing id or department data' }, { status: 400 });
    }

    if (!department.departmentName) {
      return NextResponse.json({ error: '부서명을 입력해주세요.' }, { status: 400 });
    }

    const success = await dbService.updateDepartment(id, department);

    if (success) {
      return NextResponse.json({ message: 'Department updated successfully' });
    } else {
      return NextResponse.json({ error: '부서 수정에 실패했습니다. 중복된 부서명인지 확인해주세요.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Only operator can delete departments
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: '부서 삭제는 운영자만 가능합니다.' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing department id' }, { status: 400 });
    }

    const success = await dbService.deleteDepartment(id);

    if (success) {
      return NextResponse.json({ message: 'Department deleted successfully' });
    } else {
      return NextResponse.json({ error: '부서 삭제에 실패했습니다. 해당 부서에 소속된 사원이 있을 수 있습니다.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
