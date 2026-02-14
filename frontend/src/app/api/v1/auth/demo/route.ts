import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const DEMO_USER = {
  email: 'demo@smartcon360.com',
  password: 'Demo1234',
  firstName: 'Yuksel',
  lastName: 'Arslan',
  company: 'SmartCon360',
};

// POST /api/v1/auth/demo — Create or login demo user, return real JWT
export async function POST() {
  try {
    let user = await prisma.user.findUnique({ where: { email: DEMO_USER.email } });

    if (!user) {
      const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
      user = await prisma.user.create({
        data: {
          email: DEMO_USER.email,
          passwordHash,
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          company: DEMO_USER.company,
        },
      });
    }

    const accessToken = signAccessToken(user.id, user.email);

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
        },
        accessToken,
      },
      error: null,
    });
  } catch (err) {
    // If DB is not available, generate a fallback JWT with a deterministic ID
    console.error('Demo auth DB error (using fallback):', err);
    const fallbackId = '00000000-0000-0000-0000-000000000001';
    const accessToken = signAccessToken(fallbackId, DEMO_USER.email);

    return NextResponse.json({
      data: {
        user: {
          id: fallbackId,
          email: DEMO_USER.email,
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          company: DEMO_USER.company,
        },
        accessToken,
      },
      error: null,
    });
  }
}
