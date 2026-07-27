import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { Brain, ChevronDown, Crown, Menu, Settings, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import AppLogo from './AppLogo.jsx';
import { sidebarItems } from './Sidebar.jsx';

const SHADOW_LABELS = ['Dashboard', 'Profile', 'Ranks'];
const AI_LABELS = ['Generator', 'Meal Planner', 'Meal Scanner', 'Calculators'];
const SETTINGS_LABELS = ['Plans', 'Notifications', 'Privacy', 'Delete Account'];
const HIDDEN_MOBILE_LABELS = [
  'Dashboard',
  'Profile',
  'Ranks',
  'Generator',
  'Meal Planner',
  'Meal Scanner',
  'Calculators',
  'Plans',
  'Notifications',
  'Privacy',
  'Delete Account',
  'Quests',
  'Workout',
  'Checklist',
  'Progress',
];

function navItemClass(isActive, nested = false) {
  return `group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200 ease-out [transform:perspective(600px)_translateZ(0)] before:absolute before:left-1/2 before:top-1/2 before:h-1 before:w-1 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-shadow-gold/15 before:opacity-0 before:transition-all before:duration-300 before:content-[''] active:[transform:perspective(600px)_rotateX(2deg)_translateY(1px)] active:before:h-72 active:before:w-72 active:before:opacity-100 ${
    isActive
      ? 'border-shadow-gold/28 bg-[radial-gradient(circle_at_center,rgba(240,192,64,0.16)_0%,rgba(240,192,64,0.09)_44%,rgba(12,14,24,0.96)_100%)] text-shadow-gold shadow-[0_9px_18px_rgba(0,0,0,0.42),0_0_14px_rgba(240,192,64,0.12),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-8px_14px_rgba(0,0,0,0.28)]'
      : `border-white/8 bg-[#0C0E17] text-shadow-text shadow-[0_8px_14px_rgba(0,0,0,0.34),0_0_12px_rgba(139,92,246,0.05),inset_0_1px_0_rgba(255,255,255,0.035),inset_0_-7px_12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-shadow-gold/22 hover:bg-[#111421] hover:text-shadow-gold hover:shadow-[0_10px_18px_rgba(0,0,0,0.4),0_0_14px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] ${nested ? 'ml-4 min-h-11 text-xs' : ''}`
  }`;
}

function DropdownGroup({ icon: Icon, label, open, active, children, onToggle }) {
  return (
    <div className="space-y-2">
      <button
        className={`${navItemClass(active)} w-full`}
        onClick={onToggle}
        type="button"
        aria-expanded={open}
      >
        {Icon ? <Icon className="relative z-10 h-5 w-5 shrink-0" aria-hidden="true" /> : null}
        <span className="relative z-10 flex-1 text-left">{label}</span>
        <ChevronDown className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div className={`overflow-hidden transition-all duration-150 ease-out ${open ? 'max-h-56 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-2 pb-1">{children}</div>
      </div>
    </div>
  );
}

export default function BurgerMenu({ loading = false, error = null, empty = false, items = sidebarItems }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const [shadowOpen, setShadowOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const shadowItems = (Array.isArray(items) ? items : []).filter((item) => SHADOW_LABELS.includes(item?.label));
  const aiItems = (Array.isArray(items) ? items : []).filter((item) => AI_LABELS.includes(item?.label));
  const settingsItems = (Array.isArray(items) ? items : []).filter((item) => SETTINGS_LABELS.includes(item?.label));
  const topLevelItems = (Array.isArray(items) ? items : []).filter((item) => !HIDDEN_MOBILE_LABELS.includes(item?.label));
  const shadowActive = shadowItems.some((item) => item?.to === location?.pathname);
  const aiActive = aiItems.some((item) => item?.to === location?.pathname);
  const settingsActive = settingsItems.some((item) => item?.to === location?.pathname);

  useEffect(() => {
    let closeTimer;

    if (open) {
      setMounted(true);
      setShadowOpen(shadowActive);
      setAiOpen(aiActive);
      setSettingsOpen(settingsActive);
      try {
        globalThis.document.body.style.overflow = 'hidden';
      } catch {
        undefined;
      }
    } else {
      closeTimer = globalThis?.setTimeout?.(() => {
        setMounted(false);
        try {
          globalThis.document.body.style.overflow = '';
        } catch {
          undefined;
        }
      }, 150);
    }

    return () => {
      if (closeTimer) {
        globalThis?.clearTimeout?.(closeTimer);
      }
      if (!open) {
        try {
          globalThis.document.body.style.overflow = '';
        } catch {
          undefined;
        }
      }
    };
  }, [aiActive, open, settingsActive, shadowActive]);

  function openMenu() {
    setMounted(true);
    globalThis?.requestAnimationFrame?.(() => setOpen(true));
  }

  function closeMenu() {
    setOpen(false);
  }

  function toggleGroup(groupName) {
    if (groupName === 'shadow') {
      setShadowOpen((current) => !current);
      setAiOpen(false);
      setSettingsOpen(false);
      return;
    }

    if (groupName === 'ai') {
      setShadowOpen(false);
      setAiOpen((current) => !current);
      setSettingsOpen(false);
      return;
    }

    setShadowOpen(false);
    setAiOpen(false);
    setSettingsOpen((current) => !current);
  }

  if (loading) {
    return <div className="h-11 w-11 animate-pulse rounded-xl border border-white/10 bg-white/[0.03] lg:hidden" />;
  }

  if (error || empty) {
    return null;
  }

  const menuOverlay = mounted ? (
    <div
      className={`fixed inset-0 isolate z-[2147483647] bg-black/90 backdrop-blur-md transition-opacity ease-out ${open ? 'opacity-100 duration-[250ms]' : 'opacity-0 duration-150'}`}
      onClick={closeMenu}
    >
      <aside
        className={`relative z-[2147483647] h-full w-[min(20rem,calc(100%-2rem))] overflow-hidden rounded-none border-r border-shadow-gold/25 p-5 shadow-[10px_0_40px_rgba(0,0,0,0.72)] transition-all ease-out ${open ? 'translate-x-0 opacity-100 duration-[250ms]' : '-translate-x-4 opacity-0 duration-150'}`}
        onClick={(event) => event?.stopPropagation?.()}
        style={{
          background: '#0A0A0F',
        }}
      >
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(180deg, #07080E 0%, #0B1020 44%, #090A12 100%)',
            boxShadow: 'inset -1px 0 0 rgba(240,192,64,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_35%_0%,rgba(139,92,246,0.2),transparent_34%),radial-gradient(circle_at_75%_22%,rgba(240,192,64,0.12),transparent_28%)]" />

        <div className="relative z-20 mb-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate font-heading text-xl font-bold text-shadow-gold">Shadow Ascent</p>
              <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Menu</p>
            </div>
          </div>
          <Button aria-label="Close menu" onClick={closeMenu} size="icon" variant="ghost">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <nav className="relative z-20 space-y-2" aria-label="Mobile menu navigation">
          <DropdownGroup active={shadowActive} icon={Crown} label="Shadow" onToggle={() => toggleGroup('shadow')} open={shadowOpen}>
            {shadowItems?.map((item) => {
              const Icon = item?.icon;

              return (
                <NavLink
                  className={({ isActive }) => navItemClass(isActive, true)}
                  key={item?.to}
                  onClick={closeMenu}
                  to={item?.to || '/'}
                >
                  {Icon ? <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  <span className="relative z-10">{item?.label}</span>
                </NavLink>
              );
            })}
          </DropdownGroup>

          <DropdownGroup active={aiActive} icon={Brain} label="AI" onToggle={() => toggleGroup('ai')} open={aiOpen}>
            {aiItems?.map((item) => {
              const Icon = item?.icon;

              return (
                <NavLink
                  className={({ isActive }) => navItemClass(isActive, true)}
                  key={item?.to}
                  onClick={closeMenu}
                  to={item?.to || '/'}
                >
                  {Icon ? <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  <span className="relative z-10">{item?.label}</span>
                </NavLink>
              );
            })}
          </DropdownGroup>

          <DropdownGroup active={settingsActive} icon={Settings} label="Settings" onToggle={() => toggleGroup('settings')} open={settingsOpen}>
            {settingsItems?.map((item) => {
              const Icon = item?.icon;

              return (
                <NavLink
                  className={({ isActive }) => navItemClass(isActive, true)}
                  key={item?.to}
                  onClick={closeMenu}
                  to={item?.to || '/'}
                >
                  {Icon ? <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  <span className="relative z-10">{item?.label}</span>
                </NavLink>
              );
            })}
          </DropdownGroup>

          {topLevelItems?.map((item) => {
            const Icon = item?.icon;

            return (
              <NavLink
                className={({ isActive }) => navItemClass(isActive)}
                key={item?.to}
                onClick={closeMenu}
                to={item?.to || '/'}
              >
                {Icon ? <Icon className="relative z-10 h-5 w-5 shrink-0" aria-hidden="true" /> : null}
                <span className="relative z-10">{item?.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <div className="lg:hidden">
      <Button aria-label="Open menu" onClick={openMenu} size="icon" variant="ghost">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {menuOverlay && globalThis?.document?.body ? createPortal(menuOverlay, globalThis.document.body) : null}
    </div>
  );
}
