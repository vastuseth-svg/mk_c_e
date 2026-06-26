import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signAccessToken, generateRandomToken, hashToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory rate limiter for login attempts
interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

const loginRateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { success: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);
  if (!entry) {
    loginRateLimitMap.set(ip, { attempts: 1, resetTime: now + 15 * 60 * 1000 });
    return { success: true };
  }
  if (now > entry.resetTime) {
    entry.attempts = 1;
    entry.resetTime = now + 15 * 60 * 1000;
    return { success: true };
  }
  if (entry.attempts >= 10) {
    return { success: false, resetTime: entry.resetTime };
  }
  entry.attempts++;
  return { success: true };
}

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.success) {
      const waitTimeSec = Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${waitTimeSec} seconds.` },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { email, password } = body;

    // 3. Validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 422 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 422 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });
    }

    // 4. Fetch User
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmedEmail))
      .limit(1);

    // Vague error message to prevent user enumeration
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 5. Verify Password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 6. Generate Tokens
    const accessToken = signAccessToken({ userId: user.id, role: user.role || 'customer' });
    const refreshToken = generateRandomToken();
    const refreshTokenExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const refreshTokenHash = hashToken(refreshToken);

    // 7. Update User Record with Refresh Token
    await db
      .update(schema.users)
      .set({
        refreshTokenHash,
        refreshTokenExp,
      })
      .where(eq(schema.users.id, user.id));

    // 8. Set HTTP-Only Cookie and Return Success
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `refresh_token=${refreshToken}`,
      'HttpOnly',
      isProduction ? 'Secure' : '',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=2592000', // 30 days
    ].filter(Boolean).join('; ');

    const response = NextResponse.json({
      access_token: accessToken,
      expires_in: 900, // 15 minutes
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
      },
    });

    response.headers.set('Set-Cookie', cookieOptions);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred.' }, { status: 500 });
  }
}
