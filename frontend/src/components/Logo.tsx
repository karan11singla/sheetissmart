export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Main circle */}
      <circle cx="20" cy="20" r="18" fill="url(#logoGradient)" />

      {/* Grid pattern representing spreadsheet */}
      <g stroke="white" strokeWidth="1.5" strokeLinecap="round">
        {/* Vertical lines */}
        <line x1="15" y1="10" x2="15" y2="30" opacity="0.9" />
        <line x1="20" y1="10" x2="20" y2="30" opacity="0.9" />
        <line x1="25" y1="10" x2="25" y2="30" opacity="0.9" />

        {/* Horizontal lines */}
        <line x1="10" y1="15" x2="30" y2="15" opacity="0.9" />
        <line x1="10" y1="20" x2="30" y2="20" opacity="0.9" />
        <line x1="10" y1="25" x2="30" y2="25" opacity="0.9" />
      </g>

      {/* Accent checkmark or spark */}
      <circle cx="28" cy="12" r="4" fill="#10B981" />
      <path
        d="M26.5 12 L27.5 13 L29.5 11"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
