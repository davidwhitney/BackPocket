import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { type NetworkStatus } from "../hooks/useNetworkStatus.ts";
import { AppLogoIcon, BookmarkIcon, PlusCircleIcon, SettingsIcon } from "./Icons.tsx";

interface LayoutProps {
  networkStatus: NetworkStatus;
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Bookmarks", icon: <BookmarkIcon /> },
  { to: "/add", label: "Add", icon: <PlusCircleIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export function Layout({ networkStatus, children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <Link to="/" className="app-logo">
          <AppLogoIcon />
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
        <header className="app-header">
          <div className="header-row">
            <Link to="/" className="app-logo">
              <AppLogoIcon />
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
