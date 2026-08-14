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
      <circle cx="12" cy="36" r="5" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="36" cy="36" r="5" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M12 31V22C12 19.8 13.8 18 16 18H30"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M30 10L34 10M32 10V22L36 31"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 31H20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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
