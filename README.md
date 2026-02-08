# SPL Stats - Splinterlands Statistics Dashboard

A Next.js 16 application for tracking and analyzing Splinterlands game statistics across multiple accounts with secure authentication and encrypted token storage.

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Material-UI v7
- **Backend**: Next.js Server Actions, Prisma ORM v7, PostgreSQL
- **Authentication**: Dual-auth system (Hive Keychain + GitHub OAuth)
- **Security**: AES-256-GCM encryption for token storage
- **Styling**: Material-UI with custom Splinterlands theme
- **State Management**: React Context API (Auth, PageTitle)

### Key Architectural Decisions

#### 1. Server-Side Rendering (SSR) First

**Pattern**: Server Components by default, Client Components only when needed

**Why SSR?**

- **Performance**: Data fetching happens on the server, reducing client-side JavaScript
- **SEO**: Better search engine indexing with pre-rendered content
- **Security**: Sensitive operations (database queries, token decryption) never exposed to client
- **User Experience**: Faster initial page loads, no loading spinners for data

**Implementation Pattern**:

```typescript
// Page (Server Component)
export default async function UsersPage() {
  const user = await getCurrentUser();
  const accounts = await getMonitoredAccounts();
  return <UsersPageContent user={user} accounts={accounts} />;
}

// Client Component (interactions only)
"use client";
export default function UsersPageContent({ user, accounts }) {
  // Handle user interactions, dialogs, etc.
}
```

**When to Use Client Components**:

- User interactions (buttons, forms, dialogs)
- React hooks (useState, useEffect, useContext)
- Browser APIs (localStorage, window)
- Event handlers

#### 2. Prisma 7 with Database Adapters

Uses the new Prisma 7 pattern with PostgreSQL adapter instead of direct connection strings in PrismaClient constructor:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

**Benefits**:

- Connection pooling for better performance
- Required for Prisma 7+ (no direct URL support)
- Better resource management

## Authentication Architecture

### Dual Authentication System

#### 1. User Authentication (Hive Keychain)

**Purpose**: Main user login for Splinterlands account access

**Flow**:

1. User enters Hive username
2. Client requests Hive Keychain signature (browser extension)
3. Keychain signs message: `username + timestamp`
4. Server validates signature with Splinterlands API (`/players/v2/login`)
5. Server receives long-lived SPL token
6. Token is encrypted (AES-256-GCM) and stored in database
7. User ID stored in HTTP-only cookie

**Why This Approach?**

- **No Password Storage**: Uses Hive blockchain signatures
- **Decentralized**: Leverages existing Hive accounts
- **Splinterlands Native**: Same auth method used by Splinterlands game
- **Secure**: Cryptographic signatures prevent forgery

#### 2. Admin Authentication (GitHub OAuth)

**Purpose**: Administrative dashboard access (`/admin` page)

**Flow**:

1. NextAuth.js handles OAuth flow
2. GitHub callback validates user
3. Checks against whitelist (`GITHUB_ALLOWED_USERS` env var)
4. Session stored in HTTP-only cookie

**Why Separate Admin Auth?**

- **Role Separation**: Admin functions distinct from user features
- **Trusted Access**: GitHub accounts as identity source
- **Familiar**: Standard OAuth flow developers understand

### Token Security: AES-256-GCM Encryption

#### Why Encrypt Tokens in Database?

**The Problem**: Splinterlands tokens grant authenticated API access

- Tokens allow full access to Splinterlands game actions (like balances)
- Database breach or SQL injection could expose all user tokens
- Best practice: defense in depth - minimize damage even if infrastructure is compromised

**The Solution**: AES-256-GCM Encryption with unique random IV per token
Also only hive posting key authority is used with this site, No action can be done which needs a active key

**Security Properties**:

1. **Confidentiality**: Token unreadable without encryption key (stored in env var, never in code)
2. **Authenticity**: Auth tag prevents tampering (GCM mode detects modifications)
3. **Unique IV**: Each encryption uses random nonce (prevents pattern analysis attacks)
4. **Server-Only Decryption**: Tokens decrypted on-demand for API calls, never sent to client

**Token Lifecycle**:

1. **Login**: Token encrypted with random IV → stored in DB
2. **API Calls**: Token decrypted server-side → used for API request
3. **Logout**: Database record deleted (token unrecoverable)

**Attack Resistance**:

- ✅ **Database Breach**: Tokens encrypted, attacker needs encryption key
- ✅ **SQL Injection**: Even if data extracted, tokens are ciphertext
- ✅ **Replay Attacks**: Auth tag prevents token modification
- ✅ **Client Exposure**: Tokens never sent to browser, only server-side decryption

#### Cookie Security

Both auth systems use HTTP-only cookies:

```typescript
cookieStore.set(USER_COOKIE, userId, {
  httpOnly: true, // Not accessible via JavaScript
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "lax", // CSRF protection
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

## Project Structure

```
src/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx               # Root layout (SSR, providers)
│   ├── page.tsx                 # Home page
│   ├── admin/                   # Admin dashboard (GitHub OAuth)
│   │   └── page.tsx            # Server Component
│   ├── users/                   # User management (Keychain auth)
│   │   ├── page.tsx            # Server Component (fetch data)
│   │   └── UserManagementContent.tsx  # Client Component (interactions)
│   └── api/
│       └── auth/[...nextauth]/  # NextAuth endpoints
├── components/                   # Reusable UI components
│   ├── LoginComponent.tsx       # Keychain login dialog
│   ├── SideBar.tsx             # Navigation
│   ├── TopBar.tsx              # Header with theme toggle
│   └── ThemeToggle.tsx         # Dark/light mode switch
├── lib/
│   ├── backend/                 # Server-side code
│   │   ├── actions/            # Server Actions (use server directive)
│   │   │   └── auth-actions.ts # Authentication logic
│   │   ├── api/
│   │   │   └── spl/            # Splinterlands API client
│   │   ├── auth/
│   │   │   ├── authOptions.ts  # NextAuth config
│   │   │   └── encryption.ts   # AES-256-GCM functions
│   │   └── log/
│   │       └── logger.server.ts # Winston logging
│   ├── frontend/               # Client-side code
│   │   ├── context/           # React Context providers
│   │   │   ├── AuthContext.tsx  # User auth state
│   │   │   └── PageTitleContext.tsx # Dynamic page titles
│   │   └── themes/
│   │       └── theme.ts        # Material-UI theme
│   └── prisma.ts              # Prisma client singleton
└── types/                      # TypeScript definitions
    └── spl/                    # Splinterlands API types
```

## Development Patterns

### Server Actions Pattern

All database/API operations use Server Actions marked with `"use server"` directive. Server-side only code never exposed to client.

### Page Title Management

Uses `usePageTitle("Page Title")` hook in Client Components to automatically set page titles on mount.

### Material-UI Integration

- `InitColorSchemeScript` in `<head>` prevents theme flash
- `AppRouterCacheProvider` for emotion cache (SSR compatibility)
- `ThemeProvider` with custom Splinterlands theme
- Dark/light mode with persistent localStorage

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/spl_stats"

# Encryption Key (AES-256-GCM)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="64-character-hex-string"

# NextAuth (GitHub OAuth for admin)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GITHUB_ID="oauth-app-id"
GITHUB_SECRET="oauth-app-secret"
GITHUB_ALLOWED_USERS="username1,username2"
```

## Database Schema

See [prisma/schema.prisma](prisma/schema.prisma) for the complete database schema. Key models include User and MonitoredAccount with encrypted token storage (AES-256-GCM fields: encryptedToken, iv, authTag).

### Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Database Commands

```bash
npx prisma studio         # Visual database browser
npx prisma migrate dev    # Create and apply migration
npx prisma generate       # Regenerate client after schema changes
```

### Code Quality

```bash
npm run lint              # ESLint
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Prettier format
npm run format:check      # Check formatting
npm run format:all        # run all static code quality checks
```

## Security Best Practices

### ✅ Implemented

- AES-256-GCM encryption for sensitive tokens
- HTTP-only cookies (no XSS access)
- CSRF protection (SameSite cookies)
- Server-side only token decryption
- Environment variable secrets
- Prisma parameterized queries (SQL injection protection)

### 🔒 Production Checklist

- [ ] Set `secure: true` for cookies (HTTPS only)
- [ ] Use Strong `ENCRYPTION_KEY` (32+ chars) 
- [ ] Use strong `NEXTAUTH_SECRET` (32+ chars)
- [ ] Enable database connection encryption
- [ ] Set up database backups
- [ ] Configure rate limiting on auth endpoints
- [ ] Enable CORS restrictions
- [ ] Use environment-specific secrets (dev/staging/prod)

## Common Tasks

### Add a New SSR Page

```bash
# 1. Create Server Component page
src/app/new-page/page.tsx

# 2. Fetch data with Server Actions
const data = await getServerData();

# 3. Pass to Client Component if interactions needed
<NewPageContent data={data} />
```

### Add a Monitored Account

1. User navigates to `/users`
2. Clicks "Add Account"
3. Signs with Keychain
4. Token encrypted and stored in `monitored_accounts` table

### Decrypt Token (Internal Use)

```typescript
// Server-side only
const token = await getUserToken(userId);
const response = await splinterlandsAPI(token);
```

## Future AI Copilot Context

**When assisting with this project**:

- Always use Server Components by default (async functions in `app/`)
- Add `"use server"` directive for Server Actions
- Use Prisma with adapter pattern (never direct URL in constructor)
- Encrypt tokens before database storage (use `encryptToken()`)
- Import Prisma client from `@/lib/prisma`, not `@prisma/client`
- Follow existing patterns: check similar files before creating new ones
- Use `usePageTitle("Title")` for page titles in Client Components
- Material-UI: Import from `@mui/material`, use theme system
- Never expose tokens or encryption keys to client-side code

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE).

**You are free to**:

- Use this code for personal, educational, or non-commercial projects
- Modify and build upon this code
- Share your modifications

**Under the following terms**:

- **Attribution**: You must give appropriate credit
- **NonCommercial**: You may not use this for commercial purposes without permission
- **ShareAlike**: Your modifications must use the same license

For commercial licensing inquiries, please contact the repository owner.
