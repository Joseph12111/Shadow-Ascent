import shadowAscentLogo from '../../assets/shadowAscentLogo.jpg';

export default function AppLogo({ className = 'h-11 w-11', imageClassName = '', label = 'Shadow Ascent logo' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-shadow-purple/40 bg-black shadow-[0_0_18px_rgba(139,92,246,0.35),0_0_22px_rgba(240,192,64,0.12)] ${className}`}
    >
      <img
        alt={label}
        className={`h-full w-full object-cover ${imageClassName}`}
        draggable="false"
        src={shadowAscentLogo}
      />
    </span>
  );
}
