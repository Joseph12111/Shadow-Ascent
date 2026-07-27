export default function PageSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <section className="glass-card p-6">
        <div className="h-6 w-40 rounded-lg bg-white/10" />
        <div className="mt-4 h-4 w-72 max-w-full rounded-lg bg-white/10" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="glass-card h-72" />
        <div className="glass-card h-72" />
      </section>
    </div>
  );
}
