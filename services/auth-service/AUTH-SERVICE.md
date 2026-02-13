# AUTH-SERVICE.md

## Overview
Handles user authentication, authorization, registration, and session management. Supports local email/password auth and OAuth2 (Google, Microsoft). Issues JWT access/refresh tokens. Manages RBAC (Role-Based Access Control).

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Auth:** Passport.js (local, google-oauth20, azure-ad)
- **Tokens:** jsonwebtoken (access: 15min, refresh: 7d)
- **Password:** bcrypt (12 rounds)
- **Validation:** Zod

## Port: 3001
## Schema: `auth`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login with email/password |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Invalidate session |
| POST | /auth/forgot-password | Send reset email |
| POST | /auth/reset-password | Reset with token |
| GET | /auth/me | Get current user profile |
| PATCH | /auth/me | Update profile |

### OAuth2
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/google | Google OAuth redirect |
| GET | /auth/google/callback | Google OAuth callback |
| GET | /auth/microsoft | Microsoft OAuth redirect |
| GET | /auth/microsoft/callback | Microsoft callback |

### Roles & Permissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/roles | List all roles |
| POST | /auth/users/:id/roles | Assign role to user |
| DELETE | /auth/users/:id/roles/:roleId | Remove role |

## Database Tables
- `auth.users` — User accounts
- `auth.sessions` — Refresh token sessions
- `auth.roles` — System and custom roles
- `auth.user_roles` — User-role assignments (can be project-scoped)

## JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["project_manager"],
  "iat": 1708000000,
  "exp": 1708000900
}
```

## Environment Variables
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
JWT_SECRET=<secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
MICROSOFT_CLIENT_ID=<id>
MICROSOFT_CLIENT_SECRET=<secret>
FRONTEND_URL=http://localhost:3100
SMTP_HOST=smtp.resend.com
SMTP_API_KEY=<key>
```

## Dependencies
- express, passport, passport-local, passport-google-oauth20
- jsonwebtoken, bcrypt, zod
- @prisma/client, prisma
- nodemailer, pino

## Setup & Run
```bash
cd services/auth-service
npm install
npx prisma migrate dev
npm run dev
```
