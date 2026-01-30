import { NextRequest, NextResponse } from 'next/server';
import { signJWT, comparePassword, setAuthCookie, AuthUser } from '@/lib/auth';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const employee = await dbService.getEmployeeByEmail(email);

    if (!employee || !employee.passwordHash) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const authUser: AuthUser = {
      id: employee.id!,
      email: employee.email!,
      employeeName: employee.employeeName,
      role: employee.role || 'user',
      companyId: employee.companyId || '',
      companyName: employee.companyName || '',
      department: employee.department,
    };

    const token = await signJWT(authUser);
    const response = NextResponse.json({
      message: '로그인 성공',
      user: authUser,
    });
    setAuthCookie(response, token);

    // Debug: verify Set-Cookie header is present
    const setCookie = response.headers.get('set-cookie');
    console.log('[/api/auth/login] Set-Cookie header present:', !!setCookie, '| Token length:', token.length);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
