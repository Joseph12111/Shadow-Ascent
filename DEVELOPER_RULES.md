\# Shadow Ascent — Developer Rules (Strict)



\## 1) Stack Lock (No substitutions)

\- React 18 hooks

\- Vite

\- Tailwind CSS v3

\- React Router v6

\- Supabase Auth + Postgres

\- Recharts

\- Lucide React

\- Native fetch only



\## 2) Design Tokens (Exact)

\- Background primary: #0a0a0f

\- Background secondary: #111118

\- Background card: #1a1a2e

\- Gold primary: #f0c040

\- Gold dark: #d4a017

\- Purple primary: #8b5cf6

\- Purple dark: #6d28d9

\- Purple light: #a78bfa

\- Red accent: #ef4444

\- Green accent: #22c55e

\- Blue accent: #6ab0ff

\- Cyan accent: #00d4ff

\- Text primary: #ffffff

\- Text secondary: #9ca3af

\- Text muted: #6b7280

\- Border default: rgba(255,255,255,0.08)

\- Border gold: rgba(240,192,64,0.3)

\- Border purple: rgba(139,92,246,0.3)



\## 3) Typography

\- Headings: Cinzel, bold, gold

\- Body: Inter, white/grey



\## 4) Glassmorphism Card

\- background: rgba(17,17,24,0.8)

\- backdrop-filter: blur(12px)

\- border: 1px solid rgba(240,192,64,0.15)

\- border-radius: 16px

\- box-shadow:

&#x20; - 0 8px 32px rgba(0,0,0,0.4)

&#x20; - inset 0 1px 0 rgba(255,255,255,0.05)



\## 5) Neon Glow

\- Gold: 0 0 20px rgba(240,192,64,0.4)

\- Purple: 0 0 20px rgba(139,92,246,0.4)

\- Red: 0 0 20px rgba(239,68,68,0.4)

\- Green: 0 0 20px rgba(34,197,94,0.4)



\## 6) Engineering Rules (Mandatory)

\- Use optional chaining everywhere: `user?.id`

\- Wrap all localStorage calls in try/catch

\- Wrap all Supabase calls in try/catch

\- localStorage updates first for instant UI

\- Supabase writes non-blocking (.then().catch())

\- Never expose raw errors to users

\- All keys from `import.meta.env`

\- Never hardcode secrets

\- Every component/page must handle:

&#x20; - loading

&#x20; - empty

&#x20; - error states

\- No fake/random chart data for business values

\- Do not use Math.random for app data logic



\## 7) Event Bus Rules

Must emit/listen these events where relevant:

\- statUpdated

\- rpUpdated

\- xpUpdated

\- goldUpdated

\- brainQuestCompleted

\- dailyQuestUpdated

\- workoutCompleted

\- achievementUnlocked

\- rankUp



\## 8) Build Workflow

\- Implement in phase order only

\- Do not skip required files

\- No placeholder TODO-only files

\- After each phase:

&#x20; - run `npm run build`

&#x20; - fix all compile/runtime errors

&#x20; - report changed files



\## 9) Output Contract for Agent

When generating code:

1\. State phase completed

2\. List files changed

3\. Write complete code to files

4\. Confirm build status

5\. Report blockers (if any)



\## 10) Visual Quality Gate

Must match screenshot feel:

\- neon fantasy RPG

\- premium polish

\- mobile-first + desktop parity

\- smooth transitions/keyframes

