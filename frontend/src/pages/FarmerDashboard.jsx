import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { userAPI, scanAPI } from '../api'
import { FiSearch, FiMessageSquare, FiActivity, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { MdOutlineHealthAndSafety, MdOutlineLocalHospital } from 'react-icons/md'
import { GiCow } from 'react-icons/gi'
import styles from './FarmerDashboard.module.css'

export default function FarmerDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [scans, setScans] = useState([])
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    userAPI.me().then(r => {
      setData(r.data)
      if (r.data?.profile) {
        setProfileForm({
          farm_name: r.data.profile.farm_name || '',
          location: r.data.profile.location || '',
          cattle_count: r.data.profile.cattle_count || 0,
        })
      }
    }).catch(() => {})
    scanAPI.history().then(r => setScans(r.data)).catch(() => {})
    userAPI.getTip().then(r => setTip(r.data)).catch(() => {})
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('good_morning') : hour < 17 ? t('good_afternoon') : t('good_evening')

  const diseaseCount = scans.filter(s => s.predicted_disease !== 'Healthy').length
  const score = Math.max(0, 100 - diseaseCount * 15)
  const scoreColor = score >= 80 ? '#1a6b3c' : score >= 50 ? '#d68910' : '#c0392b'
  const scoreLabel = score >= 80 ? t('good') : score >= 50 ? t('moderate') : t('critical')

  const metrics = [
    { label: t('total_scans'),   value: scans.length,                    icon: <MdOutlineHealthAndSafety size={20} />, color: '#1a6b3c' },
    { label: t('consultations'), value: data?.consult_count || 0,        icon: <MdOutlineLocalHospital size={20} />,  color: '#1a5276' },
    { label: t('cattle_count'),  value: data?.profile?.cattle_count || 0, icon: <GiCow size={20} />,                  color: '#6c3483' },
    { label: t('health_score'),  value: `${score}/100`,                  icon: <FiActivity size={20} />,              color: scoreColor },
  ]

  const actions = [
    { icon: <MdOutlineHealthAndSafety size={22} />, label: t('scan_now'),     desc: 'Detect cattle diseases instantly', color: '#1a6b3c', path: '/detection' },
    { icon: <FiMessageSquare size={22} />,          label: t('ask_vetribot'), desc: 'AI cattle health assistant',       color: '#1a5276', path: '/chatbot' },
    { icon: <MdOutlineLocalHospital size={22} />,   label: t('consult_now'),  desc: 'Get expert veterinary advice',     color: '#6c3483', path: '/consult' },
  ]

  return (
    <div className={styles.page}>
      {/* Page title */}
      <div className={styles.pageTitle}>
        <div>
          <div className={styles.pageTitleText}>{t('dashboard')}</div>
          <div className={styles.pageTitleSub}>Farmer Health Management Portal</div>
        </div>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <h1>{greeting}, {user.full_name}</h1>
        <p>
          {data?.profile?.farm_name ? `${data.profile.farm_name}` : 'Farm not set'}
          {data?.profile?.location ? ` · ${data.profile.location}` : ''}
        </p>
      </div>

      {/* Metrics */}
      <div className={styles.metrics}>
        {metrics.map(m => (
          <div key={m.label} className={styles.metricCard} style={{ borderLeftColor: m.color }}>
            <div className={styles.metricIconBox} style={{ background: `${m.color}15`, color: m.color }}>
              {m.icon}
            </div>
            <div>
              <div className={styles.metricValue}>{m.value}</div>
              <div className={styles.metricLabel}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Health score */}
      <div className={styles.healthSection}>
        <div className={styles.healthHeader}>
          <div className={styles.healthTitle}>{t('health_score')} — {t('herd_status')}</div>
          <div className={styles.healthScore} style={{ color: scoreColor }}>{score}/100</div>
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${score}%`, background: scoreColor }} />
        </div>
        <div className={styles.healthStatus} style={{ color: scoreColor }}>
          {scoreLabel} — {t('based_on_scans', { count: Math.min(scans.length, 5) })}
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.sectionTitle}>{t('quick_actions')}</div>
      <div className={styles.actions}>
        {actions.map(a => (
          <div key={a.label} className={styles.actionCard} onClick={() => navigate(a.path)}>
            <div className={styles.actionIcon} style={{ background: `${a.color}15`, color: a.color }}>{a.icon}</div>
            <div className={styles.actionLabel}>{a.label}</div>
            <div className={styles.actionDesc}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className={styles.activitySection}>
        <div className={styles.activityHeader}>
          <span>{t('recent_activity')}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{scans.length} total scans</span>
        </div>
        {scans.length === 0 && (
          <div className={styles.activityItem}>
            <div style={{ color: 'var(--text2)', fontSize: '0.88rem', padding: '8px 0' }}>{t('no_scans')}</div>
          </div>
        )}
        {scans.slice(0, 5).map((s, i) => {
          const isHealthy = s.predicted_disease === 'Healthy'
          return (
            <div key={i} className={styles.activityItem}>
              <div className={styles.activityDot} style={{ background: isHealthy ? '#1a6b3c' : '#c0392b' }} />
              <div className={styles.activityText}>{s.predicted_disease}</div>
              <div className={styles.activityConf} style={{ color: isHealthy ? '#1a6b3c' : '#c0392b' }}>
                {s.confidence}%
              </div>
              <div className={styles.activityMeta}>{s.scanned_at?.slice(0, 10)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
