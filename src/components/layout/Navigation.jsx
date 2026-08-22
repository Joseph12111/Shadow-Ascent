import AppLogo from './AppLogo.jsx';
import BurgerMenu from './BurgerMenu.jsx';
import BetaBadge from '../ui/BetaBadge.jsx';
import NotificationBell from '../ui/NotificationBell.jsx';

export default function Navigation({ profile = null, loading = false, error = null, empty = false }) {
  const displayName = profile?.display_name || profile?.email || 'Ascendant';

  if (loading) {
    return <header className="h-20 animate-pulse border-b border-shadow-purple/20 bg-shadow-secondary/70 lg:hidden" />;
  }

  if (error) {
    return <header className="border-b border-shadow-red/20 bg-shadow-secondary/70 px-5 py-4 text-sm text-shadow-textSecondary lg:hidden">Navigation unavailable.</header>;
  }

  if (empty) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-shadow-purple/20 bg-shadow-secondary/80 px-5 py-4 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppLogo className="h-11 w-11" />
          <div>
            <p className="font-heading text-lg font-bold text-shadow-gold">Shadow Ascent</p>
            <div className="mt-0.5 flex max-w-[11rem] items-center gap-2">
              <p className="min-w-0 truncate text-[0.65rem] font-semibold text-shadow-textMuted">{displayName}</p>
              <BetaBadge compact className="shrink-0" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          <BurgerMenu />
        </div>
      </div>
    </header>
  );
}
