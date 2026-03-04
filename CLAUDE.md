# HireFlow — AI Recruitment Engine

## Overview
Dr. Stretch / Wecle brands internal AI recruitment tool.
Hunt (paid SNS ads) x Fish (organic trainer posts) x Nurture (diagnostic quiz + candidate pool).

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- Supabase (PostgreSQL, Auth, RLS)
- Claude API (content generation)
- Tailwind CSS + shadcn/ui
- Vercel (hosting)

## Design Tokens

### Colors
```css
:root {
  /* Brand — Dr. Stretch */
  --ds-primary: #E63946;        /* Red — energy, action */
  --ds-primary-hover: #C62F3B;
  --ds-secondary: #1D3557;      /* Navy — trust, professionalism */
  --ds-accent: #F4A261;         /* Orange — warmth, approachability */

  /* Brand — Wecle */
  --wecle-primary: #6B9080;     /* Sage green — calm, wellness */
  --wecle-primary-hover: #5A7A6B;
  --wecle-secondary: #A4C3B2;   /* Light sage */
  --wecle-accent: #CCE3DE;      /* Pale mint */

  /* Neutral (shared) */
  --neutral-50: #FAFAFA;
  --neutral-100: #F5F5F5;
  --neutral-200: #E5E5E5;
  --neutral-300: #D4D4D4;
  --neutral-400: #A3A3A3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;

  /* Semantic */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Background */
  --bg-primary: #FFFFFF;
  --bg-secondary: #FAFAFA;
  --bg-card: #FFFFFF;
  --bg-sidebar: #1D3557;

  /* Text */
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-muted: #A3A3A3;
  --text-inverse: #FFFFFF;
}
```

### Typography
```
Font: Inter (headings) + Noto Sans JP (body)
Scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36
Weight: 400 (body) / 500 (label) / 600 (heading) / 700 (display)
Line height: 1.5 (body) / 1.3 (heading)
```

### Spacing
```
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80
Card padding: 24px
Page margin: 24px (mobile) / 32px (tablet) / 48px (desktop)
```

### Radius
```
sm: 6px (buttons, inputs)
md: 8px (cards)
lg: 12px (modals, large cards)
full: 9999px (avatars, badges)
```

## Directory Structure
```
app/
  (auth)/login/page.tsx
  (app)/layout.tsx           <- Auth guard + sidebar
  (app)/dashboard/page.tsx
  (app)/generator/page.tsx
  (app)/library/page.tsx
  (app)/library/[id]/page.tsx
  (app)/candidates/page.tsx
  (app)/candidates/[id]/page.tsx
  (app)/analytics/page.tsx
  (app)/settings/stores/page.tsx
  (app)/settings/profiles/page.tsx
  (app)/settings/members/page.tsx
  (app)/settings/voices/page.tsx
  (trainer)/layout.tsx       <- Trainer auth guard
  (trainer)/trainer/page.tsx
  quiz/page.tsx              <- Public
  quiz/result/page.tsx       <- Public
  a/[code]/route.ts          <- Public redirect
  api/...
lib/
  supabase/server.ts
  supabase/admin.ts
  authz.ts
  ai/claude.ts
  ai/scoring.ts
  validators.ts
  apply-code.ts
types/
  database.ts
  dto.ts
```

## Roles
- admin: Full access (HQ leadership)
- hq_staff: All stores, content approval, analytics
- store_manager: Own store(s), content generation/editing
- trainer: Read-only + copy content for personal SNS

## Coding Rules
- TypeScript strict mode
- Functional components only
- Server Actions for mutations
- Use design tokens (no hardcoded colors/sizes)
- Japanese UI text, English code/comments
- Error handling on every API call
- RLS on every table (Supabase)

## Key Patterns
- Auth: Supabase Auth (email/password, internal accounts only)
- Auth guard: (app)/layout.tsx checks session, redirects to /login
- Admin client: lib/supabase/admin.ts (service_role, bypasses RLS)
- Server client: lib/supabase/server.ts (user session, respects RLS)
- Content generation: lib/ai/claude.ts (multi-platform single call)
- Apply link tracking: /a/[code] → increment click → redirect
