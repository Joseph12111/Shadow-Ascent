export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  loading = false,
  error = null,
  empty = false,
  emptyText = 'Nothing to show yet.',
  className = '',
  bodyClassName = '',
}) {
  return (
    <section className={`glass-card min-w-0 overflow-hidden ${className}`}>
      {(title || subtitle || Icon) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="font-heading text-xl font-bold text-shadow-gold">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-shadow-textSecondary">{subtitle}</p> : null}
          </div>
          {Icon ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-shadow-purple/30 bg-shadow-purple/15 text-shadow-purpleLight shadow-purpleGlow">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </header>
      )}

      <div className={`min-w-0 p-5 ${bodyClassName}`}>
        {loading ? (
          <div className="flex min-h-28 items-center justify-center text-shadow-textSecondary">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-shadow-gold border-t-transparent" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">
            This panel could not be loaded right now.
          </div>
        ) : null}

        {!loading && !error && empty ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">{emptyText}</div>
        ) : null}

        {!loading && !error && !empty ? children : null}
      </div>
    </section>
  );
}
