import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { type NetworkStatus } from "../hooks/useNetworkStatus.ts";

interface LayoutProps {
  networkStatus: NetworkStatus;
  children: ReactNode;
}

const navItems = [
  {
    to: "/",
    label: "Bookmarks",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    to: "/add",
    label: "Add",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    to: "/search",
    label: "Search",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export function Layout({ networkStatus, children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <div className="app-layout">
      {/* Sidebar — desktop only */}
      <aside className="app-sidebar">
        <Link to="/" className="app-logo">
          <svg viewBox="0 0 100 100" width="28" height="28">
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
          <span>BackPocket</span>
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className={isActive(item.to)}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        {!networkStatus.online && (
          <span className="offline-badge sidebar-offline">Offline</span>
        )}
        {networkStatus.pendingCount > 0 && (
          <div className="pending-banner sidebar-pending">
            {networkStatus.pendingCount} pending
          </div>
        )}
      </aside>

      <div className="app-body">
        {/* Header — mobile only */}
        <header className="app-header">
          <div className="header-row">
            <Link to="/" className="app-logo">
              <svg viewBox="0 0 100 100" width="28" height="28">
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
              <span>BackPocket</span>
            </Link>
            {!networkStatus.online && (
              <span className="offline-badge">Offline</span>
            )}
          </div>
          {networkStatus.pendingCount > 0 && (
            <div className="pending-banner">
              {networkStatus.online
                ? `Syncing ${networkStatus.pendingCount} snapshot${networkStatus.pendingCount !== 1 ? "s" : ""}...`
                : `${networkStatus.pendingCount} snapshot${networkStatus.pendingCount !== 1 ? "s" : ""} pending`}
            </div>
          )}
        </header>

        <main className="app-main">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="app-nav">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} className={isActive(item.to)}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
