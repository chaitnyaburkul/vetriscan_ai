import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { userAPI, consultAPI } from '../api'
import toast from 'react-hot-toast'
import { FiCheckCircle, FiLock, FiAlertCircle, FiEdit2, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import { MdOutlineLocalHospital, MdOutlinePendingActions } from 'react-icons/md'
import styles from './FarmerDashboard.module.css'
import docStyles from './DoctorDashboard.module.css'

export default function DoctorDashboard() {
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [data, setData] = useState(null)
  const [cases, setCases] = useState([])
  const [showProfile, setShowProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ specialization: '', license_number: '', experience_years: 0, available: true })
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    userAPI.me().then(r => {
      setData(r.data)
      if (r.data?.profile) {
        setProfileForm({
          specialization: r.data.profile.specialization || '',
          license_number: r.data.profile.license_number || '',
          experience_years: r.data.profile.experience_years || 0,
          available: r.data.profile.available === 1,
        })
      }
    }).catch(() => {})
    consultAPI.getMy().then(r => setCases(r.data)).catch(() => {})
  }

  useEffect(() => { loadData() }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await userAPI.updateDoctor(profileForm)
      toast.success('Profile updated!')
      setShowProfile(false)
      loadData()
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const pending = cases.filter(c => c.status === 'pending').length
  const replied = cases.filter(c => c.status === 'replied').length
  const closed  = cases.filter(c => c.status === 'closed').length
  const isAvailable = data?.profile?.available === 1

  const metrics = [
    { label: 'Total Cases', value: cases.length, icon: <MdOutlineLocalHospital size={20} />, color: '#1a5276' },
    { label: t('pending'),  value: pending,       icon: <MdOutlinePendingActions size={20} />, color: '#d68910' },
    { label: t('replied'),  value: replied,       icon: <FiCheckCircle size={20} />,           color: '#1a6b3c' },
    { label: t('closed'),   value: closed,        icon: <FiLock size={20} />,                  color: '#4a5568' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div>
          <div className={styles.pageTitleText}>{t('dashboard')}</div>
          <div className={styles.pageTitleSub}>Doctor Consultation Portal</div>
        </div>
        <button className={styles.editBtn} onClick={() => setShowProfile(!showProfile)}>
          <FiEdit2 size={14} /> Update Profile
        </button>
      </div>

      {/* Hero */}
      <div className={docStyles.heroDoc}>
        <div className={docStyles.heroDocLeft}>
          <div className={docStyles.docName}>Dr. {user.full_name}</div>
          <div className={docStyles.docMeta}>
            {data?.profile?.specialization || 'General Veterinary'}
            {data?.profile?.experience_years ? ` · ${data.profile.experience_years} yrs exp` : ''}
            {data?.profile?.license_number ? ` · ${data.profile.license_number}` : ''}
          </div>
        </div>
        <div className={`${docStyles.availBadge} ${isAvailable ? docStyles.availOn : docStyles.availOff}`}>
          {isAvailable ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
          {isAvailable ? t('available') : 'Unavailable'}
        </div>
      </div>

      {/* Profile update form */}
      {showProfile && (
        <div className={styles.profileCard}>
          <div className={styles.profileTitle}>Update Doctor Profile</div>
          <div className={styles.profileGrid}>
            <div className={styles.field}>
              <label>{t('specialization')}</label>
              <input value={profileForm.specialization}
                onChange={e => setProfileForm({...profileForm, specialization: e.target.value})}
                placeholder="e.g. Bovine Medicine" />
            </div>
            <div className={styles.field}>
              <label>{t('license')}</label>
              <input value={profileForm.license_number}
                onChange={e => setProfileForm({...profileForm, license_number: e.target.value})} />
            </div>
            <div className={styles.field}>
              <label>{t('experience')}</label>
              <input type="number" min="0" value={profileForm.experience_years}
                onChange={e => setProfileForm({...profileForm, experience_years: +e.target.value})} />
            </div>
          </div>
          <label className={docStyles.toggleLabel}>
            <input type="checkbox" checked={profileForm.available}
              onChange={e => setProfileForm({...profileForm, available: e.target.checked})} />
            <span>{t('available')} for Consultations</span>
          </label>
          <button className={styles.saveBtn} onClick={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Metrics */}
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

      {pending > 0 && (
        <div className={styles.alertBanner}>
          <FiAlertCircle size={16} />
          You have {pending} pending case{pending > 1 ? 's' : ''} waiting for your reply.
        </div>
      )}

      {/* Recent cases */}
      {cases.length > 0 && (
        <div className={styles.activitySection}>
          <div className={styles.activityHeader}>
            <span>Recent Patient Cases</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{cases.length} total</span>
          </div>
          {cases.slice(0, 6).map((c, i) => {
            const sc = { pending: '#d68910', replied: '#1a6b3c', closed: '#4a5568' }
            return (
              <div key={i} className={styles.activityItem}>
                <div className={styles.activityDot} style={{ background: sc[c.status] || '#aaa' }} />
                <div className={styles.activityText}>{c.farmer_name}</div>
                {c.predicted_disease && (
                  <div style={{ fontSize: '0.78rem', color: '#1a5276' }}>{c.predicted_disease}</div>
                )}
                <div className={styles.activityMeta}>{c.status?.toUpperCase()}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
