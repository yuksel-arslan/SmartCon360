import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/auth/google — Authenticate with Google OAuth token
export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { data: null, error: { code: 'MISSING_CREDENTIAL', message: 'Google credential is required' } },
        { status: 400 }
      );
    }

    // Decode Google JWT (ID token) — extract user info from payload
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_TOKEN', message: 'Invalid Google token format' } },
        { status: 400 }
      );
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

    if (!email) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_EMAIL', message: 'Google account must have an email' } },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Update Google provider info if not already set
      if (user.authProvider !== 'google') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: 'google',
            authProviderId: googleId,
            avatarUrl: avatarUrl || user.avatarUrl,
            emailVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), avatarUrl: avatarUrl || user.avatarUrl },
        });
      }
    } else {
      // Create new user from Google
      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          avatarUrl,
          authProvider: 'google',
          authProviderId: googleId,
          emailVerified: true,
        },
      });

      // Assign default viewer role
      const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
      if (viewerRole) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: viewerRole.id },
        });
      }
    }

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const accessToken = signAccessToken(user.id, user.email);

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          avatarUrl: user.avatarUrl,
          roles: userRoles.map((ur) => ({ role: ur.role.name, projectId: ur.projectId })),
        },
        accessToken,
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
