export function ServiceGridMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect x="1" y="1" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="2"/>
      <rect x="5" y="5" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="5" width="6" height="6" rx="2" fill="currentColor"/>
      <rect x="5" y="13" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="13" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
