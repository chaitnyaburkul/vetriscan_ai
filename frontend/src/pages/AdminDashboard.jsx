import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminAPI } from '../api'
import toast from 'react-hot-toast'
import { FiUsers, FiCheckCircle, FiClock, FiTrash2 } from 'react-icons/fi'
import { MdOutlineLocalHospital, MdOutlineHealthAndSafety } from 'react-icons/md'
import styles from './FarmerDashboard.module.css'
import adminStyles from './AdminDashboard.module.css'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [scans, setScans] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [consultations, setConsultations] = useState([])
  const [outbreaks, setOutbreaks] = useState([])
  const [tab, setTab] = useState('overview')
  const [userSearch, setUserSearch] = useState('')

  const load = () => {
    adminAPI.stats().then(r => setStats(r.data)).catch(() => {})
    adminAPI.users().then(r => setUsers(r.data)).catch(() => {})
    adminAPI.pendingDoctors().then(r => setPending(r.data)).catch(() => {})
    adminAPI.scans().then(r => setScans(r.data)).catch(() => {})
    adminAPI.analytics().then(r => setAnalytics(r.data)).catch(() => {})
    adminAPI.consultations().then(r => setConsultations(r.data)).catch(() => {})
    adminAPI.outbreakAlerts().then(r => setOutbreaks(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    await adminAPI.approve(id)
    toast.success('Doctor approved!')
    load()
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return
    await adminAPI.deleteUser(id)
    toast.success('User deleted')
    load()
  }

  const metrics = [
    { label: t('total_users'),       value: stats.total_users   || 0, icon: <FiUsers size={20} />,                  color: '#1a5276' },
    { label: t('active_doctors'),    value: stats.total_doctors || 0, icon: <MdOutlineLocalHospital size={20} />,   color: '#1a6b3c' },
    { label: t('pending_approvals'), value: stats.pending_docs  || 0, icon: <FiClock size={20} />,                  color: '#d68910' },
    { label: t('scans_today'),       value: stats.scans_today   || 0, icon: <MdOutlineHealthAndSafety size={20} />, color: '#6c3483' },
  ]

  const TABS = [
    { key: 'overview',      label: 'Overview' },
    { key: 'analytics',     label: 'Analytics' },
    { key: 'approvals',     label: `Approvals${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { key: 'users',         label: 'Users' },
    { key: 'scans',         label: 'Scan Logs' },
    { key: 'consultations', label: 'Consultations' },
  ]

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div>
          <div className={styles.pageTitleText}>{t('admin_panel')}</div>
          <div className={styles.pageTitleSub}>Platform Management Dashboard</div>
        </div>
        <button className={adminStyles.reportBtn}
          onClick={() => window.open('/api/admin/report/pdf', '_blank')}>
          Generate Report
        </button>
      </div>

      <div className={styles.metrics}>
        {metrics.map(m => (
          <div key={m.label} className={styles.metricCard} style={{ borderLeftColor: m.color }}>
            <div className={styles.metricIconBox} style={{ background: `${m.color}15`, color: m.color }}>{m.icon}</div>
            <div>
              <div className={styles.metricValue}>{m.value}</div>
              <div className={styles.metricLabel}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={adminStyles.tabs}>
        {TABS.map(tb => (
          <button key={tb.key}
            className={`${adminStyles.tab} ${tab === tb.key ? adminStyles.activeTab : ''}`}
            onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className={adminStyles.section}>
          {outbreaks.length > 0 && (
            <div className={adminStyles.outbreakAlert}>
              <strong>Disease Outbreak Alert:</strong>
              {outbreaks.map(o => (
                <span key={o.predicted_disease} className={adminStyles.outbreakItem}>
                  {o.predicted_disease} — {o.farmer_count} farmers in last 24h
                </span>
              ))}
            </div>
          )}
          <div className={adminStyles.sectionTitle}>Platform Summary</div>
          <div className={adminStyles.summaryGrid}>
            {[
              { label: 'Total Farmers',    value: stats.total_farmers    || 0 },
              { label: 'Total Scans',      value: stats.total_scans      || 0 },
              { label: 'Consultations',    value: stats.total_consults   || 0 },
              { label: 'Pending Consults', value: stats.pending_consults || 0 },
            ].map(s => (
              <div key={s.label} className={adminStyles.summaryCard}>
                <div className={adminStyles.summaryValue}>{s.value}</div>
                <div className={adminStyles.summaryLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div className={adminStyles.section}>
          <div className={adminStyles.sectionTitle}>Platform Analytics</div>
          {analytics ? (
            <div className={adminStyles.analyticsGrid}>
              <div className={adminStyles.analyticsCard}>
                <div className={adminStyles.analyticsTitle}>Disease Distribution</div>
                {analytics.disease_distribution.length === 0 && <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>No scan data yet.</div>}
                {analytics.disease_distribution.map(d => {
                  const total = analytics.disease_distribution.reduce((a, b) => a + b.cnt, 0)
                  const pct = total > 0 ? Math.round((d.cnt / total) * 100) : 0
                  return (
                    <div key={d.predicted_disease} className={adminStyles.analyticsRow}>
                      <span>{d.predicted_disease}</span>
                      <div className={adminStyles.analyticsBar}>
                        <div className={adminStyles.analyticsBarFill}
                          style={{ width: `${pct}%`, background: d.predicted_disease === 'Healthy' ? 'var(--primary)' : 'var(--red)' }} />
                      </div>
                      <span className={adminStyles.analyticsCount}>{d.cnt} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
              <div className={adminStyles.analyticsCard}>
                <div className={adminStyles.analyticsTitle}>Daily Scans — Last 7 Days</div>
                {analytics.daily_scans.length === 0 && <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>No data in last 7 days.</div>}
                {analytics.daily_scans.map(d => {
                  const max = Math.max(...analytics.daily_scans.map(x => x.cnt), 1)
                  return (
                    <div key={d.day} className={adminStyles.analyticsRow}>
                      <span style={{ fontSize: '0.78rem' }}>{d.day}</span>
                      <div className={adminStyles.analyticsBar}>
                        <div className={adminStyles.analyticsBarFill}
                          style={{ width: `${(d.cnt / max) * 100}%`, background: 'var(--blue)' }} />
                      </div>
                      <span className={adminStyles.analyticsCount}>{d.cnt}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : <div style={{ color: 'var(--text2)' }}>Loading analytics...</div>}
        </div>
      )}

      {/* Doctor Approvals */}
      {tab === 'approvals' && (
        <div className={adminStyles.section}>
          <div className={adminStyles.sectionTitle}>Pending Doctor Approvals</div>
          {pending.length === 0 && (
            <div className={adminStyles.empty}><FiCheckCircle size={24} color="var(--primary)" /> No pending approvals</div>
          )}
          {pending.map(d => (
            <div key={d.id} className={adminStyles.doctorCard}>
              <div className={adminStyles.doctorInfo}>
                <div className={adminStyles.doctorName}>{d.full_name}</div>
                <div className={adminStyles.doctorMeta}>{d.email} · {d.specialization} · License: {d.license_number}</div>
              </div>
              <div className={adminStyles.doctorActions}>
                <button className={adminStyles.btnApprove} onClick={() => approve(d.id)}>
                  <FiCheckCircle size={14} /> {t('approve')}
                </button>
                <button className={adminStyles.btnReject} onClick={() => deleteUser(d.id)}>
                  <FiTrash2 size={14} /> {t('reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className={adminStyles.section}>
          <div className={adminStyles.sectionTitle}>
            All Users ({filteredUsers.length})
            <button className={adminStyles.exportBtn} onClick={() => adminAPI.exportUsers()}>Export CSV</button>
          </div>
          <input className={adminStyles.searchInput} placeholder="Search by name or email..."
            value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          <table className={adminStyles.table}>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className={`${adminStyles.roleBadge} ${adminStyles[u.role]}`}>{u.role}</span></td>
                  <td><span className={u.is_approved ? adminStyles.approved : adminStyles.pending}>
                    {u.is_approved ? 'Active' : 'Pending'}
                  </span></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className={adminStyles.btnDelete} onClick={() => deleteUser(u.id)}>
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scan Logs */}
      {tab === 'scans' && (
        <div className={adminStyles.section}>
          <div className={adminStyles.sectionTitle}>
            Scan Logs ({scans.length})
            <button className={adminStyles.exportBtn} onClick={() => adminAPI.exportScans()}>Export CSV</button>
          </div>
          <table className={adminStyles.table}>
            <thead><tr><th>Farmer</th><th>Disease</th><th>Confidence</th><th>Date</th></tr></thead>
            <tbody>
              {scans.map(s => (
                <tr key={s.id}>
                  <td>{s.farmer}</td>
                  <td><span style={{ color: s.predicted_disease === 'Healthy' ? 'var(--primary)' : 'var(--red)', fontWeight: 600 }}>
                    {s.predicted_disease}
                  </span></td>
                  <td>{s.confidence}%</td>
                  <td>{s.scanned_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Consultations */}
      {tab === 'consultations' && (
        <div className={adminStyles.section}>
          <div className={adminStyles.sectionTitle}>All Consultations ({consultations.length})</div>
          <table className={adminStyles.table}>
            <thead><tr><th>#</th><th>Farmer</th><th>Doctor</th><th>Disease</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {consultations.map(c => {
                const sc = { pending: '#d68910', replied: 'var(--primary)', closed: 'var(--text3)' }
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.farmer_name}</td>
                    <td>{c.doctor_name || '—'}</td>
                    <td>{c.predicted_disease || '—'}</td>
                    <td><span style={{ color: sc[c.status], fontWeight: 600, fontSize: '0.8rem' }}>{c.status?.toUpperCase()}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{c.created_at?.slice(0, 10)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
