import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    const secret = process.env.JWT_SECRET || 'clothstore-secret-key-9988';
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired verification token.' },
        { status: 400 }
      );
    }

    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid verification token payload.' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Update user to verified
    await db
      .update(schema.users)
      .set({ emailVerified: true })
      .where(eq(schema.users.id, userId));

    return NextResponse.json({ message: 'Email verified successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
