import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { userAPI, consultAPI } from '../api'
import { FiHome, FiActivity, FiCheckCircle, FiLock, FiAlertCircle } from 'react-icons/fi'
import { MdOutlineLocalHospital, MdOutlinePendingActions } from 'react-icons/md'
import styles from './FarmerDashboard.module.css'

export default function DoctorDashboard() {
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [data, setData] = useState(null)
  const [cases, setCases] = useState([])

  useEffect(() => {
    userAPI.me().then(r => setData(r.data)).catch(() => {})
    consultAPI.getMy().then(r => setCases(r.data)).catch(() => {})
  }, [])

  const pending = cases.filter(c => c.status === 'pending').length
  const replied = cases.filter(c => c.status === 'replied').length
  const closed  = cases.filter(c => c.status === 'closed').length

  const metrics = [
    { label: 'Total Cases', value: cases.length,  icon: <MdOutlineLocalHospital size={20} />, color: '#1a5276' },
    { label: t('pending'),  value: pending,        icon: <MdOutlinePendingActions size={20} />, color: '#d68910' },
    { label: t('replied'),  value: replied,        icon: <FiCheckCircle size={20} />,           color: '#1a6b3c' },
    { label: t('closed'),   value: closed,         icon: <FiLock size={20} />,                  color: '#4a5568' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div>
          <div className={styles.pageTitleText}>{t('dashboard')}</div>
          <div className={styles.pageTitleSub}>Doctor Consultation Portal</div>
        </div>
      </div>

      <div className={styles.hero} style={{ background: 'linear-gradient(135deg, #1a3a5c, #1a5276)' }}>
        <h1>Dr. {user.full_name}</h1>
        <p>
          {data?.profile?.specialization || 'General Veterinary'}
          {data?.profile?.experience_years ? ` · ${data.profile.experience_years} years experience` : ''}
        </p>
      </div>

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

      {pending > 0 && (
        <div className={styles.alertBanner}>
          <FiAlertCircle size={16} />
          You have {pending} pending case{pending > 1 ? 's' : ''} waiting for your reply.
          Go to Patient Consultations to respond.
        </div>
      )}
    </div>
  )
}
