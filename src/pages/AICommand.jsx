import { useRef } from "react"
import { useChatContext } from "./DashboardLayout"

const C = {
  bg: "#393185", surface: "#453D9A",
  border: "rgba(255,255,255,0.1)", accent: "#00B4D8",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const SUGGESTIONS = [
  "approve all cancellations",
  "status summary",
  "list delayed shipments",
  "which carrier has most delays?",
  "flag all pending as in transit",
]

export default function AICommand() {
  const { messages, input, setInput, loading, send, context } = useChatContext()
  const bottomRef = useRef(null)

  return (
    <div style={{ padding: "28px 32px", height: "calc(100vh - 0px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>AI Command Center</h1>
          <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: C.accent, fontSize: 11, fontWeight: 700 }}>
            {context ? `${context.shipments.length} shipments · ${context.cancellations.length} cancellations` : "Loading..."}
          </span>
        </div>
        <p style={{ color: C.textMid, fontSize: 13 }}>Direct commands execute instantly. Questions go to AI.</p>
      </div>

      {/* Quick suggestions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, flexShrink: 0 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => setInput(s)}
            style={{ padding: "5px 13px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.textMid, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
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
              border: m.role === "user" ? "none" : `1px solid ${m.color ? m.color + "30" : C.border}`,
              color: m.role === "user" ? "#fff" : (m.color || C.textHi),
              fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "11px 16px", borderRadius: "16px 16px 16px 4px", background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ${j*0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="SHP-XXXX next stage  ·  approve all cancellations  ·  status summary..."
          disabled={loading}
          style={{ flex: 1, padding: "13px 18px", borderRadius: 13, background: C.surface, border: `1px solid ${C.border}`, color: C.textHi, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "13px 28px", borderRadius: 13, background: input.trim() ? C.grad : "rgba(0,180,216,0.2)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: input.trim() ? "pointer" : "default", transition: "all 0.2s" }}>
          Send
        </button>
      </div>
    </div>
  )
}