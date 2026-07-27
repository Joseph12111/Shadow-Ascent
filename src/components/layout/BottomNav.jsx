import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Dumbbell, Home, ListChecks, ScrollText, TrendingUp } from 'lucide-react';

const bottomNavItems = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Quests', to: '/quests', icon: ScrollText },
  { label: 'Workout', to: '/workout', icon: Dumbbell },
  { label: 'Tasks', to: '/checklist', icon: ListChecks },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
];

export default function BottomNav({ loading = false, error = null, empty = false, items = bottomNavItems }) {
  const [overlayOpen, setOverlayOpen] = useState(() => Number(globalThis?.__shadowAscentOverlayCount || 0) > 0);

  useEffect(() => {
    function handleOverlayChange(event) {
      setOverlayOpen(Number(event?.detail?.count || globalThis?.__shadowAscentOverlayCount || 0) > 0);
    }

    globalThis?.addEventListener?.('shadowAscentOverlayChange', handleOverlayChange);
    handleOverlayChange();

    return () => {
      globalThis?.removeEventListener?.('shadowAscentOverlayChange', handleOverlayChange);
    };
  }, []);

  if (loading) {
    return <div className={`fixed inset-x-3 bottom-3 z-30 h-16 animate-pulse rounded-2xl border border-white/10 bg-shadow-secondary/90 transition-all duration-300 ease-out md:hidden ${overlayOpen ? 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0' : 'translate-y-0 opacity-100'}`} />;
  }

  if (error || empty) {
    return null;
  }

  return (
    <nav
      className={`fixed inset-x-3 bottom-3 z-30 transition-all duration-300 ease-out md:hidden ${overlayOpen ? 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0' : 'translate-y-0 opacity-100'}`}
      aria-label="Primary mobile navigation"
    >
      <div className="glass-card grid grid-cols-5 gap-1 p-2">
        {items?.map((item) => {
          const Icon = item?.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.68rem] font-semibold transition ${
                  isActive ? 'bg-shadow-gold/15 text-shadow-gold shadow-goldGlow' : 'text-shadow-textMuted hover:bg-white/[0.04] hover:text-shadow-text'
                }`
              }
              key={item?.to}
              to={item?.to || '/'}
            >
              {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
              <span className="truncate">{item?.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export { bottomNavItems };
