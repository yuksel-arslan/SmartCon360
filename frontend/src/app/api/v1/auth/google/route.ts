import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { v4 as uuidv4 } from 'uuid';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// POST /api/v1/auth/google — Authenticate with Google OAuth2 authorization code
// The code flow gives us: id_token (user info) + refresh_token (Drive access)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both new code flow and legacy credential (ID token) flow
    const { code, credential } = body;

    let email: string;
    let googleId: string;
    let firstName: string;
    let lastName: string;
    let avatarUrl: string | undefined;
    let googleRefreshToken: string | null = null;

    if (code) {
      // ── New OAuth2 Authorization Code flow ──
      // Exchanges code for access_token + refresh_token + id_token
      if (!CLIENT_ID || !CLIENT_SECRET) {
        return NextResponse.json(
          { data: null, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth is not configured on the server (missing GOOGLE_CLIENT_SECRET)' } },
          { status: 500 },
        );
      }

      // Use direct HTTP request to Google token endpoint for better error visibility
      let tokens: { id_token?: string | null; refresh_token?: string | null; access_token?: string | null };
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: 'postmessage',
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
          console.error('[Google OAuth] Token exchange failed:', JSON.stringify(tokenData));
          const errDesc = tokenData.error_description || tokenData.error || 'Token exchange failed';
          return NextResponse.json(
            { data: null, error: { code: tokenData.error || 'TOKEN_EXCHANGE_FAILED', message: errDesc } },
            { status: tokenRes.status >= 500 ? 500 : 400 },
          );
        }

        tokens = tokenData;
      } catch (tokenErr: unknown) {
        const msg = tokenErr instanceof Error ? tokenErr.message : 'Token exchange network error';
        console.error('[Google OAuth] Token exchange exception:', msg);
        return NextResponse.json(
          { data: null, error: { code: 'TOKEN_EXCHANGE_FAILED', message: msg } },
          { status: 500 },
        );
      }

      // Extract user info from id_token
      if (!tokens.id_token) {
        return NextResponse.json(
          { data: null, error: { code: 'NO_ID_TOKEN', message: 'Could not obtain identity from Google' } },
          { status: 400 },
        );
      }

      const idPayload = JSON.parse(
        Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf-8'),
      );

      email = idPayload.email;
      googleId = idPayload.sub;
      firstName = idPayload.given_name || '';
      lastName = idPayload.family_name || '';
      avatarUrl = idPayload.picture;
      googleRefreshToken = tokens.refresh_token || null;

    } else if (credential) {
      // ── Legacy ID token flow (backwards compatibility) ──
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return NextResponse.json(
          { data: null, error: { code: 'INVALID_TOKEN', message: 'Invalid Google token format' } },
          { status: 400 },
        );
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      email = payload.email;
      googleId = payload.sub;
      firstName = payload.given_name || '';
      lastName = payload.family_name || '';
      avatarUrl = payload.picture;

    } else {
      return NextResponse.json(
        { data: null, error: { code: 'MISSING_CREDENTIAL', message: 'Google authorization code or credential is required' } },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_EMAIL', message: 'Google account must have an email' } },
        { status: 400 },
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Update Google provider info + refresh token
      const updateData: Record<string, unknown> = {
        lastLoginAt: new Date(),
        avatarUrl: avatarUrl || user.avatarUrl,
      };

      if (user.authProvider !== 'google') {
        updateData.authProvider = 'google';
        updateData.authProviderId = googleId;
        updateData.emailVerified = true;
      }

      // Always update refresh token if we got a new one
      if (googleRefreshToken) {
        updateData.googleRefreshToken = googleRefreshToken;
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    } else {
      // Create new user from Google
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          avatarUrl,
          authProvider: 'google',
          authProviderId: googleId,
          emailVerified: true,
          ...(googleRefreshToken && { googleRefreshToken }),
        },
      });

      // Assign role: admin for platform admins, viewer for others
      const PLATFORM_ADMINS = ['contact@yukselarslan.com'];
      const roleName = PLATFORM_ADMINS.includes(email.toLowerCase()) ? 'admin' : 'viewer';
      const defaultRole = await prisma.role.findUnique({ where: { name: roleName } });
      if (defaultRole) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: defaultRole.id },
        });
      }
    }

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const accessToken = signAccessToken(user.id, user.email);

    // Create refresh token + session
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt },
    });

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
        refreshToken,
        driveConnected: !!user.googleRefreshToken,
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
