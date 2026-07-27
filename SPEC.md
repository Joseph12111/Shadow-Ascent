\# Shadow Ascent — Full Build Specification



\## Visual Reference

\- Primary visual source: attached mockup screenshot

\- Save screenshot locally as: `docs/shadow-ascent-reference.png`

\- Match style exactly: neon fantasy RPG, dark glassmorphism, gold/purple hierarchy, high polish



\---



\## Project Goal

Build a production-ready fitness RPG web app named \*\*Shadow Ascent\*\* with:

\- Auth

\- Daily quests

\- Workout logging + timer

\- Brain quest

\- Checklist + bad habits

\- AI tools (workout generator, meal planner, meal scanner)

\- Shop + equipment

\- Profile + rank progression

\- Progress charts

\- Freemium + owner system

\- Privacy policy + calculators + PWA + error boundaries



\---



\## Exact Stack (no substitutions)

\- React 18 (hooks)

\- Vite

\- Tailwind CSS v3

\- React Router v6

\- Supabase (PostgreSQL + Auth)

\- Recharts

\- Lucide React

\- CSS transitions + keyframes

\- State: useState/useEffect/useContext

\- HTTP: native fetch only



\---



\## Exact Folder Structure



src/

├── components/

│   ├── ui/

│   │   ├── Button.jsx

│   │   ├── Card.jsx

│   │   ├── Toast.jsx

│   │   ├── Modal.jsx

│   │   ├── LoadingSpinner.jsx

│   │   ├── ProgressBar.jsx

│   │   └── StatBadge.jsx

│   ├── layout/

│   │   ├── Navigation.jsx

│   │   ├── BottomNav.jsx

│   │   ├── Sidebar.jsx

│   │   └── BurgerMenu.jsx

│   ├── game/

│   │   ├── RankEmblem.jsx

│   │   ├── RankWidget.jsx

│   │   ├── XPBar.jsx

│   │   ├── StatRadar.jsx

│   │   └── AchievementCard.jsx

│   └── features/

│       ├── BrainQuestModal.jsx

│       ├── WorkoutTimer.jsx

│       ├── HeatmapGrid.jsx

│       └── BrainQuestResetTimer.jsx

├── pages/

│   ├── Login.jsx

│   ├── Signup.jsx

│   ├── ResetPassword.jsx

│   ├── Dashboard.jsx

│   ├── Quests.jsx

│   ├── Workout.jsx

│   ├── WorkoutGenerator.jsx

│   ├── MealPlanner.jsx

│   ├── MealScanner.jsx

│   ├── Shop.jsx

│   ├── Profile.jsx

│   ├── Checklist.jsx

│   ├── Progress.jsx

│   ├── RankOverview.jsx

│   └── PrivacyPolicy.jsx

├── contexts/

│   └── AuthContext.jsx

├── lib/

│   └── supabase.js

├── utils/

│   ├── rankEngine.js

│   ├── achievementEngine.js

│   ├── brainQuestEngine.js

│   ├── usageTracker.js

│   └── ownerCheck.js

├── data/

│   └── brainQuestBank.js

├── config/

│   └── rankSystem.js

└── hooks/

&#x20;   ├── useAuth.js

&#x20;   ├── useProfile.js

&#x20;   └── useToast.js



\---



\## Required Env

Create `.env.example`:



VITE\_SUPABASE\_URL=https://your-project.supabase.co  

VITE\_SUPABASE\_ANON\_KEY=your\_anon\_key  

VITE\_OPENAI\_API\_KEY=sk-your-key  

VITE\_OWNER\_EMAIL=your@email.com



\---



\## Functional Requirements by Phase



\### Phase 1 — Foundation

\- Project setup

\- Supabase client + auth helpers

\- AuthContext:

&#x20; - expose `user`, `profile`, `loading`, `updateProfile`

&#x20; - profile cache in `localStorage:userProfile`

&#x20; - auth state change handling

&#x20; - password recovery handling

&#x20; - login sync from Supabase

&#x20; - logout clear local keys



\### Phase 2 — Engines

\- Rank system (10 ranks + exact RP thresholds/divisions)

\- rankEngine methods:

&#x20; - `calculateRank(totalRP)`

&#x20; - `addRP(amount, source)`

&#x20; - `getTotalRP()`

&#x20; - `getNextRankInfo(rankData)`

\- Achievement engine with 6 achievements and +100 XP unlock bonus

\- BrainQuest engine:

&#x20; - daily 3 questions, multi-category

&#x20; - answer comparison by text string (`trim`)

&#x20; - no double rewards

\- Usage tracker freemium limits:

&#x20; - workoutGenerator=2

&#x20; - mealPlanner=2

&#x20; - mealScanner=1

\- ownerCheck via `VITE\_OWNER\_EMAIL`



\### Phase 3 — Brain Question Bank

\- 120+ questions (20 each in 6 categories):

&#x20; - iq, general, health, science, logic, maths

\- each question includes:

&#x20; - id, category, difficulty, question, options(4), correctAnswer, explanation, points

\- `correctAnswer` must match one option

\- include validation function



\### Phase 4 — UI Components

\- Bottom nav (mobile), Sidebar (desktop), Burger menu

\- Toast system (success/error/achievement/warning)

\- Rank emblems as pure SVG (all 10 ranks)

\- Challenger emblem animated float/glow



\### Phase 5 — Auth Pages

\- Login, Signup, Reset Password

\- proper inline validation + friendly errors

\- forgot password modal flow



\### Phase 6 — Main Feature Pages

\- Dashboard fully interactive

\- Quests (5 quests + rewards + streak + brain quest modal)

\- Workout logger + templates + workout timer overlay + history

\- Checklist:

&#x20; - My Tasks tab

&#x20; - Bad Habits tab with streak logic + milestones



\### Phase 7 — AI Pages

\- Workout Generator (Responses API text generation only)

\- Meal Planner

\- Meal Scanner (image input)

\- usage limits + upgrade modal + owner bypass



\### Phase 8 — Shop / Profile / Rank

\- Shop with 15 items and buy/equip flow

\- Profile with all sections

\- Rank Overview with RP history



\### Phase 9 — Progress

\- Recharts-based real data charts:

&#x20; - XP progression

&#x20; - Radar

&#x20; - Pie

&#x20; - Workout frequency

&#x20; - Heatmap

&#x20; - Habit discipline

&#x20; - Gold economy

&#x20; - Achievement progress

\- Never fake/random chart data



\### Phase 10 — Connections

\- Emit/listen window events:

&#x20; - statUpdated, rpUpdated, xpUpdated, goldUpdated

&#x20; - brainQuestCompleted, dailyQuestUpdated, workoutCompleted

&#x20; - achievementUnlocked, rankUp

\- localStorage and Supabase sync across features



\### Phase 11 — Freemium + Owner

\- enforce limits

\- owner unlimited

\- no upgrade prompts for owner



\### Phase 12 — Final Touches

\- Privacy policy page

\- Calculators page (BMR, TDEE, Macros, 1RM, Hydration)

\- Rank up celebration modal

\- PWA manifest

\- Error boundaries

\- loading states/skeletons



\---



\## Final Acceptance

App must:

\- Work without page refresh

\- Persist in localStorage

\- Sync to Supabase in background

\- Handle loading/empty/error safely

\- Work on mobile (375px) and desktop (1440px)

\- Feel like premium RPG app

