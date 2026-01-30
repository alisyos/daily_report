import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ message: '로그아웃 성공' });
  clearAuthCookie(response);
  return response;
}
