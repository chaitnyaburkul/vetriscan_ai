import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api'
import toast from 'react-hot-toast'
import { GiCow } from 'react-icons/gi'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import styles from './Auth.module.css'

const ROLE_CONFIG = {
  farmer: { color: '#1a6b3c', label: 'Farmer Registration', icon: <GiCow size={48} color="white" /> },
  doctor: { color: '#1a5276', label: 'Doctor Registration', icon: <MdOutlineHealthAndSafety size={48} color="white" /> },
}

export default function Signup() {
  const { role } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.farmer
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
    farm_name: '', location: '', cattle_count: 0,
    specialization: '', license_number: '', experience_years: 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error(t('passwords_no_match')); return }
    setLoading(true)
    try {
      await authAPI.signup({ ...form, role })
      toast.success(t('registration_success'))
      navigate(`/login/${role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('error_occurred'))
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel} style={{ background: `linear-gradient(160deg, ${cfg.color}cc, ${cfg.color})` }}>
        <div className={styles.leftLogo}>{cfg.icon}</div>
        <div className={styles.leftTitle}>VetriScan AI</div>
        <div className={styles.leftSub}>{t('tagline')}</div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.roleBadge} style={{ background: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</div>
            <div className={styles.cardTitle}>{t('signup')}</div>
            <div className={styles.cardSub}>Create your account to get started</div>
          </div>

          <form onSubmit={submit} className={styles.form}>
            <div className={styles.field}><label>{t('full_name')}</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Enter your full name" /></div>
            <div className={styles.field}><label>{t('email')}</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com" /></div>
            <div className={styles.field}><label>{t('phone')}</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile number" /></div>
            <div className={styles.field}><label>{t('password')}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Create a password" /></div>
            <div className={styles.field}><label>{t('confirm_password')}</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required placeholder="Confirm your password" /></div>

            {role === 'farmer' && <>
              <hr className={styles.divider} />
              <p className={styles.sectionLabel}>Farm Details</p>
              <div className={styles.field}><label>{t('farm_name')}</label>
                <input value={form.farm_name} onChange={e => set('farm_name', e.target.value)} placeholder="Name of your farm" /></div>
              <div className={styles.field}><label>{t('location')}</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Village / District" /></div>
              <div className={styles.field}><label>{t('cattle_count')}</label>
                <input type="number" min="0" value={form.cattle_count} onChange={e => set('cattle_count', +e.target.value)} /></div>
            </>}

            {role === 'doctor' && <>
              <hr className={styles.divider} />
              <p className={styles.sectionLabel}>Professional Details</p>
              <div className={styles.field}><label>{t('specialization')}</label>
                <input value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="e.g. Bovine Medicine" /></div>
              <div className={styles.field}><label>{t('license')}</label>
                <input value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="Veterinary License Number" /></div>
              <div className={styles.field}><label>{t('experience')}</label>
                <input type="number" min="0" value={form.experience_years} onChange={e => set('experience_years', +e.target.value)} /></div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', padding: '4px 0' }}>
                Doctor accounts require admin approval before login.
              </p>
            </>}

            <button type="submit" className={styles.submitBtn}
              style={{ background: cfg.color }} disabled={loading}>
              {loading ? 'Please wait...' : t('signup')}
            </button>
          </form>

          <p className={styles.switchLink}>
            {t('already_account')} <Link to={`/login/${role}`}>{t('login')}</Link>
          </p>
          <p className={styles.switchLink}><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  )
}
