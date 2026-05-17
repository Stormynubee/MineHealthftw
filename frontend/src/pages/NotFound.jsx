import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import PixelButton from "../components/PixelButton";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg-1)", backgroundImage: "radial-gradient(circle at center, rgba(239,68,68,0.05), transparent 60%)" }}>
      <div className="block-card-raised p-8 text-center max-w-md w-full" style={{ border: "2px solid var(--redstone)" }}>
        <div style={{ background: "var(--bg-0)", width: 64, height: 64, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}>
          <AlertTriangle size={32} color="var(--redstone)" />
        </div>
        <h1 className="font-pixel text-3xl mb-3" style={{ color: "var(--redstone)" }}>VOID HOLE</h1>
        <p className="font-vt text-xl mb-8" style={{ color: "var(--ink-muted)" }}>
          You fell out of the world. This page doesn't exist.
        </p>
        <Link to="/app">
          <PixelButton variant="primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
            <ArrowLeft size={16} /> Respawn at Base Camp
          </PixelButton>
        </Link>
      </div>
    </div>
  );
}
