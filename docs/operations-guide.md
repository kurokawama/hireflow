# HireFlow Operations Guide

## 1. System Overview

HireFlow is an internal AI recruitment engine for Dr. Stretch / Wecle.
Three channels work together: Hunt (paid ads), Fish (organic trainer posts), Nurture (diagnostic quiz + CRM).

### Architecture
- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **AI Engine**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Hosting**: Vercel
- **Future integrations**: Meta Marketing API, LINE Messaging API

### User Roles
| Role | Access | Description |
|------|--------|-------------|
| admin | Full access | System administrator |
| hq_staff | All stores | HQ recruitment team |
| store_manager | Own store | Store-level manager |
| trainer | Own store (limited) | Trainer portal only |

---

## 2. Initial Setup

### 2.1 Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and execute:
   - `supabase/ddl.sql` (creates all tables, enums, RLS policies)
   - `supabase/seed.sql` (inserts default organization + prompt templates)
3. Note your project credentials:
   - Project URL: `https://xxxx.supabase.co`
   - Anon Key: `eyJhbGc...` (public, safe for client)
   - Service Role Key: `eyJhbGc...` (secret, server-only)

### 2.2 Create First Admin User

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > Email + Password
3. Set email and password for the admin
4. Copy the user's UUID
5. In SQL Editor, run:

```sql
-- Replace YOUR_ORG_ID with the org ID from seed.sql output
-- Replace USER_UUID with the auth user UUID
INSERT INTO organization_members (org_id, auth_user_id, role, display_name)
VALUES ('YOUR_ORG_ID', 'USER_UUID', 'admin', 'Admin Name');
```

### 2.3 Anthropic API Key

1. Get an API key from https://console.anthropic.com
2. The key format is `sk-ant-api03-...`

### 2.4 Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-api03-...
APP_BASE_URL=https://your-domain.vercel.app
```

### 2.5 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (first time)
npx vercel --prod

# Set environment variables (one at a time)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add APP_BASE_URL

# Redeploy after adding env vars
npx vercel --prod
```

### 2.6 Post-Deploy Verification

1. Access `https://your-domain.vercel.app/login`
2. Login with admin credentials
3. Verify dashboard loads
4. Navigate to Settings > Stores and create at least one store

---

## 3. Daily Operations

### 3.1 HR Staff Workflow (PC)

#### Morning Routine
1. Login at `/login`
2. Check Dashboard for weekly KPIs:
   - Content generations count
   - Apply link clicks
   - Quiz completions
   - Applications count
3. Review new candidates at `/candidates`

#### Content Generation
1. Go to `/generator`
2. Select store and brand profile
3. Choose template type:
   - `job_post`: Standard recruitment posts
   - `story_ad`: Story-format ads (Instagram/TikTok)
   - `nurture_dm`: Follow-up DM messages
4. Select target platforms (Instagram, TikTok, LINE, Meta Ad)
5. Click "Generate" - AI creates content for all selected platforms
6. Review generated content in the results panel
7. Edit if needed, then distribute through each platform

#### Content Library Management
1. Go to `/library`
2. Filter by status (draft/approved/published/archived)
3. Click any content to view/edit details
4. Approve content before publishing
5. Archive old content

#### Candidate Pool Management
1. Go to `/candidates`
2. Review candidates sorted by AI score (0-100)
3. Click a candidate to see:
   - Quiz answers (sports experience, interests, area, etc.)
   - AI-calculated match score with factor breakdown
   - Stage timeline (quiz_completed > applied > interviewed > hired)
4. Update candidate stage as they progress

### 3.2 Trainer Workflow (Mobile)

1. Open trainer portal on smartphone
2. Browse available content for your store
3. Tap "Copy" to copy post text
4. Paste into your personal Instagram/TikTok
5. Post as a natural, lifestyle-oriented update (not a job ad)

### 3.3 Quiz Page (Public)

- URL: `https://your-domain.vercel.app/quiz`
- Can include UTM parameters: `?utm_source=instagram&utm_medium=organic&utm_campaign=spring2026`
- Steps:
  1. Sports/fitness experience
  2. Areas of interest
  3. Preferred area
  4. Age range
  5. Start timing + optional name/email
- Results page shows matched store recommendation

---

## 4. Settings Management

### 4.1 Store Management (`/settings/stores`)
- Add/edit store locations
- Fields: store name, area, description, station
- Each store gets its own content pipeline and candidate pool

### 4.2 Brand Profiles (`/settings/profiles`)
- Configure brand voice for content generation
- Fields: brand name, tone, target persona, USPs
- NG words: words AI must never use
- Must-include: phrases AI must always include
- Profiles are applied when generating content

### 4.3 Team Members (`/settings/members`)
- Add/remove organization members
- Assign roles (admin, hq_staff, store_manager, trainer)
- Assign store access for store_manager/trainer roles

### 4.4 Staff Voices (`/settings/voices`)
- Collect real trainer testimonials
- Track consent status (pending/approved/declined)
- Approved voices are used by AI to create authentic content

---

## 5. Analytics (`/analytics`)

### Monthly Metrics
- Content generation count by platform
- Click-through rates per channel
- Quiz completion rates
- Application conversion rates

### Channel Breakdown
- **organic**: Trainer personal posts
- **meta_ad**: Paid Meta/Instagram ads
- **line**: LINE messaging
- **direct**: Direct/other channels

### Pipeline Tracking
- quiz_completed > applied > interviewed > hired
- Track conversion rates between stages

---

## 6. Apply Link System

### How It Works
1. Each generated content includes a unique apply link (`/a/XXXXXXXX`)
2. When clicked, the link:
   - Records the click (channel, platform tracking)
   - Redirects to the quiz page with store pre-selected
3. Analytics track click counts per link

### URL Format
- Pattern: `https://your-domain.vercel.app/a/{8-char-hex-code}`
- Redirect target: Quiz page with store context

---

## 7. AI Content Generation Details

### Template Types
| Type | Use Case | Output |
|------|----------|--------|
| job_post | Regular recruitment | Natural lifestyle posts (not job-ad style) |
| story_ad | Paid story ads | Short, engaging story-format content |
| nurture_dm | Follow-up messages | Personal DMs for candidate nurturing |

### Platform Specifications
| Platform | Max Length | Format |
|----------|-----------|--------|
| Instagram | 2200 chars | Caption + hashtags |
| TikTok | 300 chars | Short hook + script outline |
| LINE | 500 chars | Conversational message |
| Meta Ad | 125 chars primary | Ad headline + body |

### Content Validation
- NG words are automatically checked
- Must-include phrases are verified
- Ad compliance check for Meta policies (no discriminatory language)
- Validation issues are flagged but content is still saved as draft

---

## 8. Candidate Scoring Algorithm

The AI scores candidates 0-100 based on quiz answers:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Sports Experience | 30% | current=30, past=24, injury_break=18, spectator=9, none=3 |
| Age Range | 20% | 18-22=20, 23-27=18, 28-32=14, 33+=10 |
| Start Timing | 25% | immediately=25, 1-3months=18, exploring=8 |
| Interest Match | 25% | (matched interests / total options) * 25 |

### Score Interpretation
- **80-100**: High-priority candidate (likely ready to apply)
- **60-79**: Good match (worth nurturing)
- **40-59**: Moderate match (keep in pool)
- **Below 40**: Low match (passive interest)

---

## 9. Troubleshooting

### Common Issues

**Login fails**
- Check Supabase Auth settings
- Verify the user exists in Authentication > Users
- Verify organization_members record exists with correct auth_user_id

**Dashboard shows "Mock" badge**
- Supabase queries are failing
- Check SUPABASE_SERVICE_ROLE_KEY is set correctly
- Check RLS policies are applied (run ddl.sql)

**Content generation fails**
- Check ANTHROPIC_API_KEY is valid
- Check API quota/rate limits
- Review error in generation_requests table (status = "failed")

**Quiz results page is blank**
- Check that candidate was created in candidates table
- Verify the quiz/result page has correct candidate_id parameter

**Apply links return 404**
- Check apply_links table has the code
- Verify APP_BASE_URL is set correctly

### Database Health Check

```sql
-- Check table counts
SELECT 'organizations' as t, count(*) FROM organizations
UNION ALL SELECT 'stores', count(*) FROM stores
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'prompt_templates', count(*) FROM prompt_templates
UNION ALL SELECT 'candidates', count(*) FROM candidates
UNION ALL SELECT 'generated_contents', count(*) FROM generated_contents;
```

---

## 10. Security Notes

- All API routes require authentication (except quiz, apply links)
- RLS policies enforce org-level data isolation
- Service role key is NEVER exposed to client
- Admin operations use `createAdminClient()` (bypasses RLS)
- Regular user operations use `createClient()` (RLS enforced)
- Content validation prevents prohibited language in ads

---

## 11. Future Roadmap (Phase 2-3)

### Phase 2: Hunt Channel
- Meta Marketing API integration for automated ad campaigns
- A/B test multiple creatives per campaign
- Auto-optimize targeting based on quiz completion data

### Phase 3: Nurture Channel
- LINE Messaging API for automated follow-up sequences
- Candidate re-engagement workflows
- Interview scheduling automation

### Phase 4: Analytics Enhancement
- ROI calculator per channel
- Predictive scoring model refinement
- Store-level performance benchmarking
