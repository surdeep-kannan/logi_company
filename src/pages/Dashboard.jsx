import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { api } from "../lib/api"

const C = {
  bg: "#393185", surface: "#453D9A", surfaceMid: "#4F47AA",
  border: "rgba(255,255,255,0.1)", borderUp: "rgba(255,255,255,0.18)",
  accent: "#00B4D8", accentDim: "rgba(0,180,216,0.15)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

const STATUS_COLOR = {
  pending:    C.warning,
  in_transit: C.accent,
  delivered:  C.success,
  cancelled:  C.error,
  delayed:    "#F97316",
}

function KPICard({ label, value, sub, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ color: C.textLow, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: color || C.textHi, marginBottom: 4 }}>{value ?? "—"}</div>
      {sub && <div style={{ color: C.textLow, fontSize: 12 }}>{sub}</div>}
    </motion.div>
  )
}

export default function Dashboard() {
  const [stats, setStats]           = useState(null)
  const [shipments, setShipments]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      api.getStats().catch(() => null),
      api.getShipments("?limit=8&status=in_transit").catch(() => []),
    ]).then(([s, sh]) => {
      setStats(s)
      setShipments(Array.isArray(sh) ? sh : sh?.shipments || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.accentDim}`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite" }} />
    </div>
  )

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Operations Overview</h1>
        <p style={{ color: C.textMid, fontSize: 13 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </motion.div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KPICard label="Total Shipments"   value={stats?.total_shipments ?? "—"}    color={C.accent}   delay={0}    />
        <KPICard label="Active / In Transit" value={stats?.active_shipments ?? "—"} color="#00B4D8"    delay={0.05} />
        <KPICard label="Delayed"           value={stats?.delayed_shipments ?? "—"}  color={C.warning}  delay={0.1}  />
        <KPICard label="Delivered MTD"     value={stats?.delivered_mtd ?? "—"}      color={C.success}  delay={0.15} />
        <KPICard label="Revenue MTD"       value={stats?.monthly_spend ? `₹${Number(stats.monthly_spend).toLocaleString("en-IN")}` : "—"} color={C.grad} delay={0.2} />
      </div>

      {/* Active shipments table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Active Shipments</h2>
          <span style={{ color: C.textLow, fontSize: 12 }}>{shipments.length} shown</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Shipment ID", "Origin", "Destination", "Carrier", "Status", "ETA"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.textLow, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: C.textLow }}>No active shipments</td></tr>
              ) : shipments.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.08)" }}>
                  <td style={{ padding: "12px 16px", color: C.accent, fontWeight: 600 }}>{s.tracking_number || s.id?.slice(0,8)}</td>
                  <td style={{ padding: "12px 16px", color: C.textMid }}>{s.origin_city || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.textMid }}>{s.destination_city || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.textMid }}>{s.carrier_name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${STATUS_COLOR[s.status] || C.textLow}18`, color: STATUS_COLOR[s.status] || C.textLow, border: `1px solid ${STATUS_COLOR[s.status] || C.textLow}35` }}>
                      {s.status?.replace("_", " ").toUpperCase() || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.textMid }}>{s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}