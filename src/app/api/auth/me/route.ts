import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const allCookies = request.cookies.getAll().map(c => c.name);
    console.log('[/api/auth/me] No auth-token cookie found. All cookies:', allCookies);
    return NextResponse.json({ error: 'No auth token' }, { status: 401 });
  }

  const user = await verifyJWT(token);

  if (!user) {
    console.log('[/api/auth/me] JWT verification failed. Token length:', token.length);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json({ user });
}
