export function BikeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="11" cy="34" r="7" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="37" cy="34" r="7" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M11 34L20 17H28M28 17L37 34M28 17L23 27H33M20 17H16"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 17H24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="17" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ScooterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="11" cy="36" r="5.2" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="37" cy="36" r="5.2" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M11 36H16L20 24H30"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 24C17.5 24 16 22.4 16 20.4C16 18.4 17.6 17 19.6 17H26C31 17 34.5 19.6 35.5 24L37 31"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 17V13.6C30 12.7 30.7 12 31.6 12H34"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M33 36H37" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function KeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="13" cy="20" r="7.2" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M19.5 20H33M28 20V25M32 20V24"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="20" r="2.2" fill="currentColor" />
    </svg>
  );
}
