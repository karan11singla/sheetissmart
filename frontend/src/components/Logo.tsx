export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#logoGradient)" />

      {/* Grid pattern */}
      <g stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
        <line x1="15" y1="10" x2="15" y2="30" />
        <line x1="20" y1="10" x2="20" y2="30" />
        <line x1="25" y1="10" x2="25" y2="30" />
        <line x1="10" y1="15" x2="30" y2="15" />
        <line x1="10" y1="20" x2="30" y2="20" />
        <line x1="10" y1="25" x2="30" y2="25" />
      </g>

      {/* Spark accent */}
      <circle cx="29" cy="11" r="4.5" fill="url(#accentGradient)" />
      <path
        d="M27.2 11.2 L28.4 12.4 L30.8 10"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
