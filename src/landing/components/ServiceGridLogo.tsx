import { content } from "../content";

export function ServiceGridLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 32"
      role="img"
      aria-label={content.brand.name}
      className={className}
      fill="none"
    >
      <g transform="translate(0,4)" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1.2" y="1.2" width="21.6" height="21.6" rx="6" />
        <rect x="5.5" y="5.5" width="6.0" height="6.0" rx="2" />
        <rect x="13.1" y="5.5" width="6.0" height="6.0" rx="2" fill="currentColor" stroke="none" />
        <rect x="5.5" y="13.1" width="6.0" height="6.0" rx="2" />
        <rect x="13.1" y="13.1" width="6.0" height="6.0" rx="2" />
      </g>
      <text
        x="36"
        y="22"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        fontSize="18"
        fontWeight="700"
        letterSpacing="-0.01em"
        fill="currentColor"
      >
        {content.brand.name}
      </text>
    </svg>
  );
}
