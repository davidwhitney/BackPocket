interface IconProps {
  size?: number;
}

function svg(size: number, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      {children}
    </svg>
  );
}

export function BookmarkIcon({ size = 20 }: IconProps) {
  return svg(size, <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />);
}

export function PlusCircleIcon({ size = 20 }: IconProps) {
  return svg(size, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </>);
}

export function SearchIcon({ size = 20 }: IconProps) {
  return svg(size, <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>);
}

export function SettingsIcon({ size = 20 }: IconProps) {
  return svg(size, <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </>);
}

export function CheckIcon({ size = 16 }: IconProps) {
  return svg(size, <polyline points="20 6 9 17 4 12" />);
}

export function CircleIcon({ size = 16 }: IconProps) {
  return svg(size, <circle cx="12" cy="12" r="10" />);
}

export function ArchiveIcon({ size = 16 }: IconProps) {
  return svg(size, <>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </>);
}

export function ShareIcon({ size = 16 }: IconProps) {
  return svg(size, <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>);
}

export function TrashIcon({ size = 16 }: IconProps) {
  return svg(size, <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </>);
}

export function ArrowLeftIcon({ size = 20 }: IconProps) {
  return svg(size, <>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </>);
}

export function AppLogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <rect width="100" height="100" rx="16" fill="var(--accent)" />
      <path
        d="M25 20h50c3 0 5 2 5 5v40c0 2-1 3-2 4L50 85 22 69c-1-1-2-2-2-4V25c0-3 2-5 5-5z"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M40 20v30l10-8 10 8V20" fill="var(--bg)" opacity="0.8" />
    </svg>
  );
}

export function CloudDownloadIcon({ size = 16 }: IconProps) {
  return svg(size, <>
    <polyline points="8 17 12 21 16 17" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
  </>);
}

export function DeviceIcon({ size = 16 }: IconProps) {
  return svg(size, <>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </>);
}
