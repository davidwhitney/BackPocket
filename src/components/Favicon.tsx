import { useState } from "react";
import { getFaviconUrl } from "../utils/format.ts";

interface Props {
  url: string;
  size?: number;
}

export function Favicon({ url, size = 16 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="favicon-placeholder" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </span>
    );
  }

  return (
    <img
      className="favicon"
      src={getFaviconUrl(url, size * 2)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
