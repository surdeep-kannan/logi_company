import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { api } from "../lib/api"
import lorriLogo from "../assets/lorri.png"

const C = {
  bg: "#393185", surface: "#453D9A", surfaceMid: "#4F47AA",
  border: "rgba(255,255,255,0.1)", accent: "#00B4D8", accentDim: "rgba(0,180,216,0.15)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

export const ChatContext = createContext(null)

const NAV = [
  { path: "/dashboard",               label: "Dashboard",     icon: "▦" },
  { path: "/dashboard/shipments",     label: "Shipments",     icon: "⬡" },
  { path: "/dashboard/cancellations", label: "Cancellations", icon: "✕" },
  { path: "/dashboard/ai",            label: "AI Command",    icon: "◈" },
]

function parseCommand(input, context) {
  const txt = input.toLowerCase().trim()
  const findShipment     = (q) => context?.shipments?.find(s => s.tracking_number?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q))
  const findCancellation = (q) => context?.cancellations?.find(c => c.tracking_number?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q))
  const shipMatch = txt.match(/shp-[\d-]+/i)
  const shipId    = shipMatch?.[0]?.toUpperCase()

  if (shipId) {
    const s = findShipment(shipId.toLowerCase())
    if (!s) return { type: "error", message: "Shipment " + shipId + " not found in loaded data." }
    const nextStatus = { pending: "in_transit", in_transit: "delivered" }
    if (txt.includes("next stage") || txt.includes("next step") || txt.includes("move forward") || txt.includes("advance")) {
      const next = nextStatus[s.status]
      if (!next) return { type: "error", message: shipId + " is already " + s.status + " — cannot advance further." }
      return { type: "status_update", shipment: s, status: next, message: "Moving " + shipId + " from " + s.status + " → " + next }
    }
    if (txt.includes("in_transit") || txt.includes("in transit") || txt.includes("dispatch")) return { type: "status_update", shipment: s, status: "in_transit", message: "Marking " + shipId + " as In Transit" }
    if (txt.includes("deliver") || txt.includes("complete") || txt.includes("done"))          return { type: "status_update", shipment: s, status: "delivered",  message: "Marking " + shipId + " as Delivered" }
    if (txt.includes("delay") || txt.includes("flag"))                                         return { type: "status_update", shipment: s, status: "delayed",    message: "Flagging " + shipId + " as Delayed" }
    if (txt.includes("cancel"))                                                                 return { type: "status_update", shipment: s, status: "cancelled",  message: "Cancelling " + shipId }
    if (txt.includes("pending") || txt.includes("reset"))                                      return { type: "status_update", shipment: s, status: "pending",    message: "Resetting " + shipId + " to Pending" }
    if (txt.includes("approve")) { const c = findCancellation(shipId.toLowerCase()); if (c) return { type: "approve_cancel", cancellation: c, message: "Approving cancellation for " + shipId } }
    if (txt.includes("reject"))  { const c = findCancellation(shipId.toLowerCase()); if (c) return { type: "reject_cancel",  cancellation: c, message: "Rejecting cancellation for " + shipId } }
  }

  if ((txt.includes("approve") || txt.includes("confirm")) && txt.includes("all") && txt.includes("cancel")) {
    const pending = context?.cancellations?.filter(c => c.status === "pending") || []
    if (pending.length === 0) return { type: "info", message: "No pending cancellation requests found." }
    return { type: "approve_all_cancellations", items: pending, message: "Approving " + pending.length + " pending cancellation(s)" }
  }

  if (txt.includes("summary") || txt.includes("overview") || txt.includes("report") || txt.includes("how many") || txt.includes("which") || txt.includes("list") || txt.includes("show"))
    return { type: "ai", message: input }

  if (txt.match(/^(hi|hello|hey|sup|yo)[\s!?]*$/))
    return { type: "info", message: "Hey! Type a command like:\n• SHP-XXXX move to next stage\n• SHP-XXXX mark delivered\n• approve all cancellations\n• status summary" }

  return { type: "ai", message: input }
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = (() => { try { return JSON.parse(localStorage.getItem("company_user") || "{}") } catch { return {} } })()

  // ── Global data cache — loaded once, refreshed after mutations ──
  const [shipmentData,     setShipmentData]     = useState(null)  // null = loading, [] = empty
  const [cancellationData, setCancellationData] = useState(null)
  const [stats,            setStats]            = useState(null)
  const [dataLoading,      setDataLoading]      = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [ships, cans, st] = await Promise.all([
        api.getShipments().catch(() => []),
        api.getCancellations().catch(() => []),
        api.getStats().catch(() => null),
      ])
      const s = Array.isArray(ships) ? ships : ships?.shipments || []
      const c = Array.isArray(cans)  ? cans  : cans?.cancellations || []
      setShipmentData(s)
      setCancellationData(c)
      setStats(st)
    } finally {
      setDataLoading(false)
    }
  }, [])

  // Load once on mount
  useEffect(() => { fetchData() }, [])

  // Auto-refresh every 60s to catch external updates
  useEffect(() => {
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Build context object for AI/commands
  const context = shipmentData && cancellationData ? {
    shipments: shipmentData.map(x => ({
      uuid: x.id, id: x.tracking_number || x.id, tracking_number: x.tracking_number,
      status: x.status, origin_city: x.origin_city, dest_city: x.dest_city,
      customer: x.profiles?.full_name || x.profiles?.email || "Unknown",
      carrier: x.carrier, eta: x.eta,
    })),
    cancellations: cancellationData.map(x => ({
      id: x.id, tracking_number: x.tracking_number, status: x.status,
      reason: x.reason, customer: x.profiles?.full_name || x.profiles?.email || "Unknown",
      shipment_id: x.shipment_id,
    }))
  } : null

  // ── Chat state ────────────────────────────────────────
  const INIT = [{ role: "assistant", content: "Hey! I'm your LoRRI OPS assistant.\n\nType 'sh' to find a shipment, then pick an action.\nDirect commands execute instantly. Questions go to AI.", color: C.accent }]
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState(INIT)
  const [input,    setInput]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, open])

  function addMsg(role, content, color) { setMessages(prev => [...prev, { role, content, color }]) }

  async function send() {
    const txt = input.trim()
    if (!txt || loading) return
    setInput("")
    addMsg("user", txt)
    setLoading(true)
    try {
      const cmd = parseCommand(txt, context)
      if (cmd.type === "status_update") {
        addMsg("assistant", "⏳ " + cmd.message + "...", C.warning)
        await api.updateShipment(cmd.shipment.uuid, { status: cmd.status })
        setMessages(prev => { const m = [...prev]; m[m.length-1] = { role: "assistant", content: "✓ " + cmd.message + " — Done!", color: C.success }; return m })
        await fetchData()
      } else if (cmd.type === "approve_cancel") {
        addMsg("assistant", "⏳ " + cmd.message + "...", C.warning)
        await api.approveCancellation(cmd.cancellation.id)
        setMessages(prev => { const m = [...prev]; m[m.length-1] = { role: "assistant", content: "✓ Cancellation for " + cmd.cancellation.tracking_number + " approved!", color: C.success }; return m })
        await fetchData()
      } else if (cmd.type === "reject_cancel") {
        addMsg("assistant", "⏳ " + cmd.message + "...", C.warning)
        await api.rejectCancellation(cmd.cancellation.id, "Rejected by ops")
        setMessages(prev => { const m = [...prev]; m[m.length-1] = { role: "assistant", content: "✓ Cancellation for " + cmd.cancellation.tracking_number + " rejected.", color: C.error }; return m })
        await fetchData()
      } else if (cmd.type === "approve_all_cancellations") {
        addMsg("assistant", "⏳ Approving " + cmd.items.length + " cancellation(s)...", C.warning)
        await Promise.all(cmd.items.map(c => api.approveCancellation(c.id)))
        setMessages(prev => { const m = [...prev]; m[m.length-1] = { role: "assistant", content: "✓ Approved " + cmd.items.length + " cancellation(s) successfully!", color: C.success }; return m })
        await fetchData()
      } else if (cmd.type === "info" || cmd.type === "error") {
        addMsg("assistant", cmd.message, cmd.type === "error" ? C.error : C.textMid)
      } else {
        addMsg("assistant", "🤔 Thinking...", C.textMid)
        const res = await api.aiChat([{ role: "user", content: txt }], context)
        const reply = res.reply || res.message || (typeof res === "string" ? res : "No response.")
        setMessages(prev => { const m = [...prev]; m[m.length-1] = { role: "assistant", content: reply }; return m })
      }
    } catch (e) {
      addMsg("assistant", "✗ Error: " + e.message, C.error)
    }
    setLoading(false)
  }

  function logout() {
    localStorage.removeItem("company_token")
    localStorage.removeItem("company_user")
    setMessages(INIT)
    navigate("/")
  }

  return (
    <ChatContext.Provider value={{
      // chat
      messages, setMessages, input, setInput, loading, send, context, open, setOpen, bottomRef, INIT,
      // global data cache — pages consume this instead of fetching themselves
      shipmentData, cancellationData, stats, dataLoading, refreshData: fetchData,
    }}>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>

        {/* Sidebar */}
        <div style={{ width: 220, background: C.surface, borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid " + C.border }}>
            <img src={lorriLogo} alt="LoRRI" style={{ height: 36, objectFit: "contain", display: "block" }} />
            <div style={{ color: C.textLow, fontSize: 11, marginTop: 6 }}>Operations Portal</div>
          </div>
          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path
              return (
                <button key={n.path} onClick={() => navigate(n.path)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: active ? C.accentDim : "transparent", border: active ? "1px solid rgba(0,180,216,0.25)" : "1px solid transparent", color: active ? C.accent : C.textMid, fontSize: 13, fontWeight: active ? 700 : 500, textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}>
                  <span style={{ fontSize: 14, opacity: 0.8 }}>{n.icon}</span>
                  {n.label}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: "14px 16px", borderTop: "1px solid " + C.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {(user.full_name || user.email || "O")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textHi }}>{user.full_name || user.email || "ops@lorri.ai"}</div>
                <div style={{ fontSize: 10, color: C.textLow }}>{user.role || "Admin"}</div>
              </div>
            </div>
            <button onClick={logout} style={{ width: "100%", padding: "7px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 12, fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Main */}
        <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", overflow: "auto" }}>
          <Outlet />
        </main>

        {/* Floating Command Chat */}
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
          {open && (
            <div style={{ position: "absolute", bottom: 64, right: 0, width: 420, height: 520, background: "#2D2566", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "12px 16px", background: "#332B7A", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi }}>◈ LoRRI OPS Command</div>
                  <div style={{ fontSize: 10, color: context ? C.success : C.warning, marginTop: 1 }}>
                    {context ? context.shipments.length + " shipments · " + context.cancellations.length + " cancellations" : "Loading data..."}
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.textLow, fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? C.grad : "rgba(255,255,255,0.07)", border: m.role === "user" ? "none" : "1px solid " + (m.color ? m.color + "40" : "rgba(255,255,255,0.1)"), color: m.color || C.textHi, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: "pulse 1.2s " + (j*0.2) + "s infinite" }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["approve all cancellations", "status summary", "list delayed"].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: C.textMid, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="SHP-XXXX next stage · approve all..."
                  disabled={loading}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: C.textHi, fontSize: 13, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
                <button onClick={send} disabled={loading || !input.trim()}
                  style={{ padding: "8px 14px", borderRadius: 10, background: input.trim() ? C.grad : "rgba(0,180,216,0.2)", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: input.trim() ? "pointer" : "default" }}>
                  →
                </button>
              </div>
            </div>
          )}
          <button onClick={() => setOpen(o => !o)}
            style={{ width: 52, height: 52, borderRadius: "50%", background: C.grad, border: "none", color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,180,216,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {open ? "✕" : "◈"}
          </button>
        </div>

      </div>
    </ChatContext.Provider>
  )
}

export function useChatContext() { return useContext(ChatContext) }