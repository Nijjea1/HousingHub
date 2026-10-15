/** An arched front door with a ring knocker. Draws in the current text colour. */
export const LogoMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 26V14a6 6 0 0 1 12 0v12M7 26h18" strokeWidth="2.2" />
    <path d="M16 13.5v1.6" strokeWidth="2.2" />
    <circle cx="16" cy="18" r="2.4" strokeWidth="1.8" />
  </svg>
);

export const Wordmark = () => (
  <span className="flex items-center gap-2 text-foreground">
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <LogoMark className="h-6 w-6" />
    </span>
    <span className="font-serif text-lg font-semibold tracking-tight">LetMeKnock</span>
  </span>
);
