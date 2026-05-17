import React, { useState, useEffect, useRef } from "react";
import { Lock, Camera, Upload, Trash2, Shield, Image as ImageIcon, HeartPulse } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Journal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  
  const [activeTab, setActiveTab] = useState("skin");
  const [entries, setEntries] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  
  const fileInputRef = useRef(null);

  // Check auth on mount
  useEffect(() => {
    const token = sessionStorage.getItem("journal_token");
    if (token) {
      setIsAuthenticated(true);
      fetchEntries(token);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const r = await api.post("/journal/auth", { password });
      sessionStorage.setItem("journal_token", r.data.token);
      setIsAuthenticated(true);
      fetchEntries(r.data.token);
    } catch (err) {
      setAuthError("Access Denied. Incorrect password.");
      setLoading(false);
    }
  };

  const fetchEntries = async (token) => {
    try {
      const r = await api.get("/journal/entries", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(r.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("journal_token");
      }
      toast.error("Failed to load secure journal");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("journal_token");
    setIsAuthenticated(false);
    setEntries([]);
  };

  // Compress image before upload
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1200px
          const MAX = 1200;
          if (width > height && width > MAX) {
            height *= MAX / width;
            width = MAX;
          } else if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const base64Data = await compressImage(file);
      const token = sessionStorage.getItem("journal_token");
      
      await api.post("/journal/entries", {
        type: activeTab,
        content: base64Data,
        notes: notes.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotes("");
      toast.success("Saved to secure vault");
      fetchEntries(token);
    } catch (err) {
      toast.error("Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this record permanently?")) return;
    
    try {
      const token = sessionStorage.getItem("journal_token");
      await api.delete(`/journal/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(entries.filter(e => e.id !== id));
      toast.success("Record deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <div className="font-vt text-center mt-20" style={{color: "var(--ink-muted)"}}>Decrypting secure vault...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BlockCard title="Secure Vault" icon={<Shield size={14} color="#000"/>} accent="var(--diamond)" className="max-w-md w-full">
          <div className="text-center mb-6">
            <Lock size={48} color="var(--ink-muted)" className="mx-auto mb-4" />
            <div className="font-vt text-lg" style={{color: "var(--ink)"}}>PERSONAL REPORT ACCESS</div>
            <div className="font-pixel text-[10px] mt-2" style={{color: "var(--redstone)"}}>RESTRICTED AREA</div>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              className="pixel-input text-center font-mono" 
              placeholder="Enter Access Code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {authError && <div className="font-vt text-sm text-center" style={{color: "var(--redstone)"}}>{authError}</div>}
            <PixelButton variant="primary" type="submit" style={{justifyContent: "center"}}>DECRYPT</PixelButton>
          </form>
        </BlockCard>
      </div>
    );
  }

  const filteredEntries = entries.filter(e => e.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-pixel text-xl mb-1" style={{color: "var(--ink)"}}>Secure Journal</h1>
          <p className="font-vt text-lg" style={{color: "var(--ink-muted)"}}>Encrypted Personal Reports</p>
        </div>
        <button onClick={handleLogout} className="font-vt text-sm pixel-btn" style={{background: "var(--redstone)", color: "#fff"}}>
          <Lock size={14} /> LOCK VAULT
        </button>
      </div>

      <div className="flex gap-2 font-pixel text-[10px] uppercase">
        <button 
          onClick={() => setActiveTab("skin")}
          className={`flex items-center gap-2 px-4 py-3 border-2 border-black transition-all ${activeTab === "skin" ? "shadow-[3px_3px_0_#000]" : "opacity-70"}`}
          style={{background: activeTab === "skin" ? "var(--redstone)" : "var(--bg-1)", color: activeTab === "skin" ? "#fff" : "var(--ink)"}}
        >
          <HeartPulse size={14} /> Health Condition Tracker
        </button>
        <button 
          onClick={() => setActiveTab("photo")}
          className={`flex items-center gap-2 px-4 py-3 border-2 border-black transition-all ${activeTab === "photo" ? "shadow-[3px_3px_0_#000]" : "opacity-70"}`}
          style={{background: activeTab === "photo" ? "var(--diamond)" : "var(--bg-1)", color: activeTab === "photo" ? "#fff" : "var(--ink)"}}
        >
          <ImageIcon size={14} /> Daily Photos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BlockCard title="Add New Record" accent="var(--grass)">
            <textarea
              className="pixel-input w-full min-h-[100px] mb-4"
              placeholder="Add optional notes for this entry..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div className="flex flex-col gap-2">
              <PixelButton variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{justifyContent: "center"}}>
                <Camera size={16} /> {uploading ? "ENCRYPTING..." : "TAKE PHOTO"}
              </PixelButton>
              <div className="font-vt text-sm text-center mt-2" style={{color: "var(--ink-muted)"}}>
                Photos are stored securely and compressed automatically.
              </div>
            </div>
          </BlockCard>
        </div>
        
        <div className="lg:col-span-2">
          <BlockCard title={activeTab === "skin" ? "Skin Condition Logs" : "Daily Photo Logs"} accent={activeTab === "skin" ? "var(--redstone)" : "var(--diamond)"}>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-10 font-vt text-lg" style={{color: "var(--ink-muted)"}}>
                No records found. The vault is empty.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="block-card p-2" style={{border: "2px solid #000", background: "var(--bg-1)", position: "relative"}}>
                    <button 
                      onClick={() => deleteEntry(entry.id)}
                      className="absolute top-2 right-2 p-1"
                      style={{background: "var(--bg-1)", border: "2px solid #000", zIndex: 10}}
                      title="Delete"
                    >
                      <Trash2 size={14} color="var(--redstone)" />
                    </button>
                    <img 
                      src={entry.content} 
                      alt="Journal Entry" 
                      className="w-full h-48 object-cover border-2 border-black mb-2" 
                    />
                    <div className="font-pixel text-[9px]" style={{color: "var(--ink-dim)"}}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                    {entry.notes && (
                      <div className="font-vt text-sm mt-1" style={{color: "var(--ink)"}}>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </BlockCard>
        </div>
      </div>
    </div>
  );
}
