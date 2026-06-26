import { NextResponse, NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = verifyAccessToken(request);

    if (payload) {
      // Clear refresh token in database
      await db
        .update(schema.users)
        .set({
          refreshTokenHash: null,
          refreshTokenExp: null,
        })
        .where(eq(schema.users.id, payload.userId));
    }

    // Prepare response to clear the cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'refresh_token=',
      'HttpOnly',
      isProduction ? 'Secure' : '',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ].filter(Boolean).join('; ');

    const response = NextResponse.json({ message: 'Logged out successfully.' });
    response.headers.set('Set-Cookie', cookieOptions);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred.' }, { status: 500 });
  }
}
