import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from './hooks/useAuth.js';
import AppLogo from './components/layout/AppLogo.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Navigation from './components/layout/Navigation.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import PageSkeleton from './components/ui/PageSkeleton.jsx';
import RankUpCelebrationModal from './components/features/RankUpCelebrationModal.jsx';
import WelcomeOpening from './components/features/WelcomeOpening.jsx';
import NotificationScheduler from './components/features/NotificationScheduler.jsx';
import { markWelcomeOpeningSeen, shouldShowWelcomeOpening } from './utils/welcomeOpening.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Quests from './pages/Quests.jsx';
import Workout from './pages/Workout.jsx';
import Checklist from './pages/Checklist.jsx';
import WorkoutGenerator from './pages/WorkoutGenerator.jsx';
import MealPlanner from './pages/MealPlanner.jsx';
import MealScanner from './pages/MealScanner.jsx';
import Shop from './pages/Shop.jsx';
import Profile from './pages/Profile.jsx';
import RankOverview from './pages/RankOverview.jsx';
import Progress from './pages/Progress.jsx';
import SubscriptionPlans from './pages/SubscriptionPlans.jsx';
import NotificationSettings from './pages/NotificationSettings.jsx';
import DeleteAccount from './pages/DeleteAccount.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Calculators from './pages/Calculators.jsx';

function FoundationPanel() {
  const { user, profile, loading, error, passwordRecovery } = useAuth();
  const displayName = profile?.display_name || user?.email || 'Ascendant';
  const hasProfile = Boolean(profile?.id || user?.id);

  if (loading) {
    return (
      <section className="glass-card mx-auto flex w-full max-w-3xl flex-col items-center gap-4 p-8 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-shadow-gold border-t-transparent shadow-goldGlow" />
        <p className="text-sm uppercase tracking-[0.24em] text-shadow-textSecondary">Binding your ascent</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-card mx-auto w-full max-w-3xl p-8">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-6 w-6 text-shadow-red" aria-hidden="true" />
          <div>
            <h2 className="font-heading text-2xl font-bold text-shadow-gold">Connection Ward Active</h2>
            <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">
              Shadow Ascent is running locally, but the remote profile channel is unavailable. Your local cache remains protected.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid w-full gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-shadow-purpleLight">Phase 1 Foundation</p>
            <h1 className="mt-3 font-heading text-4xl font-bold text-shadow-gold sm:text-5xl">Shadow Ascent</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-shadow-textSecondary sm:text-base">
              Auth state, profile caching, protected environment config, and background Supabase sync are ready for the next ascent.
            </p>
          </div>
          <AppLogo className="h-16 w-16" />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatusTile label="Session" value={user?.id ? 'Linked' : 'Guest'} tone={user?.id ? 'gold' : 'purple'} />
          <StatusTile label="Profile" value={hasProfile ? 'Cached' : 'Empty'} tone={hasProfile ? 'gold' : 'purple'} />
          <StatusTile label="Recovery" value={passwordRecovery ? 'Open' : 'Idle'} tone={passwordRecovery ? 'gold' : 'purple'} />
        </div>
      </div>

      <aside className="glass-card p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
          <h2 className="font-heading text-xl font-bold text-shadow-gold">Current Adventurer</h2>
        </div>

        {user?.id ? (
          <div className="mt-5 space-y-4">
            <InfoRow label="Name" value={displayName} />
            <InfoRow label="Email" value={user?.email || 'Hidden'} />
            <InfoRow label="Profile Cache" value={profile?.updated_at ? 'Synced locally' : 'Ready'} />
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm leading-6 text-shadow-textSecondary">
              No active Supabase session yet. Auth pages arrive in Phase 5; the foundation is ready to receive them.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}

function StatusTile({ label, value, tone }) {
  const toneClass = tone === 'gold' ? 'text-shadow-gold border-shadow-gold/30' : 'text-shadow-purpleLight border-shadow-purple/30';

  return (
    <div className={`rounded-2xl border bg-black/20 p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-shadow-textMuted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-shadow-textMuted">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-shadow-text">{value}</span>
    </div>
  );
}

export default function App() {
  const { user, profile, loading, error } = useAuth();
  const location = useLocation();
  const authRoutes = ['/login', '/signup', '/reset-password'];
  const isAuthRoute = authRoutes.includes(location?.pathname);
  const [rankUpOpen, setRankUpOpen] = useState(false);
  const [rankUpData, setRankUpData] = useState(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    try {
      globalThis?.window?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      globalThis?.document?.documentElement?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      globalThis?.document?.body?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      return;
    }
  }, [location?.pathname]);

  useEffect(() => {
    function handleRankUp(event) {
      const detail = event?.detail;
      const nextRankId = detail?.nextRank?.rankId || detail?.nextRank?.id;

      if (!nextRankId) {
        return;
      }

      setRankUpData(detail);
      setRankUpOpen(true);
    }

    globalThis?.addEventListener?.('rankUp', handleRankUp);

    return () => {
      globalThis?.removeEventListener?.('rankUp', handleRankUp);
    };
  }, []);

  useEffect(() => {
    if (loading || isAuthRoute || !user?.id) {
      return;
    }

    setWelcomeOpen(shouldShowWelcomeOpening(user));
  }, [isAuthRoute, loading, user]);

  function finishWelcomeOpening() {
    markWelcomeOpeningSeen(user);
    setWelcomeOpen(false);
  }

  return (
    <div className="min-h-screen bg-shadow-primary text-shadow-text">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(240,192,64,0.16),transparent_30%),linear-gradient(180deg,rgba(10,10,15,0),#0a0a0f_72%)]" />
      <div className="pointer-events-none fixed left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-shadow-purple/15 blur-3xl animate-auraDrift" />

      {isAuthRoute ? (
        <main className="relative z-10 flex min-h-screen w-full items-center px-5 py-8 sm:px-8">
          <Routes>
            <Route element={<Login />} path="/login" />
            <Route element={<Signup />} path="/signup" />
            <Route element={<ResetPassword />} path="/reset-password" />
            <Route element={<Login />} path="*" />
          </Routes>
        </main>
      ) : (
        <>
          <div className="relative z-10 flex min-h-screen">
            <Sidebar error={error} loading={loading} profile={profile} />

            <div className="min-w-0 flex-1 pb-24 lg:pb-0">
              <Navigation error={error} loading={loading} profile={profile} />

              <header className="mx-auto hidden w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:flex">
                <Link to="/" className="flex items-center gap-3" aria-label="Shadow Ascent home">
                  <AppLogo className="h-11 w-11" />
                  <span className="font-heading text-xl font-bold text-shadow-gold">Shadow Ascent</span>
                </Link>
                <span className="rounded-full border border-shadow-purple/30 bg-shadow-secondary/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-shadow-purpleLight">
                  Final Touches
                </span>
              </header>

              <main className="mx-auto flex w-full max-w-6xl px-5 pb-10 pt-8 sm:px-8 sm:pt-14 lg:pt-8">
                {loading ? (
                  <PageSkeleton />
                ) : (
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/quests" element={<Quests />} />
                    <Route path="/workout" element={<Workout />} />
                    <Route path="/workout-generator" element={<WorkoutGenerator />} />
                    <Route path="/meal-planner" element={<MealPlanner />} />
                    <Route path="/meal-scanner" element={<MealScanner />} />
                    <Route path="/checklist" element={<Checklist />} />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/rank-overview" element={<RankOverview />} />
                    <Route path="/subscription" element={<SubscriptionPlans />} />
                    <Route path="/notifications" element={<NotificationSettings />} />
                    <Route path="/delete-account" element={<DeleteAccount />} />
                    <Route path="/calculators" element={<Calculators />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<Dashboard />} />
                  </Routes>
                )}
              </main>
            </div>
          </div>
          <BottomNav error={error} loading={loading} />
        </>
      )}

      {!isAuthRoute ? null : (
        <nav className="fixed left-5 top-5 z-20 sm:left-8 sm:top-8" aria-label="Auth navigation">
          <Link to="/" className="flex items-center gap-3 rounded-2xl border border-shadow-gold/20 bg-shadow-secondary/70 px-3 py-2 text-shadow-gold shadow-goldGlow backdrop-blur-xl">
            <AppLogo className="h-8 w-8 rounded-xl" />
            <span className="font-heading text-sm font-bold">Shadow Ascent</span>
          </Link>
        </nav>
      )}

      <RankUpCelebrationModal onClose={() => setRankUpOpen(false)} open={!isAuthRoute && rankUpOpen} rankUpData={rankUpData} />
      <WelcomeOpening displayName={profile?.display_name || user?.email || 'Ascendant'} onFinish={finishWelcomeOpening} open={!isAuthRoute && welcomeOpen} />
      {!isAuthRoute ? <NotificationScheduler /> : null}
    </div>
  );
}
