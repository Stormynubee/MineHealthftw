import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import PixelButton from "./PixelButton";
import { toast } from "sonner";

// Captures the beforeinstallprompt event and shows a pixel-styled install banner.
export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("pwa_dismissed") === "1");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBefore = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      toast.success("Life Blocks installed! Launch it from your home screen.");
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent || dismissed || installed) return null;

  const install = async () => {
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem("pwa_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 16, left: 16, right: 16, maxWidth: 440, margin: "0 auto",
        background: "var(--bg-2)", border: "2px solid #000", boxShadow: "6px 6px 0 #000",
        padding: 14, zIndex: 9999,
      }}
      data-testid="pwa-install-banner"
    >
      <div className="flex items-start gap-3">
        <div style={{background: "var(--grass)", width: 36, height: 36, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center"}}>
          <Download size={18} color="#000"/>
        </div>
        <div className="flex-1">
          <div className="font-pixel text-[11px] mb-1">INSTALL LIFE BLOCKS</div>
          <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>
            Tap install to add the app to your home screen. Works offline, full-screen, feels native.
          </div>
        </div>
        <button onClick={dismiss} style={{color: "var(--ink-muted)"}} data-testid="pwa-dismiss"><X size={16}/></button>
      </div>
      <div className="flex gap-2 mt-3">
        <PixelButton variant="primary" onClick={install} data-testid="pwa-install"><Download size={14}/>Install</PixelButton>
        <PixelButton onClick={dismiss} data-testid="pwa-later">Later</PixelButton>
      </div>
    </div>
  );
}
