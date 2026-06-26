import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signAccessToken, generateRandomToken, hashToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // 1. Validation
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 422 });
    }
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      return NextResponse.json({ error: 'OTP is required.' }, { status: 422 });
    }

    const trimmedPhone = phone.trim();
    const trimmedOtp = otp.trim();

    // 2. Fetch User
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, trimmedPhone))
      .limit(1);

    if (!user || !user.otpHash || !user.otpExp) {
      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 401 });
    }

    const now = new Date();

    // 3. Check Attempts before verification
    if (user.otpAttempts && user.otpAttempts >= 5) {
      // Clear OTP
      await db
        .update(schema.users)
        .set({
          otpHash: null,
          otpExp: null,
          otpAttempts: 0,
        })
        .where(eq(schema.users.id, user.id));
      return NextResponse.json({ error: 'Too many attempts. Request a new OTP.' }, { status: 429 });
    }

    // 4. Check Expiration
    if (now > new Date(user.otpExp)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    // 5. Compare OTP
    const isOtpValid = await bcrypt.compare(trimmedOtp, user.otpHash);

    if (!isOtpValid) {
      const newAttempts = (user.otpAttempts || 0) + 1;
      
      if (newAttempts >= 5) {
        // Clear OTP on 5th failure
        await db
          .update(schema.users)
          .set({
            otpHash: null,
            otpExp: null,
            otpAttempts: 0,
          })
          .where(eq(schema.users.id, user.id));
        return NextResponse.json({ error: 'Too many attempts. Request a new OTP.' }, { status: 429 });
      }

      // Increment attempt count
      await db
        .update(schema.users)
        .set({
          otpAttempts: newAttempts,
        })
        .where(eq(schema.users.id, user.id));

      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 401 });
    }

    // 6. OTP is correct. Determine if new user
    const isNewUser = !user.phoneVerified;

    // 7. Generate Session Tokens
    const accessToken = signAccessToken({ userId: user.id, role: user.role || 'customer' });
    const refreshToken = generateRandomToken();
    const refreshTokenExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const refreshTokenHash = hashToken(refreshToken);

    // 8. Update DB: Set phoneVerified to true, clear OTP fields, and save refresh token
    await db
      .update(schema.users)
      .set({
        phoneVerified: true,
        otpHash: null,
        otpExp: null,
        otpAttempts: 0,
        refreshTokenHash,
        refreshTokenExp,
      })
      .where(eq(schema.users.id, user.id));

    // 9. Prepare HTTP-Only Cookie
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
      is_new_user: isNewUser,
    });

    response.headers.set('Set-Cookie', cookieOptions);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred.' }, { status: 500 });
  }
}
