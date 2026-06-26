import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hashToken, signAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is missing.' }, { status: 401 });
    }

    const refreshTokenHash = hashToken(refreshToken);

    // Find the user with this refresh token hash
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.refreshTokenHash, refreshTokenHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 });
    }

    // Check expiration
    if (!user.refreshTokenExp || new Date() > new Date(user.refreshTokenExp)) {
      return NextResponse.json({ error: 'Refresh token has expired.' }, { status: 401 });
    }

    // Issue new access token
    const accessToken = signAccessToken({ userId: user.id, role: user.role || 'customer' });

    return NextResponse.json({
      access_token: accessToken,
      expires_in: 900,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred.' }, { status: 500 });
  }
}
