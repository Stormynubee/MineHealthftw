import React, { useEffect, useRef, useState } from "react";
import { MessageSquareText, Send, Sparkles, Wifi, WifiOff } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import MarkdownText from "../components/MarkdownText";
import { api } from "../lib/api";
import { toast } from "sonner";

const ALL_PROMPTS = [
  "Explain Bohr's model in 5 lines, then a 1-line memory hook.",
  "Give me today's no-sugar-no-oil meal plan.",
  "Suggest a new Huberman morning technique I haven't tried.",
  "I ate 1 samosa and 2 rotis with little oil. How bad is it for health condition?",
  "Give me 3 JEE maths tricks for quadratic equations.",
  "Draft a LinkedIn caption for my latest video edit.",
  "Why does my ESP32 keep rebooting on WiFi connect?",
  "Tell me a 2-minute stoic meditation quote.",
  "Give me a hardcore study challenge for the next 2 hours.",
  "How do I optimize my Next.js bundle size?",
  "Explain the difference between a mutex and a semaphore.",
  "What's a good stretch for neck pain from coding?",
  "I'm feeling burnt out. Blocky, give me a pep talk.",
  "Give me a 5-minute Wim Hof breathing guide.",
];

// Rotate 6 prompts based on day of week
const PRESET_PROMPTS = [...ALL_PROMPTS].sort((a, b) => 
  ((ALL_PROMPTS.indexOf(a) + new Date().getDay() * 3) % ALL_PROMPTS.length) - 
  ((ALL_PROMPTS.indexOf(b) + new Date().getDay() * 3) % ALL_PROMPTS.length)
).slice(0, 6);

// Health status indicator colors
const STATUS_COLORS = {
  loading: "var(--gold)",      // amber while checking
  healthy: "var(--grass)",     // green when all services up
  degraded: "var(--gold)",     // amber when AI down but DB up
  down: "var(--redstone)",     // red when critical services down
};

export default function Buddy() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ state: "loading", detail: "Checking..." });
  const scrollRef = useRef(null);

  // FIX (Bug #12): Wrapped in try/catch — previously unguarded, causing
  // silent component crash on Vercel cold starts when API is unreachable.
  const load = async () => {
    try {
      const r = await api.get("/ai/history", { timeout: 10000 });
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.warn("Failed to load chat history:", e.message);
      toast.error("Couldn't load chat history. Backend might be starting up.");
      // Show empty state gracefully instead of crashing
      setMessages([]);
    }
  };

  // R2: Health status indicator — fetch on mount
  const checkHealth = async () => {
    try {
      const r = await api.get("/health", { timeout: 8000 });
      const d = r.data;
      if (d.gemini_ping && d.mongo_ping) {
        setApiStatus({ state: "healthy", detail: `v${d.version} — All systems go` });
      } else if (d.mongo_ping && !d.gemini_ping) {
        setApiStatus({ state: "degraded", detail: `AI offline: ${d.gemini_error || "Key missing"}` });
      } else {
        setApiStatus({ state: "down", detail: `DB: ${d.mongo_error || "disconnected"}` });
      }
    } catch {
      setApiStatus({ state: "down", detail: "API unreachable" });
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); checkHealth(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setLoading(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg, id: `tmp-${Date.now()}`, created_at: new Date().toISOString() }]);
    try {
      // R1: 30s timeout prevents infinite "mining thoughts" on Vercel cold starts
      const r = await api.post("/ai/chat", { text: msg }, { timeout: 30000 });
      // CRITICAL FIX (Bug #10): The backend's "Transparent 200" error pattern
      // returns 200 OK with {error: true, message: "...", traceback: "..."}
      // when AI fails (to bypass Vercel's 500 error page override).
      // Previously, r.data.reply was undefined on error, creating a blank bubble.
      if (r.data.error) {
        const errMsg = r.data.message || "Unknown AI error";
        toast.error(`Blocky Error: ${errMsg}`);
        setMessages((m) => [...m, {
          role: "assistant",
          content: `⚠️ Blocky ran into an issue: ${errMsg}\n\nTry again in a moment, or check /api/health for diagnostics.`,
          id: `err-${Date.now()}`,
          created_at: new Date().toISOString(),
        }]);
      } else {
        setMessages((m) => [...m, {
          role: "assistant",
          content: r.data.reply,
          id: `ai-${Date.now()}`,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      const errMsg = e.code === "ECONNABORTED"
        ? "Request timed out (30s). Vercel might be cold-starting. Try again!"
        : (e.response?.data?.detail || e.message);
      toast.error(`Blocky Error: ${errMsg}`);
      setMessages((m) => [...m, {
        role: "assistant",
        content: `⚠️ Network issue: ${errMsg}\n\nThis usually resolves on retry. Hit Send again!`,
        id: `net-err-${Date.now()}`,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = STATUS_COLORS[apiStatus.state] || STATUS_COLORS.loading;
  const StatusIcon = apiStatus.state === "down" ? WifiOff : Wifi;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8">
        <BlockCard title="Blocky — Your Life Buddy" icon={<MessageSquareText size={12} color="#000"/>} accent="var(--grass)" testId="buddy-card">
          {/* R2: API health status indicator */}
          <div className="flex items-center gap-2 mb-2 px-1" data-testid="api-status">
            <StatusIcon size={12} style={{ color: statusColor }} />
            <span className="font-vt text-[10px]" style={{ color: statusColor }}>
              {apiStatus.detail}
            </span>
          </div>
          <div ref={scrollRef} className="space-y-3 max-h-[520px] min-h-[360px] overflow-y-auto p-2" style={{background: "var(--bg-0)", border: "2px solid #000"}} data-testid="chat-log">
            {messages.length === 0 && (
              <div className="npc-box">
                <span style={{color: "var(--grass)"}}>[Blocky]</span> Yo! I'm Blocky. Ask me anything — JEE doubts, health condition meal checks, new habits, career questions. I've got you, legend.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id || m.created_at} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={m.role === "user" ? "p-3 max-w-[80%]" : "npc-box max-w-[85%]"}
                  style={m.role === "user" ? {background: "var(--bg-3)", border: "2px solid #000", boxShadow: "3px 3px 0 #000"} : {}}>
                  <div className="font-pixel text-[10px] mb-1" style={{color: m.role === "user" ? "var(--diamond)" : "var(--grass)"}}>
                    {m.role === "user" ? "YOU" : "BLOCKY"}
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-sm"><MarkdownText>{m.content}</MarkdownText></div>
                </div>
              </div>
            ))}
            {loading && <div className="npc-box">Blocky is mining thoughts... ▮▯▮</div>}
          </div>
          <div className="flex gap-2 mt-3">
            <input className="pixel-input" placeholder="Ask Blocky anything..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={loading} data-testid="chat-input"/>
            <PixelButton variant="primary" onClick={() => send()} disabled={loading} data-testid="chat-send">
              <Send size={14}/>Send
            </PixelButton>
          </div>
        </BlockCard>
      </div>
      <div className="lg:col-span-4">
        <BlockCard title="Quick Asks" icon={<Sparkles size={12} color="#000"/>} accent="var(--gold)" testId="quick-asks">
          <div className="space-y-2">
            {PRESET_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)} disabled={loading}
                className="w-full text-left p-2 font-vt text-base"
                style={{background: "var(--bg-1)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", cursor: loading ? "not-allowed" : "pointer"}}
                data-testid={`quick-ask-${i}`}>
                {p}
              </button>
            ))}
          </div>
        </BlockCard>
      </div>
    </div>
  );
}
