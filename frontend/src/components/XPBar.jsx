import React from "react";

export default function XPBar({ value = 0, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="xp-bar-shell" data-testid="xp-bar">
      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
