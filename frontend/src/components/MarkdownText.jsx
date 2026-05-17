import React from "react";

// Lightweight markdown renderer: bold (**text**), italic (*text*), line breaks, inline code.
// No full markdown — just clean up AI output so asterisks don't show literally.
function render(text) {
  if (!text) return null;
  // Normalize: strip stray markdown dashes that aren't intentional bullets
  const nodes = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIdx = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) nodes.push(text.slice(lastIdx, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={i++} style={{color: "var(--gold)"}}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={i++}>{match[4]}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(<code key={i++} style={{background: "var(--bg-0)", padding: "0 4px"}}>{match[6]}</code>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  // Split on newlines while preserving inline nodes
  return nodes.flatMap((n, idx) => {
    if (typeof n !== "string") return [n];
    const parts = n.split("\n");
    return parts.flatMap((p, i2) => (i2 < parts.length - 1 ? [p, <br key={`br-${idx}-${i2}`}/>] : [p]));
  });
}

export default function MarkdownText({ children, className = "" }) {
  return <span className={className}>{render(children)}</span>;
}
