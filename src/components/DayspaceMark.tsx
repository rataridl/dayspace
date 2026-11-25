export function DayspaceMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" fill="#1E3F31" />
      <path
        d="M11 23.5C11 16.5 16.5 11.5 24.5 11.5C24.5 19.5 19.5 24.5 12.5 24.5"
        stroke="#FBF9F4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 24.5L19 16.5"
        stroke="#A3C4AD"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
