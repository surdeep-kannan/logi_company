import { useState } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import lorriLogo from "../assets/lorri.png"

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

  const user = (() => { try { return JSON.parse(localStorage.getItem("company_user") || "{}") } catch { return {} } })()

  function logout() {
    localStorage.removeItem("company_token")
    localStorage.removeItem("company_user")
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
    </div>
  )
}