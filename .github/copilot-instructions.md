# SPL Stats Next.js Application - AI Coding Guide

## Project Overview
This is a Next.js 16 application for Splinterlands statistics with authenticated access, encrypted token storage, and comprehensive logging.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Material-UI v7
- **Backend**: Next.js Server Actions, Prisma ORM, PostgreSQL
- **Auth**: NextAuth.js with encrypted token storage (AES-GCM)
- **Logging**: Winston with file rotation
- **State**: React Context for theme and auth
- **Deployment**: Docker with PostgreSQL

## Architecture Patterns

**Authentication**:
- NextAuth.js for OAuth flow
- Tokens encrypted with AES-GCM (random IV per token)
- Encryption key in `.env` (`ENCRYPTION_KEY`)
- Tokens stored in PostgreSQL via Prisma

**Logging**:
- Winston logger with console + file transports
- Logs to `logs/app.log` and `logs/error.log`
- Admin page shows recent logs

**UI Components**:
- TopBar with theme toggle and user menu
- SideBar for navigation
- Material-UI dark/light theme switching
- Responsive layout

## Development Conventions

**Import Aliases**:
- Use `@/` for all internal imports

**File Organization**:
- Actions: `src/lib/backend/actions/`
- Services: `src/lib/backend/services/`
- Components: `src/components/`
- Types: `src/types/`

**Caching**:
- Use Next.js built-in caching (React Cache, fetch cache)
- Server Components with async data fetching

**Database**:
- Prisma client at `@/lib/prisma`
- Run migrations with `npx prisma migrate dev`
- Generate client with `npx prisma generate`
