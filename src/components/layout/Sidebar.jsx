import { NavLink } from 'react-router-dom';
import { BadgeCheck, Bell, Brain, Calculator, Dumbbell, FileCheck, Home, ListChecks, Medal, ScanLine, ScrollText, ShoppingBag, Trash2, TrendingUp, Utensils, User } from 'lucide-react';
import RankWidget from '../game/RankWidget.jsx';
import AppLogo from './AppLogo.jsx';

const sidebarItems = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Quests', to: '/quests', icon: ScrollText },
  { label: 'Workout', to: '/workout', icon: Dumbbell },
  { label: 'Generator', to: '/workout-generator', icon: Brain },
  { label: 'Meal Planner', to: '/meal-planner', icon: Utensils },
  { label: 'Meal Scanner', to: '/meal-scanner', icon: ScanLine },
  { label: 'Checklist', to: '/checklist', icon: ListChecks },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
  { label: 'Ranks', to: '/rank-overview', icon: Medal },
  { label: 'Plans', to: '/subscription', icon: BadgeCheck },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Delete Account', to: '/delete-account', icon: Trash2 },
  { label: 'Shop', to: '/shop', icon: ShoppingBag },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Calculators', to: '/calculators', icon: Calculator },
  { label: 'Privacy', to: '/privacy-policy', icon: FileCheck },
];

export default function Sidebar({ profile, rankData, loading = false, error = null, empty = false, items = sidebarItems }) {
  const sidebarStyle = {
    background: 'linear-gradient(180deg, #0A0A0F 0%, #121522 50%, #0F1017 100%)',
    borderRight: '1px solid rgba(255, 215, 0, 0.15)',
    boxShadow: '4px 0 20px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(0px)',
  };

  if (loading) {
    return <aside className="hidden h-screen w-72 shrink-0 animate-pulse lg:block" style={sidebarStyle} />;
  }

  if (error) {
    return (
      <aside className="relative z-[80] hidden h-screen w-72 shrink-0 p-5 lg:block" style={sidebarStyle}>
        <div className="glass-card p-4 text-sm text-shadow-textSecondary">Navigation could not be loaded.</div>
      </aside>
    );
  }

  if (empty) {
    return (
      <aside className="relative z-[80] hidden h-screen w-72 shrink-0 p-5 lg:block" style={sidebarStyle}>
        <div className="glass-card p-4 text-sm text-shadow-textSecondary">Navigation is empty.</div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 z-[80] hidden h-screen w-72 shrink-0 p-5 lg:block" style={sidebarStyle}>
      <div className="mb-6 flex items-center gap-3">
        <AppLogo className="h-12 w-12" />
        <div>
          <p className="font-heading text-xl font-bold text-shadow-gold">Shadow Ascent</p>
          <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">RPG Fitness</p>
        </div>
      </div>

      <RankWidget compact profile={profile} rankData={rankData} />

      <nav className="mt-6 space-y-1" aria-label="Primary desktop navigation">
        {items?.map((item) => {
          const Icon = item?.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-shadow-gold/30 bg-shadow-gold/15 text-shadow-gold shadow-goldGlow'
                    : 'border-transparent text-shadow-text hover:border-white/15 hover:bg-white/[0.06] hover:text-shadow-gold'
                }`
              }
              key={item?.to}
              to={item?.to || '/'}
            >
              {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
              <span>{item?.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export { sidebarItems };
