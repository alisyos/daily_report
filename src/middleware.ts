import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware no longer handles JWT verification.
// Each API route verifies the JWT directly from the cookie via getRequestUser().
// This avoids Edge Runtime vs Node.js Runtime environment variable mismatches.

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
