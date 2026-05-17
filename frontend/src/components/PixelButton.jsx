import React from "react";

export default function PixelButton({ variant = "default", className = "", children, ...props }) {
  const cls = {
    default: "pixel-btn",
    primary: "pixel-btn pixel-btn-primary",
    gold: "pixel-btn pixel-btn-gold",
    diamond: "pixel-btn pixel-btn-diamond",
    danger: "pixel-btn pixel-btn-danger",
  }[variant] || "pixel-btn";
  return (
    <button className={`${cls} ${className}`} {...props}>
      {children}
    </button>
  );
}
