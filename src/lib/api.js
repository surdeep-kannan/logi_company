const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

function getToken() {
  return localStorage.getItem("company_token")
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

export const api = {
  // Auth
  login: (body) => request("/api/company/auth/login",  { method: "POST", body: JSON.stringify(body) }),

  // Shipments
  getShipments: (params = {}) => request("/api/shipments/company/all" + (Object.keys(params).length ? "?" + new URLSearchParams(params) : "")),
  updateShipment: (id, body)  => request(`/api/shipments/company/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getStats: ()                => request("/api/shipments/company/stats"),

  // Cancellations (company schema)
  getCancellations: ()        => request("/api/cancellations"),
  approveCancellation: (id)   => request(`/api/cancellations/${id}/approve`, { method: "POST" }),
  rejectCancellation: (id, reason) => request(`/api/cancellations/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  // AI
  aiChat: (messages, context) => {
    const lastMsg = messages[messages.length - 1]?.content || ""
    return request("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: lastMsg, shipment_context: context }) })
  },
}