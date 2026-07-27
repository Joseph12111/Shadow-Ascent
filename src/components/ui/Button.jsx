const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-shadow-gold/70 disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: 'border-shadow-gold/40 bg-shadow-gold text-black shadow-goldGlow hover:bg-shadow-goldDark',
  secondary: 'border-shadow-purple/40 bg-shadow-purple/20 text-shadow-purpleLight shadow-purpleGlow hover:bg-shadow-purple/30',
  ghost: 'border-white/10 bg-white/[0.03] text-shadow-textSecondary hover:border-shadow-gold/30 hover:text-shadow-gold',
  danger: 'border-shadow-red/40 bg-shadow-red/15 text-shadow-red hover:bg-shadow-red/25',
};

const sizes = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
  icon: 'h-11 w-11 px-0 py-0',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  error = null,
  empty = false,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const variantClass = variants?.[variant] || variants?.primary;
  const sizeClass = sizes?.[size] || sizes?.md;

  return (
    <button
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading || Boolean(error) || empty}
      type={type}
      aria-busy={loading}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {error ? 'Unavailable' : children}
    </button>
  );
}
