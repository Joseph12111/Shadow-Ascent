export default function LoadingSpinner({ label = 'Loading', size = 'md', error = null, empty = false }) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (error) {
    return <p className="text-sm text-shadow-red">Unable to load this section.</p>;
  }

  if (empty) {
    return <p className="text-sm text-shadow-textSecondary">Nothing to load yet.</p>;
  }

  return (
    <div className="flex items-center justify-center gap-3 text-shadow-textSecondary" role="status">
      <span className={`${sizes?.[size] || sizes?.md} animate-spin rounded-full border-2 border-shadow-gold border-t-transparent shadow-goldGlow`} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
