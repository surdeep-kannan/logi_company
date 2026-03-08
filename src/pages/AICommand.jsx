import { useRef, useState, useEffect } from "react"
import { useChatContext } from "./DashboardLayout"

const C = {
  surface: "#453D9A", dark: "#2D2566", darker: "#1E1A55",
  border: "rgba(255,255,255,0.1)", accent: "#00B4D8",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const SHIPMENT_ACTIONS = [
  { label: "Move to next stage",  template: "{id} move to next stage",  desc: "Advance status automatically",    icon: "→" },
  { label: "Mark In Transit",     template: "{id} mark in transit",      desc: "Dispatch this shipment",          icon: "🚚" },
  { label: "Mark Delivered",      template: "{id} mark delivered",       desc: "Complete this shipment",          icon: "✓" },
  { label: "Flag as Delayed",     template: "{id} flag as delayed",      desc: "Mark shipment as delayed",        icon: "⚠" },
  { label: "Cancel Shipment",     template: "{id} cancel",               desc: "Cancel this shipment",            icon: "✕" },
  { label: "Reset to Pending",    template: "{id} reset to pending",     desc: "Send back to pending",            icon: "↺" },
]

const CANCEL_ACTIONS = [
  { label: "Approve Cancellation", template: "approve {id} cancellation", desc: "Accept the cancellation request", icon: "✓" },
  { label: "Reject Cancellation",  template: "reject {id} cancellation",  desc: "Deny the cancellation request",  icon: "✕" },
]

const GENERAL_CMDS = [
  { cmd: "approve all cancellations",     desc: "Bulk approve all pending",           icon: "✓✓" },
  { cmd: "status summary",                desc: "AI overview of all shipments",        icon: "📊" },
  { cmd: "list delayed shipments",        desc: "Show all delayed",                    icon: "⚠" },
  { cmd: "list pending shipments",        desc: "Show all pending",                    icon: "⏳" },
  { cmd: "list in transit shipments",     desc: "Show all in transit",                 icon: "🚚" },
  { cmd: "which carrier has most delays?",desc: "AI carrier analysis",                 icon: "?" },
  { cmd: "generate a report",             desc: "Full operations report",              icon: "📋" },
]

// ── Step detection ────────────────────────────────────────
function detectStep(input, context) {
  const txt = input.trim()
  const lo  = txt.toLowerCase()

  if (!txt) return { step: "idle" }

  // Step 2 — user has picked a shipment, now show actions
  const ship = context?.shipments?.find(s =>
    s.tracking_number && lo.startsWith(s.tracking_number.toLowerCase())
  )
  if (ship) {
    const afterId = txt.slice(ship.tracking_number.length).trim()
    if (!afterId) return { step: "action", item: ship, type: "shipment" }
  }

  // Step 2 — user has picked a cancellation
  const can = context?.cancellations?.find(c =>
    c.tracking_number && lo.startsWith(c.tracking_number.toLowerCase())
  )
  if (can) {
    const afterId = txt.slice(can.tracking_number.length).trim()
    if (!afterId) return { step: "action", item: can, type: "cancellation" }
  }

  // Step 1 — searching for a shipment ID
  if (lo.match(/^sh/)) return { step: "shipment_search", query: lo }

  // General command search
  return { step: "general_search", query: lo }
}

function getSuggestions(input, context) {
  const txt = input.trim()
  const lo  = txt.toLowerCase()
  const state = detectStep(txt, context)

  if (state.step === "idle") return []

  if (state.step === "action" && state.type === "shipment") {
    return SHIPMENT_ACTIONS.map(a => ({
      label:    a.label,
      sublabel: a.desc,
      icon:     a.icon,
      fill:     a.template.replace("{id}", state.item.tracking_number),
      badge:    state.item.status,
    }))
  }

  if (state.step === "action" && state.type === "cancellation") {
    return CANCEL_ACTIONS.map(a => ({
      label:    a.label,
      sublabel: a.desc,
      icon:     a.icon,
      fill:     a.template.replace("{id}", state.item.tracking_number),
      badge:    state.item.status,
    }))
  }

  if (state.step === "shipment_search") {
    const ships = (context?.shipments || [])
      .filter(s => s.tracking_number?.toLowerCase().includes(lo) || lo.length < 4)
      .slice(0, 6)
      .map(s => ({
        label:    s.tracking_number,
        sublabel: (s.origin_city || "?") + " → " + (s.dest_city || "?") + "  ·  " + (s.customer || ""),
        icon:     s.status === "in_transit" ? "🚚" : s.status === "delivered" ? "✓" : s.status === "delayed" ? "⚠" : "○",
        fill:     s.tracking_number + " ",
        badge:    s.status,
      }))

    const cans = (context?.cancellations || [])
      .filter(c => c.tracking_number?.toLowerCase().includes(lo))
      .slice(0, 3)
      .map(c => ({
        label:    c.tracking_number,
        sublabel: "Cancellation request · " + (c.customer || ""),
        icon:     "✕",
        fill:     c.tracking_number + " ",
        badge:    "cancel_req",
      }))

    return [...ships, ...cans]
  }

  // General search
  return GENERAL_CMDS
    .filter(c => c.cmd.includes(lo) || c.desc.toLowerCase().includes(lo) ||
      lo.split(" ").some(w => w.length > 1 && (c.cmd.includes(w) || c.desc.toLowerCase().includes(w))))
    .slice(0, 6)
    .map(c => ({ label: c.cmd, sublabel: c.desc, icon: c.icon, fill: c.cmd }))
}

const STATUS_COLORS = {
  in_transit: "#00B4D8", delivered: "#22C55E", delayed: "#F97316",
  cancelled: "#EF4444", pending: "#F59E0B", cancel_req: "#A855F7",
}

function Badge({ status }) {
  if (!status) return null
  return (
    <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: (STATUS_COLORS[status] || "#888") + "22", color: STATUS_COLORS[status] || "#888", border: "1px solid " + (STATUS_COLORS[status] || "#888") + "44" }}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  )
}

function CommandInput({ context, input, setInput, send, loading }) {
  const [idx, setIdx]   = useState(-1)
  const inputRef        = useRef(null)
  const suggestions     = getSuggestions(input, context)
  const state           = detectStep(input.trim(), context)

  useEffect(() => setIdx(-1), [input])

  function pick(s) {
    setInput(s.fill)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKey(e) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === "Tab")       { e.preventDefault(); pick(suggestions[idx >= 0 ? idx : 0]); return }
      if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(suggestions[idx]); return }
      if (e.key === "Escape")    { setInput(""); return }
    }
    if (e.key === "Enter" && !e.shiftKey) send()
  }

  const stepLabel = {
    idle:            null,
    shipment_search: "↓ Select a shipment",
    action:          "↓ Choose action for " + (state.item?.tracking_number || ""),
    general_search:  "↓ Matching commands",
  }[state.step]

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {suggestions.length > 0 && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: C.darker, border: "1px solid rgba(0,180,216,0.35)", borderRadius: 14, overflow: "hidden", boxShadow: "0 -12px 48px rgba(0,0,0,0.6)", zIndex: 20 }}>
          {stepLabel && (
            <div style={{ padding: "7px 14px", background: "rgba(0,180,216,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: C.accent, fontWeight: 600, letterSpacing: "0.05em" }}>
              {stepLabel}
            </div>
          )}
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => pick(s)}
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i === idx ? "rgba(0,180,216,0.12)" : "transparent", transition: "background 0.1s" }}
              onMouseEnter={() => setIdx(i)} onMouseLeave={() => setIdx(-1)}>
              <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: "center" }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.textHi, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  {s.label}
                  {s.badge && <Badge status={s.badge} />}
                </div>
                <div style={{ fontSize: 11, color: C.textLow, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sublabel}</div>
              </div>
              {i === idx && <span style={{ fontSize: 11, color: C.accent, flexShrink: 0 }}>Tab ↵</span>}
            </div>
          ))}
          <div style={{ padding: "5px 14px", background: "rgba(0,0,0,0.2)", display: "flex", gap: 14 }}>
            {["↑↓ navigate", "Tab select", "Enter run", "Esc clear"].map(t => (
              <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Type 'sh' for shipments, 'approve', 'status'..."
          disabled={loading} autoComplete="off"
          style={{ flex: 1, padding: "13px 18px", borderRadius: 13, background: C.dark, border: "1px solid " + (suggestions.length > 0 ? "rgba(0,180,216,0.45)" : C.border), color: C.textHi, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "rgba(0,180,216,0.45)"}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button onMouseDown={send} disabled={loading || !input.trim()}
          style={{ padding: "13px 28px", borderRadius: 13, background: input.trim() ? C.grad : "rgba(0,180,216,0.18)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: input.trim() ? "pointer" : "default" }}>
          Send
        </button>
      </div>
    </div>
  )
}

const QUICK = ["approve all cancellations", "status summary", "list delayed shipments"]

export default function AICommand() {
  const { messages, input, setInput, loading, send, context } = useChatContext()
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  return (
    <div style={{ padding: "28px 32px", height: "100vh", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>◈ AI Command Center</h1>
          <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: C.accent, fontSize: 11, fontWeight: 700 }}>
            {context ? context.shipments.length + " shipments · " + context.cancellations.length + " cancellations" : "Loading..."}
          </span>
        </div>
        <p style={{ color: C.textMid, fontSize: 13, margin: 0 }}>Type <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>sh</code> to find a shipment, then pick an action. Direct commands run instantly.</p>
      </div>

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

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", padding: "11px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.grad : C.surface, border: m.role === "user" ? "none" : "1px solid " + (m.color ? m.color + "30" : C.border), color: m.role === "user" ? "#fff" : (m.color || C.textHi), fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "11px 16px", borderRadius: "16px 16px 16px 4px", background: C.surface, border: "1px solid " + C.border }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: "pulse 1.2s " + (j * 0.2) + "s infinite" }} />)}
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