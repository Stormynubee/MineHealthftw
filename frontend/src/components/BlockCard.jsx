import React from "react";

export default function BlockCard({ title, icon, accent = "var(--grass)", children, className = "", action, testId }) {
  return (
    <section className={`block-card-static p-4 md:p-5 ${className}`} data-testid={testId}>
      {(title || action) && (
        <header className="flex items-center justify-between mb-3 pb-2" style={{borderBottom: "2px solid var(--bg-3)"}}>
          <div className="flex items-center gap-2">
            {icon && <div style={{
              width: 22, height: 22, background: accent, border: "2px solid #000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</div>}
            <h3 className="font-pixel text-[13px] uppercase tracking-wider">{title}</h3>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
