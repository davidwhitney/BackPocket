import { type NetworkStatus } from "../hooks/useNetworkStatus.ts";

interface Props {
  networkStatus: NetworkStatus;
  compact?: boolean;
}

export function StatusIndicator({ networkStatus, compact }: Props) {
  return (
    <>
      {!networkStatus.online && (
        <span className="offline-badge">Offline</span>
      )}
      {networkStatus.pendingCount > 0 && (
        <div className="pending-banner">
          {compact
            ? `${networkStatus.pendingCount} pending`
            : networkStatus.online
              ? `Syncing ${networkStatus.pendingCount} snapshot${networkStatus.pendingCount !== 1 ? "s" : ""}...`
              : `${networkStatus.pendingCount} snapshot${networkStatus.pendingCount !== 1 ? "s" : ""} pending`}
        </div>
      )}
    </>
  );
}
