import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import DashboardLayout from "./pages/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import Shipments from "./pages/Shipments"
import Cancellations from "./pages/Cancellations"
import AICommand from "./pages/AICommand"

function RequireAuth({ children }) {
  const token = localStorage.getItem("company_token")
  return token ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="shipments"     element={<Shipments />} />
          <Route path="cancellations" element={<Cancellations />} />
          <Route path="ai"            element={<AICommand />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}