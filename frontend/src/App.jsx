import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Component } from 'react'
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

// Error boundary to catch crashes
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'Arial', color: '#c0392b' }}>
          <h2>Something went wrong</h2>
          <pre style={{ background: '#fdf2f2', padding: 16, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack?.slice(0, 500)}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ marginTop: 16, padding: '10px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Clear & Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
