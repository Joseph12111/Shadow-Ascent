import { ArrowRight, Brain, Dumbbell, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLogo from '../components/layout/AppLogo.jsx';
import BetaBadge from '../components/ui/BetaBadge.jsx';
import welcomeVideo from '../assets/shadow-ascent-welcome.mp4';

const features = [
  {
    title: 'Train With Purpose',
    text: 'Build workouts, track every session, and turn consistency into visible progress.',
    icon: Dumbbell,
  },
  {
    title: 'Strengthen Discipline',
    text: 'Daily quests, habits, and reminders keep your next useful action clear.',
    icon: ShieldCheck,
  },
  {
    title: 'Evolve Your Shadow',
    text: 'Earn XP, climb ranks, and unlock a progression system shaped by real effort.',
    icon: Trophy,
  },
  {
    title: 'Plan With Intelligence',
    text: 'Use secure AI tools for training and nutrition guidance built around your goals.',
    icon: Brain,
  },
];

const ctaClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-shadow-gold/70';

export default function Landing() {
  return (
    <div className="relative z-10 min-h-screen overflow-hidden bg-black text-shadow-text">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link className="flex min-w-0 items-center gap-3" to="/" aria-label="Shadow Ascent home">
            <AppLogo className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-bold text-shadow-gold">Shadow Ascent</p>
              <p className="text-[0.62rem] font-semibold uppercase text-shadow-textMuted">Fitness RPG</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <BetaBadge compact className="hidden sm:inline-flex" />
            <Link className="text-sm font-semibold text-shadow-textSecondary transition hover:text-shadow-gold" to="/login">
              Log In
            </Link>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[78dvh] items-end overflow-hidden pt-24">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          poster="/icon-source.png"
        >
          <source src={welcomeVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(10,10,15,0.7)_46%,#0a0a0f_100%)]" />
        <div className="absolute inset-0 bg-black/25" />

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8 sm:pb-16">
          <BetaBadge />
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight text-shadow-gold sm:text-6xl lg:text-7xl">
            Shadow Ascent
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Turn training, nutrition, and daily discipline into an RPG progression system built around the life you want to forge.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className={`${ctaClass} border-shadow-gold/50 bg-shadow-gold text-black shadow-goldGlow hover:bg-shadow-goldDark`} to="/signup">
              Start Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link className={`${ctaClass} border-shadow-purple/50 bg-shadow-purple/20 text-shadow-purpleLight hover:bg-shadow-purple/30`} to="/signup?source=beta">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Join Beta
            </Link>
            <Link className={`${ctaClass} border-white/15 bg-black/45 text-white hover:border-shadow-gold/35 hover:text-shadow-gold`} to="/subscription">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-shadow-secondary py-12 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-shadow-purpleLight">Your ascent, made visible</p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-shadow-gold sm:text-4xl">Build the person your goals require.</h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features?.map((feature) => {
              const Icon = feature?.icon;
              return (
                <article className="glass-card min-w-0 p-5" key={feature?.title}>
                  {Icon ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-shadow-purple/30 bg-shadow-purple/10 text-shadow-purpleLight">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  ) : null}
                  <h3 className="mt-4 font-heading text-lg font-bold text-shadow-gold">{feature?.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">{feature?.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-black py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-shadow-purpleLight">Beta access is open</p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-shadow-gold">Your first quest starts today.</h2>
            <p className="mt-3 text-sm leading-6 text-shadow-textSecondary">
              Join free, shape the product with feedback, and begin building momentum one completed action at a time.
            </p>
          </div>
          <Link className={`${ctaClass} shrink-0 border-shadow-gold/50 bg-shadow-gold text-black shadow-goldGlow hover:bg-shadow-goldDark`} to="/signup?source=beta">
            Join the Beta
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
