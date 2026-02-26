import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, requireRole } from '@/lib/auth-helpers';
import { hashPassword } from '@/lib/auth';

const dbService = new SupabaseService();

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'company_manager', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employeeId, newPassword } = await request.json();

    if (!employeeId || !newPassword) {
      return NextResponse.json(
        { error: '사원 ID와 새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const success = await dbService.updateEmployeePassword(employeeId, passwordHash);

    if (success) {
      return NextResponse.json({ message: '비밀번호가 재설정되었습니다.' });
    } else {
      return NextResponse.json(
        { error: '비밀번호 재설정에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
