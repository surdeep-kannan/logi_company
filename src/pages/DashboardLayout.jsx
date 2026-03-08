import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import lorriLogo from "../assets/lorri.png"
import { api } from "../lib/api"

const C = {
  bg: "#393185", surface: "#453D9A", surfaceMid: "#4F47AA",
  border: "rgba(255,255,255,0.1)", borderUp: "rgba(255,255,255,0.18)",
  accent: "#00B4D8", accentDim: "rgba(0,180,216,0.15)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const NAV = [
  { path: "/dashboard",              label: "Dashboard",     icon: "▦" },
  { path: "/dashboard/shipments",    label: "Shipments",     icon: "⬡" },
  { path: "/dashboard/cancellations",label: "Cancellations", icon: "✕" },
  { path: "/dashboard/ai",           label: "AI Command",    icon: "◈" },
]

export default function DashboardLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [mobile, setMobile] = useState(false)

  // ── Persistent chat state (survives page navigation) ──
  const INIT_MSG = { role: "assistant", content: "Hello! I'm your LoRRI operations AI. I have full context of all shipments and cancellation requests. Ask me anything or give me a command.", action: null }
  const [chatOpen,     setChatOpen]     = useState(false)
  const [chatMessages, setChatMessages] = useState([INIT_MSG])
  const [chatInput,    setChatInput]    = useState("")
  const [chatLoading,  setChatLoading]  = useState(false)
  const [chatContext,  setChatContext]  = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.getShipments().catch(() => []),
      api.getCancellations().catch(() => []),
    ]).then(([ships, cans]) => {
      const s = Array.isArray(ships) ? ships : ships?.shipments || []
      const c = Array.isArray(cans)  ? cans  : cans?.cancellations || []
      setChatContext({
        shipments: s.map(x => ({ uuid: x.id, id: x.tracking_number || x.id, tracking_number: x.tracking_number, status: x.status, route: `${x.origin_city} → ${x.dest_city}`, customer: x.profiles?.full_name || x.profiles?.email || "Unknown", carrier: x.carrier, eta: x.eta })),
        cancellations: c.map(x => ({ id: x.id, tracking_number: x.tracking_number, status: x.status, reason: x.reason, customer: x.profiles?.full_name || x.profiles?.email || "Unknown" }))
      })
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages, chatOpen])

  async function sendChat(text) {
    const msg = text || chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput("")
    const userMsg = { role: "user", content: msg }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)
    try {
      const res = await api.aiChat([...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })), chatContext)
      const replyText = res.reply || res.message || (typeof res === "string" ? res : "Done.")
      setChatMessages(prev => [...prev, { role: "assistant", content: replyText, action: res.action || null }])
      if (res.action?.executed) {
        const [newS, newC] = await Promise.all([api.getShipments().catch(() => []), api.getCancellations().catch(() => [])])
        const s = Array.isArray(newS) ? newS : newS?.shipments || []
        const c = Array.isArray(newC) ? newC : newC?.cancellations || []
        setChatContext({
          shipments: s.map(x => ({ uuid: x.id, id: x.tracking_number || x.id, tracking_number: x.tracking_number, status: x.status, route: `${x.origin_city} → ${x.dest_city}`, customer: x.profiles?.full_name || x.profiles?.email || "Unknown", carrier: x.carrier, eta: x.eta })),
          cancellations: c.map(x => ({ id: x.id, tracking_number: x.tracking_number, status: x.status, reason: x.reason, customer: x.profiles?.full_name || x.profiles?.email || "Unknown" }))
        })
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}`, action: null }])
    }
    setChatLoading(false)
  }

  const user = (() => { try { return JSON.parse(localStorage.getItem("company_user") || "{}") } catch { return {} } })()

  function logout() {
    localStorage.removeItem("company_token")
    localStorage.removeItem("company_user")
    setChatMessages([INIT_MSG])
    setChatContext(null)
    navigate("/")
  }

  const Sidebar = () => (
    <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <img src={lorriLogo} alt="LoRRI" style={{ height: 36, objectFit: "contain", display: "block" }} />
        <div style={{ color: C.textLow, fontSize: 11, marginTop: 6 }}>Operations Portal</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => {
          const active = location.pathname === n.path
          return (
            <button key={n.path} onClick={() => navigate(n.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9,
                background: active ? C.accentDim : "transparent",
                border: active ? "1px solid rgba(0,180,216,0.25)" : "1px solid transparent",
                color: active ? C.accent : C.textMid,
                fontSize: 13, fontWeight: active ? 700 : 500, textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{n.icon}</span>
              {n.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(user.email || "O")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textHi }}>{user.email || "ops@lorri.ai"}</div>
            <div style={{ fontSize: 10, color: C.textLow }}>Admin</div>
          </div>
        </div>
        <button onClick={logout}
          style={{ width: "100%", padding: "7px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 12, fontWeight: 600 }}>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", overflow: "auto" }}>
        <Outlet />
      </main>
    {/* ── Persistent Floating Chat ── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
        {chatOpen && (
          <div style={{ position: "absolute", bottom: 64, right: 0, width: 360, height: 480, background: "#2D2566", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#332B7A" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>◈</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>LoRRI OPS AI</div>
                  <div style={{ fontSize: 10, color: "#00B4D8" }}>{chatContext ? `${chatContext.shipments.length} shipments loaded` : "Loading..."}</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "linear-gradient(135deg,#0077B6,#00B4D8)" : "#3D3585", color: "rgba(255,255,255,0.95)", fontSize: 13, lineHeight: 1.5 }}>
                    {m.content}
                    {m.action?.executed && <div style={{ marginTop: 4, fontSize: 11, color: "#22C55E" }}>✓ Action executed</div>}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: "#3D3585" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B4D8", animation: `pulse 1.2s ${j*0.2}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Type a command..." disabled={chatLoading}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.95)", fontSize: 13, outline: "none" }} />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(135deg,#0077B6,#00B4D8)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none" }}>
                →
              </button>
            </div>
          </div>
        )}
        {/* Toggle button */}
        <button onClick={() => setChatOpen(o => !o)}
          style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#0077B6,#00B4D8)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,180,216,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {chatOpen ? "✕" : "◈"}
        </button>
      </div>
    </div>
  )
}