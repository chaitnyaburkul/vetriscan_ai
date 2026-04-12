import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Layout from './components/Layout'
import FarmerDashboard from './pages/FarmerDashboard'
import DiseaseDetection from './pages/DiseaseDetection'
import Chatbot from './pages/Chatbot'
import Consultation from './pages/Consultation'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CattleManager from './pages/CattleManager'
import RealtimeMonitor from './pages/RealtimeMonitor'
import VetClinics from './pages/VetClinics'

// Always read fresh from localStorage — never cache at module level
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

// Redirects to / if not logged in, or if wrong role
const PrivateRoute = ({ children, role }) => {
  const user = getUser()
  if (!user) return <Navigate to="/" replace />
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

// Dashboard picks the right component based on current user's role
function DashboardRouter() {
  const user = getUser()
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'farmer') return <FarmerDashboard />
  if (user.role === 'doctor') return <DoctorDashboard />
  return <AdminDashboard />
}

export default function App() {
  const user = getUser()

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#f4f6f9', color: '#1a2332', border: '1px solid #d0d7e2' }
      }} />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login/:role"  element={<Login />} />
        <Route path="/signup/:role" element={<Signup />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
          <Route path="detection"  element={<PrivateRoute><DiseaseDetection /></PrivateRoute>} />
          <Route path="chatbot"    element={<PrivateRoute><Chatbot /></PrivateRoute>} />
          <Route path="consult"    element={<PrivateRoute><Consultation /></PrivateRoute>} />
          <Route path="cattle"     element={<PrivateRoute><CattleManager /></PrivateRoute>} />
          <Route path="monitor"    element={<PrivateRoute role="admin"><RealtimeMonitor /></PrivateRoute>} />
          <Route path="vet-clinics" element={<PrivateRoute><VetClinics /></PrivateRoute>} />
          <Route path="admin"      element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
