import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { api } from "../lib/api"

const C = {
  bg: "#393185", surface: "#453D9A", border: "rgba(255,255,255,0.1)",
  borderUp: "rgba(255,255,255,0.18)", accent: "#00B4D8",
  accentDim: "rgba(0,180,216,0.15)", accentGlow: "rgba(0,180,216,0.25)",
  grad: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
  textHi: "rgba(255,255,255,0.95)", textMid: "rgba(255,255,255,0.6)",
  textLow: "rgba(255,255,255,0.35)", error: "#EF4444",
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleLogin() {
    if (!email || !password) { setError("Fill in all fields"); return }
    setLoading(true); setError("")
    try {
      const data = await api.login({ email, password })
      localStorage.setItem("company_token", data.token || data.access_token)
      localStorage.setItem("company_user", JSON.stringify(data.user || data))
      navigate("/dashboard")
    } catch (e) {
      setError(e.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Glow */}
      <div style={{ position: "fixed", top: "20%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,216,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{ width: "100%", maxWidth: 400, background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, padding: "36px 32px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", padding: "7px 18px", borderRadius: 10, background: C.grad, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 16 }}>
            LORRI OPS
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Company Portal</h1>
          <p style={{ color: C.textMid, fontSize: 13 }}>Sign in to manage operations</p>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "ops@lorri.ai" },
            { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "••••••••" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ color: C.textLow, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder={f.placeholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 9, fontSize: 14,
                  background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}`,
                  color: C.textHi, outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          ))}

          {error && (
            <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: C.error, fontSize: 13 }}>
              {error}
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleLogin} disabled={loading}
            style={{ padding: "12px", borderRadius: 10, background: loading ? "rgba(0,180,216,0.4)" : C.grad, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", marginTop: 4, boxShadow: `0 4px 20px ${C.accentGlow}` }}>
            {loading ? "Signing in..." : "Sign In"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}