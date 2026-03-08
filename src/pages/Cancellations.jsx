import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../lib/api"
import { useChatContext } from "./DashboardLayout"

const C = {
  bg: "#393185", surface: "#453D9A",
  border: "rgba(255,255,255,0.1)", accent: "#00B4D8", accentDim: "rgba(0,180,216,0.15)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)", textLow: "rgba(255,255,255,0.35)",
}

export default function Cancellations() {
  const { cancellationData, dataLoading, refreshData } = useChatContext()

  const [filter,     setFilter]     = useState("pending")
  const [rejectId,   setRejectId]   = useState(null)
  const [rejectNote, setRejectNote] = useState("")
  const [acting,     setActing]     = useState(null)

  const items = cancellationData || []

  async function approve(id) {
    setActing(id)
    try {
      await api.approveCancellation(id)
      await refreshData()
    } catch (e) { alert(e.message) }
    setActing(null)
  }

  async function reject(id) {
    if (!rejectNote.trim()) { alert("Please enter a rejection reason"); return }
    setActing(id)
    try {
      await api.rejectCancellation(id, rejectNote)
      await refreshData()
      setRejectId(null); setRejectNote("")
    } catch (e) { alert(e.message) }
    setActing(null)
  }

  const filtered = items.filter(i => filter === "all" || i.status === filter)

  return (
    <div style={{ padding: "28px 32px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Cancellation Requests</h1>
          <p style={{ color: C.textMid, fontSize: 13 }}>Review and action customer cancellation requests</p>
        </div>
        <button onClick={refreshData} style={{ padding: "7px 16px", borderRadius: 9, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.25)", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </motion.div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {["pending", "approved", "rejected", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid " + (filter === f ? C.accent : C.border), background: filter === f ? C.accentDim : "transparent", color: filter === f ? C.accent : C.textMid, transition: "all 0.15s", cursor: "pointer" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 99, background: "rgba(0,0,0,0.2)", fontSize: 10 }}>{items.filter(i => i.status === f).length}</span>}
          </button>
        ))}
      </div>

      {dataLoading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid " + C.accentDim, borderTopColor: C.accent, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: C.textLow, background: C.surface, borderRadius: 14, border: "1px solid " + C.border }}>
          No {filter} cancellation requests
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: item.status === "pending" ? C.warning : item.status === "approved" ? C.success : C.error }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.textHi }}>{item.tracking_number || item.shipment_id?.slice(0,8) || "—"}</span>
                    <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: (item.status === "pending" ? C.warning : item.status === "approved" ? C.success : C.error) + "18",
                      color:      item.status === "pending" ? C.warning : item.status === "approved" ? C.success : C.error,
                      border: "1px solid " + (item.status === "pending" ? C.warning : item.status === "approved" ? C.success : C.error) + "35" }}>
                      {(item.status || "—").toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: C.textMid, fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.textLow }}>Customer: </span>{item.profiles?.full_name || item.profiles?.email || item.customer_name || item.user_email || "—"}
                  </div>
                  <div style={{ color: C.textMid, fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.textLow }}>Reason: </span>{item.reason || "No reason provided"}
                  </div>
                  <div style={{ color: C.textLow, fontSize: 12 }}>
                    Requested: {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "—"}
                  </div>
                </div>
                {item.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => approve(item.id)} disabled={acting === item.id}
                      style={{ padding: "7px 18px", borderRadius: 8, background: C.success + "18", border: "1px solid " + C.success + "40", color: C.success, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {acting === item.id ? "..." : "Approve"}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { setRejectId(rejectId === item.id ? null : item.id); setRejectNote("") }}
                      style={{ padding: "7px 18px", borderRadius: 8, background: C.error + "18", border: "1px solid " + C.error + "40", color: C.error, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Reject
                    </motion.button>
                  </div>
                )}
              </div>
              <AnimatePresence>
                {rejectId === item.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.border, display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ color: C.textLow, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Rejection Reason</label>
                      <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Enter reason..."
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid " + C.border, color: C.textHi, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <button onClick={() => reject(item.id)} disabled={acting === item.id}
                      style={{ padding: "8px 18px", borderRadius: 8, background: C.error, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                      {acting === item.id ? "..." : "Confirm"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}