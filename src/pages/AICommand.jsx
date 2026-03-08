import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../lib/api"

const C = {
  bg: "#393185", surface: "#453D9A", surfaceMid: "#4F47AA",
  border: "rgba(255,255,255,0.1)", borderUp: "rgba(255,255,255,0.18)",
  accent: "#00B4D8", accentDim: "rgba(0,180,216,0.15)", accentGlow: "rgba(0,180,216,0.25)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const SUGGESTIONS = [
  "Show all delayed shipments",
  "Approve all pending cancellations",
  "Which carrier has the most delays?",
  "Flag shipments with ETA past today",
  "Generate a status summary",
  "List shipments needing attention",
]

const ACTION_COLORS = {
  status_update:   C.accent,
  approve_cancel:  C.success,
  reject_cancel:   C.error,
  flag_delay:      C.warning,
  assign_carrier:  "#A78BFA",
  send_alert:      C.warning,
  none:            C.textLow,
}

export default function AICommand() {
  const [messages, setMessages]   = useState([
    { role: "assistant", content: "Hello! I'm your LoRRI operations AI. I have full context of all shipments and cancellation requests. Ask me anything or give me a command.", action: null }
  ])
  const [input, setInput]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [context, setContext]     = useState(null)
  const bottomRef                 = useRef(null)

  useEffect(() => {
    // Load live context
    Promise.all([
      api.getShipments().catch(() => []),
      api.getCancellations().catch(() => []),
    ]).then(([shipments, cancellations]) => {
      setContext({ shipments: Array.isArray(shipments) ? shipments : shipments?.shipments || [], cancellations: Array.isArray(cancellations) ? cancellations : cancellations?.cancellations || [] })
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput("")

    const userMsg = { role: "user", content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await api.aiChat([...history, userMsg], context)

      let parsed = { message: "", action: null }
      try {
        const raw = typeof res === "string" ? res : res.reply || res.message || JSON.stringify(res)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
        else parsed.message = raw
      } catch { parsed.message = typeof res === "string" ? res : res.reply || "Done." }

      // Execute action if present
      if (parsed.action?.type && parsed.action.type !== "none") {
        await executeAction(parsed.action)
      }

      setMessages(prev => [...prev, { role: "assistant", content: parsed.message || "Done.", action: parsed.action }])
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}`, action: null }])
    }
    setLoading(false)
  }

  async function executeAction(action) {
    try {
      if (action.type === "status_update" && action.shipment_id) {
        await api.updateShipment(action.shipment_id, { status: action.status })
      } else if (action.type === "approve_cancel" && action.cancellation_id) {
        await api.approveCancellation(action.cancellation_id)
      } else if (action.type === "reject_cancel" && action.cancellation_id) {
        await api.rejectCancellation(action.cancellation_id, action.reason || "Rejected by AI")
      } else if (action.type === "assign_carrier" && action.shipment_id) {
        await api.updateShipment(action.shipment_id, { carrier_name: action.carrier })
      } else if (action.type === "flag_delay" && action.shipment_id) {
        await api.updateShipment(action.shipment_id, { status: "delayed" })
      }
    } catch (e) { console.error("Action failed:", e) }
  }

  return (
    <div style={{ padding: "28px 32px", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>AI Command Center</h1>
          <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: C.accentDim, border: `1px solid rgba(0,180,216,0.3)`, color: C.accent, fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, display: "block", animation: "pulse 1.5s infinite" }} />
            {context ? `${context.shipments.length} shipments · ${context.cancellations.length} cancellations loaded` : "Loading context..."}
          </span>
        </div>
        <p style={{ color: C.textMid, fontSize: 13 }}>Give commands in plain English — the AI has full access to live operations data</p>
      </motion.div>

      {/* Suggestions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, flexShrink: 0 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)}
            style={{ padding: "5px 13px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.textMid, fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid }}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "75%" }}>
              <div style={{
                padding: "12px 16px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? C.grad : C.surface,
                border: `1px solid ${m.role === "user" ? "transparent" : C.border}`,
                color: C.textHi, fontSize: 14, lineHeight: 1.65,
                boxShadow: m.role === "user" ? `0 4px 16px ${C.accentGlow}` : "none",
              }}>
                {m.content}
              </div>
              {m.action && m.action.type && m.action.type !== "none" && (
                <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, background: `${ACTION_COLORS[m.action.type] || C.textLow}18`, border: `1px solid ${ACTION_COLORS[m.action.type] || C.textLow}35`, color: ACTION_COLORS[m.action.type] || C.textLow, fontSize: 11, fontWeight: 700 }}>
                  Action: {m.action.type.replace(/_/g, " ").toUpperCase()}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 18px", borderRadius: "14px 14px 14px 4px", background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                ))}
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
          placeholder="Type a command or question..."
          disabled={loading}
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.textHi, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: "12px 24px", borderRadius: 12, background: input.trim() ? C.grad : "rgba(0,180,216,0.2)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", boxShadow: input.trim() ? `0 4px 16px ${C.accentGlow}` : "none", transition: "all 0.2s" }}>
          Send
        </motion.button>
      </div>
    </div>
  )
}