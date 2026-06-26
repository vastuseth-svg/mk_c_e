import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^\+91[6789]\d{9}$/;

interface OtpRateLimit {
  count: number;
  resetTime: number;
}

const otpRequestRateLimitMap = new Map<string, OtpRateLimit>();

function checkOtpRateLimit(phone: string): { success: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = otpRequestRateLimitMap.get(phone);
  if (!entry) {
    otpRequestRateLimitMap.set(phone, { count: 1, resetTime: now + 60 * 60 * 1000 }); // 1 hour window
    return { success: true };
  }
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + 60 * 60 * 1000;
    return { success: true };
  }
  if (entry.count >= 5) {
    return { success: false, resetTime: entry.resetTime };
  }
  entry.count++;
  return { success: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name } = body;

    // 1. Validation
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 422 });
    }

    const trimmedPhone = phone.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number. Must be a valid Indian number (e.g. +919876543210).' }, { status: 422 });
    }

    // 2. Rate Limiting Check
    const rateLimit = checkOtpRateLimit(trimmedPhone);
    if (!rateLimit.success) {
      const waitTimeMin = Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many OTP requests. Try again after ${waitTimeMin} minutes.` },
        { status: 429 }
      );
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const otpExp = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    // 4. DB Operations
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, trimmedPhone))
      .limit(1);

    if (existingUser) {
      // Update OTP columns
      await db
        .update(schema.users)
        .set({
          otpHash,
          otpExp,
          otpAttempts: 0,
        })
        .where(eq(schema.users.id, existingUser.id));
    } else {
      // Insert new unverified user row
      const userName = name && typeof name === 'string' && name.trim() ? name.trim() : 'Customer';
      await db
        .insert(schema.users)
        .values({
          name: userName,
          phone: trimmedPhone,
          phoneVerified: false,
          emailVerified: false,
          role: 'customer',
          otpHash,
          otpExp,
          otpAttempts: 0,
        });
    }

    // 5. Console log the OTP (Stub implementation)
    console.log('\n=========================================');
    console.log(`[STUB SMS] OTP for ${trimmedPhone}: ${otp}`);
    console.log('=========================================\n');

    // 6. Return response with masked phone
    const maskedPhone = trimmedPhone.substring(0, 3) + 'XXXXXX' + trimmedPhone.substring(trimmedPhone.length - 4);
    return NextResponse.json({
      message: `OTP sent to ${maskedPhone}`,
      expires_in: 300,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred.' }, { status: 500 });
  }
}
