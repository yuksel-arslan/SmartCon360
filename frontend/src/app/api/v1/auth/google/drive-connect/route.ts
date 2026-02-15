import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// POST /api/v1/auth/google/drive-connect — Exchange auth code for Drive refresh token
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { data: null, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } },
        { status: 400 },
      );
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth is not configured on the server' } },
        { status: 500 },
      );
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'postmessage');
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_REFRESH_TOKEN', message: 'Could not obtain Drive access. Please revoke SmartCon360 access in your Google Account settings and try again.' } },
        { status: 400 },
      );
    }

    // Store the Google refresh token
    await prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: tokens.refresh_token },
    });

    return NextResponse.json({
      data: { connected: true },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// GET /api/v1/auth/google/drive-connect — Check Drive connection status
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true, email: true },
    });

    return NextResponse.json({
      data: {
        connected: !!user?.googleRefreshToken,
        email: user?.email,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/auth/google/drive-connect — Disconnect Google Drive
export async function DELETE(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    await prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: null },
    });

    return NextResponse.json({
      data: { connected: false },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
