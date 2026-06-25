import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 1. Missing fields validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 422 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 422 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 422 });
    }

    // 2. Email format validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });
    }

    // 3. Password length validation
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 422 });
    }

    // 4. Duplicate email validation
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmedEmail))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // 5. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. Create user row in database
    const [user] = await db
      .insert(schema.users)
      .values({
        name: name.trim(),
        email: trimmedEmail,
        passwordHash,
        role: 'customer',
        emailVerified: false,
        phoneVerified: false,
      })
      .returning({ id: schema.users.id });

    // 7. Generate a signed verification token (JWT, 24-hour expiration)
    const secret = process.env.JWT_SECRET || 'clothstore-secret-key-9988';
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '24h' });

    // 8. Log the email verification link (stub implementation)
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const verificationUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
    console.log('\n=========================================');
    console.log(`[STUB EMAIL] Welcome email to: ${trimmedEmail}`);
    console.log(`[STUB EMAIL] Verification Link: ${verificationUrl}`);
    console.log('=========================================\n');

    return NextResponse.json(
      {
        message: 'Account created. Please verify your email.',
        user_id: user.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
