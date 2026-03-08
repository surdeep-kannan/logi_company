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

const STATUSES = ["all", "pending", "in_transit", "delivered", "cancelled", "delayed"]
const STATUS_COLOR = { pending: C.warning, in_transit: C.accent, delivered: C.success, cancelled: C.error, delayed: "#F97316" }

export default function Shipments() {
  const { shipmentData, dataLoading, refreshData } = useChatContext()

  const [filter,   setFilter]   = useState("all")
  const [search,   setSearch]   = useState("")
  const [editing,  setEditing]  = useState(null)
  const [editData, setEditData] = useState({})
  const [saving,   setSaving]   = useState(false)

  const shipments = shipmentData || []

  async function saveEdit(id) {
    setSaving(true)
    try {
      await api.updateShipment(id, editData)
      await refreshData()
      setEditing(null)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const filtered = shipments.filter(s => {
    const matchStatus = filter === "all" || s.status === filter
    const matchSearch = !search || [s.tracking_number, s.origin_city, s.dest_city, s.carrier].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  return (
    <div style={{ padding: "28px 32px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Shipments</h1>
          <p style={{ color: C.textMid, fontSize: 13 }}>Manage and update all shipments</p>
        </div>
        <button onClick={refreshData} style={{ padding: "7px 16px", borderRadius: 9, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.25)", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </motion.div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shipments..."
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 9, background: "rgba(0,0,0,0.2)", border: "1px solid " + C.border, color: C.textHi, fontSize: 13, outline: "none" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid " + (filter === s ? C.accent : C.border), background: filter === s ? C.accentDim : "transparent", color: filter === s ? C.accent : C.textMid, transition: "all 0.15s" }}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
        {dataLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid " + C.accentDim, borderTopColor: C.accent, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + C.border }}>
                  {["ID", "Customer", "Origin", "Destination", "Carrier", "Status", "ETA", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textLow, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: C.textLow }}>No shipments found</td></tr>
                ) : filtered.map((s, i) => (
                  <>
                    <tr key={s.id} style={{ borderBottom: "1px solid " + C.border, background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "11px 14px", color: C.accent, fontWeight: 600, whiteSpace: "nowrap" }}>{s.tracking_number || s.id?.slice(0,8)}</td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{s.profiles?.full_name || s.profiles?.email || "—"}</td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{s.origin_city || "—"}</td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{s.dest_city || "—"}</td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{s.carrier || "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: (STATUS_COLOR[s.status] || C.textLow) + "18", color: STATUS_COLOR[s.status] || C.textLow, border: "1px solid " + (STATUS_COLOR[s.status] || C.textLow) + "35" }}>
                          {(s.status || "—").replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", color: C.textMid, whiteSpace: "nowrap" }}>{s.eta ? new Date(s.eta).toLocaleDateString("en-IN") : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={() => { setEditing(editing === s.id ? null : s.id); setEditData({ status: s.status, carrier: s.carrier, eta: s.eta }) }}
                          style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: editing === s.id ? C.accentDim : "rgba(255,255,255,0.07)", border: "1px solid " + (editing === s.id ? C.accent : C.border), color: editing === s.id ? C.accent : C.textMid, cursor: "pointer" }}>
                          {editing === s.id ? "Cancel" : "Edit"}
                        </button>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {editing === s.id && (
                        <motion.tr key={"edit-" + s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td colSpan={8} style={{ padding: "14px 16px", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid " + C.border }}>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                              <div>
                                <label style={{ color: C.textLow, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Status</label>
                                <select value={editData.status || ""} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}
                                  style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid " + C.border, color: C.textHi, fontSize: 13, outline: "none" }}>
                                  {["pending","in_transit","delivered","cancelled","delayed"].map(st => <option key={st} value={st}>{st.replace("_"," ")}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ color: C.textLow, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Carrier</label>
                                <input value={editData.carrier || ""} onChange={e => setEditData(p => ({ ...p, carrier: e.target.value }))}
                                  style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid " + C.border, color: C.textHi, fontSize: 13, outline: "none", width: 160 }} />
                              </div>
                              <div>
                                <label style={{ color: C.textLow, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>ETA</label>
                                <input type="date" value={editData.eta?.slice(0,10) || ""} onChange={e => setEditData(p => ({ ...p, eta: e.target.value }))}
                                  style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid " + C.border, color: C.textHi, fontSize: 13, outline: "none" }} />
                              </div>
                              <button onClick={() => saveEdit(s.id)} disabled={saving}
                                style={{ padding: "8px 20px", borderRadius: 8, background: C.grad, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                                {saving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}