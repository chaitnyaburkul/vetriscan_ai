import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Only force logout on 401 (unauthorized) — NOT on 422 (validation errors like low confidence)
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login:  (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
}

export const scanAPI = {
  predict: (formData) => api.post('/scans/predict', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  history: ()       => api.get('/scans/history'),
}

export const consultAPI = {
  getDoctors:      ()          => api.get('/consultations/doctors'),
  request:         (data)      => api.post('/consultations/request', data),
  getMy:           ()          => api.get('/consultations/my'),
  getMessages:     (id)        => api.get(`/consultations/${id}/messages`),
  sendMessage:     (id, msg)   => api.post(`/consultations/${id}/message`, { message: msg }),
  close:           (id)        => api.patch(`/consultations/${id}/close`),
  rate:            (id, data)  => api.post(`/consultations/${id}/rate`, data),
  getRating:       (id)        => api.get(`/consultations/${id}/rating`),
  doctorRating:    (doctorId)  => api.get(`/consultations/doctor/${doctorId}/rating`),
  unreadCount:     ()          => api.get('/consultations/unread-count'),
  addPrescription: (id, data)  => api.post(`/consultations/${id}/prescription`, data),
}

export const chatAPI = {
  chat: (data) => api.post('/chatbot/chat', data),
}

export const userAPI = {
  me:               ()     => api.get('/users/me'),
  updateFarmer:     (data) => api.put('/users/profile/farmer', data),
  updateDoctor:     (data) => api.put('/users/profile/doctor', data),
  getTip:           ()     => api.get('/users/tips'),
  getChatHistory:   ()     => api.get('/users/chat-history'),
  clearChatHistory: ()     => api.delete('/users/chat-history'),
}

export const adminAPI = {
  stats:          () => api.get('/admin/stats'),
  analytics:      () => api.get('/admin/analytics'),
  users:          () => api.get('/admin/users'),
  pendingDoctors: () => api.get('/admin/pending-doctors'),
  approve:        (id) => api.patch(`/admin/approve/${id}`),
  deleteUser:     (id) => api.delete(`/admin/user/${id}`),
  scans:          () => api.get('/admin/scans'),
  consultations:  () => api.get('/admin/consultations'),
  exportScans:    () => window.open('/api/admin/export/scans', '_blank'),
  exportUsers:    () => window.open('/api/admin/export/users', '_blank'),
  outbreakAlerts: () => api.get('/admin/outbreak-alerts'),
  realtime:       () => api.get('/admin/realtime'),
}

export const cattleAPI = {
  getAll:           ()      => api.get('/cattle'),
  add:              (data)  => api.post('/cattle', data),
  update:           (id, d) => api.put(`/cattle/${id}`, d),
  remove:           (id)    => api.delete(`/cattle/${id}`),
  getVaccinations:  (id)    => api.get(`/cattle/${id}/vaccinations`),
  addVaccination:   (data)  => api.post('/cattle/vaccinations', data),
  upcoming:         ()      => api.get('/cattle/upcoming-vaccinations'),
}

export default api
