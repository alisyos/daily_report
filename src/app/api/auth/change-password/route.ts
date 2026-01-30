import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword } from '@/lib/auth';
import { getRequestUser } from '@/lib/auth-helpers';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // Verify current password
    const employee = await dbService.getEmployeeByEmail(user.email);
    if (!employee || !employee.passwordHash) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const isValid = await comparePassword(currentPassword, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    const success = await dbService.updateEmployeePassword(user.id, newHash);

    if (success) {
      return NextResponse.json({ message: '비밀번호가 변경되었습니다.' });
    } else {
      return NextResponse.json(
        { error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
