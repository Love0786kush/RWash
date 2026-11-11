# 🚗 RWash — Doorstep Car Wash & Detailing Platform

Modern full-stack car wash booking platform with real-time admin panel, customer portal, and push notifications.

## 📋 Features

- **Admin Panel** (React + Vite, Port 5173)
  - Manage services, bookings, customers
  - Push notification campaigns
  - Dashboard with realtime updates
  - Service management & pricing

- **Customer Portal** (React + Vite, Port 5176)
  - Phone OTP + Email + Google login
  - Book wash slots
  - Vehicle management
  - Subscriptions & packages
  - Firebase FCM push notifications

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Phone OTP, Email, Google OAuth) |
| Push Notifications | Firebase Cloud Messaging (Web + Edge Functions) |
| Package Manager | npm + Turborepo (workspaces) |
| Testing | Vitest |

## 📁 Project Structure

```
rwash/
├── apps/
│   ├── admin/          # Admin Panel (port 5173)
│   └── client/         # Customer Portal (port 5176)
├── supabase/
│   └── migrations/     # SQL schema migrations (5 files)
├── package.json        # Turborepo root config
├── turbo.json          # Task pipeline
└── .gitignore          # Secrets protected
```

## 🔐 Environment Setup

```bash
# Admin
cp apps/admin/.env.example apps/admin/.env.local
# Edit apps/admin/.env.local with real values

# Client
cp apps/client/.env.example apps/client/.env.local
# Edit apps/client/.env.local with real values
```

### Required Environment Variables

**Supabase:**
- `VITE_SUPABASE_URL` — from Supabase Project Settings
- `VITE_SUPABASE_ANON_KEY` — from Project Settings > API

**Firebase (Web):**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

## 🚀 Getting Started

```bash
# Install dependencies (both apps)
npm install

# Run admin panel
npm run dev:admin  # Port 5173

# Run client portal
npm run dev:client # Port 5176
```

### Supabase Setup

1. Create new project at [supabase.com](https://supabase.com)
2. Run migrations from `supabase/migrations/`
3. Enable Phone Auth in Authentication settings
4. Create Edge Function secrets:
   ```bash
   supabase secrets set FIREBASE_PROJECT_ID="carwash-7c308"
   supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create Web app → Get config keys
3. Enable Cloud Messaging
4. Generate VAPID key for Web Push

## 📊 Database Schema

23 tables across 5 migrations:
- `001_initial_schema.sql` — Core tables
- `002_rls_policies.sql` — RLS policies
- `003_subscriptions.sql` — Subscription plans
- `004_banners.sql` — Marketing content
- `005_notifications.sql` — FCM + campaigns

## 🚀 Deployment

```bash
# Build admin (for Netlify/Vercel)
cd apps/admin && npm run build

# Build client (for Netlify/Vercel)
cd apps/client && npm run build
```

Deploy both `dist/` folders to Netlify or Vercel with environment variables.

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

**Source**: [rwash](https://github.com/your-username/rwash)

Built with ❤️ by RWash Team


