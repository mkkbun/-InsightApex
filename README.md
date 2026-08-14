# InsightApex — ACCA Practice Platform

Multi-portal ACCA learning platform for **students**, **partner schools**, **lecturers**, and **platform admins**.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Prisma**, **PostgreSQL**, **Auth.js**, **Stripe**, and **Resend**.

**Repository:** [https://github.com/insightapex/insightapex](https://github.com/insightapex/insightapex)

---

## Product overview

| Portal | Who | Main jobs |
|--------|-----|-----------|
| **Student** | ACCA candidates | Practice quizzes, mock exams, progress, billing |
| **Partner** | School / partner admins | Students, classes, lecturers, analytics, reports |
| **Lecturer** | Teachers under a partner | Class performance, at-risk students, notify |
| **Owner / Content Admin** | Platform operators | Content, partners, settings, analytics |

### Highlights

- **Syllabus structure:** Part → Paper → Category → Sub category → Questions  
- **Practice engine:** Single & multi-correct answers, Excel A–D order, flagging, check answer, EN + Burmese explanations (line breaks preserved)  
- **Access levels:** `FREE_TRIAL` vs `PREMIUM` questions; subscription / paper purchase  
- **Billing:** Stripe checkout, subscriptions, paper packs, mock exams  
- **Question import:** Excel (`.xlsx`) bank upload with topic/sub-topic mapping  
- **Partner analytics:** Attempt charts, average score by paper, category performance (filter by paper), weakest subcategories  
- **Lecturer tools:** Dashboard KPIs, category performance, in-app student notify  
- **Roles:** `STUDENT`, `PARTNER_ADMIN`, `LECTURER`, `CONTENT_ADMIN`, `OWNER`

---

## Quick start

### Prerequisites

- Node.js **18+**
- PostgreSQL (**local** or cloud: Neon, Supabase, Railway, etc.)

### 1. Clone and install

```bash
git clone https://github.com/insightapex/insightapex.git
cd insightapex
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Minimum required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Same base URL (email links) |

Optional: Resend (`RESEND_*`), Stripe (`STRIPE_*`), Cloudflare R2 (`R2_*`) — see [Environment variables](#environment-variables).

### 3. Database

```bash
# Prefer migrations in production
npx prisma migrate deploy
# Or during local dev:
npm run db:migrate

# Generate client (also runs on postinstall)
npx prisma generate

# Seed demo papers, users, sample content
npm run db:seed
```

Quick schema sync without migration history (dev only):

```bash
npm run db:push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo accounts

Seeded credentials (change in production):

| Role | Email | Password |
|------|-------|----------|
| Student | `student@insightapex.com` | `Student@12345` |
| Owner / Admin | `admin@insightapex.com` | `Admin@12345` |
| NLAFAA Lecturer (if seeded) | `lecturer.nlafaa@insightapex.com` | `Lecturer@12345` |

Partner / lecturer demo accounts may also be created in seed or linked via admin partner setup.

---

## Key routes

### Public & auth

| Route | Description |
|-------|-------------|
| `/` | Marketing landing |
| `/login` | Student login |
| `/register` | Student registration |
| `/forgot-password` / `/reset-password` | Password recovery |
| `/verify-email` | Email verification |

### Student

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview, weak areas, activity, streak |
| `/dashboard/quiz` | Part → paper → category → sub category practice |
| `/dashboard/quiz/result` | Score, review, explanations |
| `/dashboard/mock-exams` | Mock exam list & attempts |
| `/dashboard/pricing` | Plans & products |
| `/dashboard/billing` | Subscription / purchases |
| `/dashboard/profile` | Account |
| `/dashboard/bookmarks` | Saved items |

### Partner

| Route | Description |
|-------|-------------|
| `/partner` | Partner dashboard |
| `/partner/students` | Student list & detail |
| `/partner/classes` | Classes |
| `/partner/lecturers` | Lecturers |
| `/partner/analytics` | Period filters, paper charts, category performance, weak subs |
| `/partner/reports` | Reports |
| `/partner/settings` | Organisation settings |

### Lecturer

| Route | Description |
|-------|-------------|
| `/lecturer` | Class performance dashboard |
| `/lecturer/students` | Students & detail (practice timeline) |
| `/lecturer/at-risk-students` | Risk list |
| `/lecturer/papers` / `mock-exams` / `questions` | Teaching content views |
| `/lecturer/reports` | Reports |
| `/lecturer/notifications` | Notifications |

### Admin (Owner / Content Admin)

| Route | Description |
|-------|-------------|
| `/admin` | Platform overview |
| `/admin/login` | Admin login |
| `/admin/parts` · `/papers` · `/categories` · `/subcategories` | Syllabus CMS |
| `/admin/questions` | Question CRUD |
| `/admin/questions/import` | Excel import + history |
| `/admin/mock-exams` | Mock exams |
| `/admin/partners` · `/content-admins` | Partner & staff |
| `/admin/analytics` · `/results` · `/settings` | Insights & platform settings |

---

## Practice quiz behaviour

- Options stay in **Excel A → D order** (not shuffled).  
- **Multiple correct** answers (e.g. `B, D` in Excel): multi-select, max selections = correct count; check answer highlights all correct options.  
- **Explanations:** English + Burmese; line breaks from Excel preserved.  
- Question numbers: **1 … N** (no ellipsis collapse).  
- Access gated by **premium subscription / paper purchase** for `PREMIUM` questions; free users only see `FREE_TRIAL`.  
- Only **active** (`isActive`) **PRACTICE** questions count toward practice lists.

---

## Scripts

```bash
npm run dev          # Dev server (port 3000)
npm run dev:clean    # Clear .next then dev
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run db:push      # Push schema (no migration files)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio
```

---

## Folder structure (high level)

```
insightapex/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/brand/                 # Logo assets
├── scripts/                      # One-off links / maintenance scripts
└── src/
    ├── app/
    │   ├── api/                  # REST handlers (auth, quiz, partner, lecturer, admin, billing)
    │   ├── dashboard/            # Student portal
    │   ├── partner/              # Partner portal
    │   ├── lecturer/             # Lecturer portal
    │   ├── admin/                # Owner / content admin
    │   └── (auth & marketing)
    ├── components/
    │   ├── dashboard/            # Quiz panel, charts, cards
    │   ├── partner/ · lecturer/ · portal/ · admin/ · layout/ · ui/
    ├── lib/                      # Auth guards, grading, question access, roles
    ├── services/
    │   ├── access-control/
    │   ├── billing/ · partner/ · lecturer/ · question-import/
    │   ├── email/ · notifications/ · platform-settings/
    └── types/
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL |
| `NEXTAUTH_SECRET` | Yes | Auth.js secret |
| `NEXTAUTH_URL` | Yes | Base URL for Auth.js |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (emails, redirects) |
| `RESEND_API_KEY` | No | Transactional email |
| `EMAIL_FROM` | No | From address (use verified domain, e.g. `InsightApex <noreply@insightapex.co.uk>`) |
| `STRIPE_SECRET_KEY` | No* | Stripe secret (*needed for payments) |
| `STRIPE_WEBHOOK_SECRET` | No* | Stripe webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No* | Stripe.js |
| `R2_*` | No | Cloudflare R2 for uploads |

See [.env.example](.env.example) for the full template.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS, Recharts |
| ORM | Prisma 5 |
| DB | PostgreSQL |
| Auth | NextAuth (Auth.js) credentials + JWT |
| Payments | Stripe |
| Email | Resend |
| Excel import | ExcelJS |

---

## Roles (Prisma `Role`)

| Role | Notes |
|------|--------|
| `STUDENT` | Practice & billing |
| `PARTNER_ADMIN` | `/partner` — own school data only |
| `LECTURER` | `/lecturer` — assigned papers/classes |
| `CONTENT_ADMIN` | Content CMS (scoped) |
| `OWNER` | Full platform admin (legacy “super admin”) |

---

## Development notes

- **Demo static data:** Partner and lecturer portals may use demo fixtures (`PARTNER_DEMO_STATIC_DATA_ENABLED` / lecturer demo flags) for client demos. Disable in the respective demo data modules for live DB-only behaviour.  
- **Imports:** Prefer Admin → Questions → Import for FA / FR banks. Review status must map to **active** questions or students will see empty sub categories.  
- **Git remotes:** Primary remote may be `https://github.com/insightapex/insightapex.git`.

---

## Licence

Private / proprietary unless otherwise specified by InsightApex.
