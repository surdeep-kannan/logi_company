import { useRef, useState, useEffect } from "react"
import { useChatContext } from "./DashboardLayout"

const C = {
  surface: "#453D9A", border: "rgba(255,255,255,0.1)", accent: "#00B4D8",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const QUICK = [
  "approve all cancellations",
  "status summary",
  "list delayed shipments",
  "which carrier has most delays?",
]

function getCommands(ctx) {
  const base = [
    { cmd: "approve all cancellations",      desc: "Bulk approve all pending cancellations" },
    { cmd: "status summary",                  desc: "AI-generated overview of all shipments" },
    { cmd: "list delayed shipments",          desc: "Show all delayed shipments" },
    { cmd: "list pending shipments",          desc: "Show all pending shipments" },
    { cmd: "list in transit shipments",       desc: "Show all in-transit shipments" },
    { cmd: "list all shipments",              desc: "Show every shipment" },
    { cmd: "which carrier has most delays?",  desc: "AI carrier performance analysis" },
    { cmd: "generate a report",               desc: "Full operations report" },
  ]
  const ships = (ctx?.shipments || []).flatMap(s => [
    { cmd: s.tracking_number + " move to next stage", desc: s.tracking_number + " — " + (s.status || "").toUpperCase() + " → advance" },
    { cmd: s.tracking_number + " mark delivered",     desc: s.tracking_number + " — mark as delivered" },
    { cmd: s.tracking_number + " mark in transit",    desc: s.tracking_number + " — dispatch now" },
    { cmd: s.tracking_number + " flag as delayed",    desc: s.tracking_number + " — flag delay" },
    { cmd: s.tracking_number + " cancel",             desc: s.tracking_number + " — cancel shipment" },
  ])
  const cans = (ctx?.cancellations || []).filter(c => c.status === "pending").flatMap(c => [
    { cmd: "approve " + c.tracking_number + " cancellation", desc: "Approve — " + (c.customer || "") },
    { cmd: "reject "  + c.tracking_number + " cancellation", desc: "Reject — "  + (c.customer || "") },
  ])
  return [...base, ...ships, ...cans]
}

function highlight(text, query) {
  if (!query.trim()) return text
  const escaped = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
  const parts = text.split(new RegExp("(" + escaped + ")", "gi"))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: "transparent", color: "#00B4D8", fontWeight: 700 }}>{p}</mark>
      : p
  )
}

function CommandInput({ context, input, setInput, send, loading }) {
  const [suggestions, setSuggestions] = useState([])
  const [idx, setIdx] = useState(-1)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); setIdx(-1); return }
    const q = input.toLowerCase()
    const scored = getCommands(context)
      .map(c => {
        const cl = c.cmd.toLowerCase()
        const dl = c.desc.toLowerCase()
        let score = 0
        if (cl.startsWith(q)) score = 100
        else if (cl.includes(q)) score = 80
        else if (q.split(" ").every(w => cl.includes(w) || dl.includes(w))) score = 60
        else if (q.split(" ").some(w => w.length > 2 && (cl.includes(w) || dl.includes(w)))) score = 40
        return { ...c, score }
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
    setSuggestions(scored)
    setIdx(-1)
  }, [input, context])

  function pick(cmd) {
    setInput(cmd)
    setSuggestions([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKey(e) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === "Tab") { e.preventDefault(); pick(suggestions[idx >= 0 ? idx : 0].cmd); return }
      if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(suggestions[idx].cmd); return }
      if (e.key === "Escape") { setSuggestions([]); setIdx(-1); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { send(); setSuggestions([]) }
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {suggestions.length > 0 && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: "#1E1A55", border: "1px solid rgba(0,180,216,0.35)", borderRadius: 14, overflow: "hidden", boxShadow: "0 -12px 40px rgba(0,0,0,0.5)", zIndex: 20 }}>
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => pick(s.cmd)}
              style={{ padding: "10px 16px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: i === idx ? "rgba(0,180,216,0.13)" : "transparent", transition: "background 0.1s" }}
              onMouseEnter={() => setIdx(i)}
              onMouseLeave={() => setIdx(-1)}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", fontFamily: "monospace" }}>{highlight(s.cmd, input)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
          <div style={{ padding: "5px 16px", background: "rgba(0,0,0,0.25)", display: "flex", gap: 14 }}>
            {["↑↓ navigate", "Tab to select", "Enter to run", "Esc to close"].map(t => (
              <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a command — 'update', 'approve', 'SHP-...'"
          disabled={loading} autoComplete="off"
          style={{ flex: 1, padding: "13px 18px", borderRadius: 13, background: "#2D2566", border: "1px solid " + (suggestions.length > 0 ? "rgba(0,180,216,0.45)" : "rgba(255,255,255,0.1)"), color: "rgba(255,255,255,0.95)", fontSize: 14, outline: "none" }}
          onFocus={e => e.target.style.borderColor = "rgba(0,180,216,0.45)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        <button onMouseDown={() => { send(); setSuggestions([]) }} disabled={loading || !input.trim()}
          style={{ padding: "13px 28px", borderRadius: 13, background: input.trim() ? "linear-gradient(135deg,#0077B6,#00B4D8)" : "rgba(0,180,216,0.18)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: input.trim() ? "pointer" : "default" }}>
          Send
        </button>
      </div>
    </div>
  )
}

export default function AICommand() {
  const { messages, input, setInput, loading, send, context } = useChatContext()
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  return (
    <div style={{ padding: "28px 32px", height: "100vh", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>◈ AI Command Center</h1>
          <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: C.accent, fontSize: 11, fontWeight: 700 }}>
            {context ? context.shipments.length + " shipments · " + context.cancellations.length + " cancellations" : "Loading..."}
          </span>
        </div>
        <p style={{ color: C.textMid, fontSize: 13, margin: 0 }}>Direct commands execute instantly. Questions go to AI.</p>
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, flexShrink: 0 }}>
        {QUICK.map(s => (
          <button key={s} onClick={() => setInput(s)}
            style={{ padding: "5px 13px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid " + C.border, color: C.textMid, fontSize: 12, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid }}>
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "72%", padding: "11px 16px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? C.grad : C.surface,
              border: m.role === "user" ? "none" : "1px solid " + (m.color ? m.color + "30" : C.border),
              color: m.role === "user" ? "#fff" : (m.color || C.textHi),
              fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "11px 16px", borderRadius: "16px 16px 16px 4px", background: C.surface, border: "1px solid " + C.border }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: "pulse 1.2s " + (j*0.2) + "s infinite" }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <CommandInput context={context} input={input} setInput={setInput} send={send} loading={loading} />
    </div>
  )
}