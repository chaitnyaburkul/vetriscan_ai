import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api'
import toast from 'react-hot-toast'
import { GiCow } from 'react-icons/gi'
import { FiUser, FiLock, FiArrowRight } from 'react-icons/fi'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import styles from './Auth.module.css'

const ROLE_CONFIG = {
  farmer: { color: '#1a6b3c', label: 'Farmer Portal', icon: <GiCow size={48} color="white" /> },
  doctor: { color: '#1a5276', label: 'Doctor Portal', icon: <MdOutlineHealthAndSafety size={48} color="white" /> },
  admin:  { color: '#4a235a', label: 'Admin Portal',  icon: <FiUser size={48} color="white" /> },
}

export default function Login() {
  const { role } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.farmer

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await authAPI.login({ ...form, expected_role: role })
      const { token, user } = res.data

      // Strict role check — must match the portal
      if (user.role !== role) {
        toast.error(`Wrong portal. This is a ${user.role.toUpperCase()} account. Please go to the ${user.role} login page.`)
        return  // Do NOT save token or navigate
      }

      // Only save and navigate if role matches
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      toast.success(t('login_success'))
      navigate('/dashboard', { replace: true })

    } catch (err) {
      toast.error(err.response?.data?.detail || t('error_occurred'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.leftPanel} style={{ background: `linear-gradient(160deg, ${cfg.color}dd, ${cfg.color})` }}>
        <div className={styles.leftLogo}>{cfg.icon}</div>
        <div className={styles.leftTitle}>VetriScan AI</div>
        <div className={styles.leftSub}>{t('tagline')}</div>
        <div className={styles.leftStats}>
          {[
            { icon: <MdOutlineHealthAndSafety />, num: '95.59%', label: 'AI Accuracy' },
            { icon: <GiCow />, num: '1,024', label: 'Training Images' },
            { icon: <FiUser />, num: '3', label: 'Languages' },
          ].map(s => (
            <div key={s.label} className={styles.leftStat}>
              <div className={styles.leftStatIcon}>{s.icon}</div>
              <div>
                <div className={styles.leftStatNum}>{s.num}</div>
                <div className={styles.leftStatLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.roleBadge}
              style={{ background: `${cfg.color}15`, color: cfg.color }}>
              {cfg.label}
            </div>
            <div className={styles.cardTitle}>{t('login')}</div>
            <div className={styles.cardSub}>Enter your credentials to access the platform</div>
          </div>

          <form onSubmit={submit} className={styles.form}>
            <div className={styles.field}>
              <label>{t('email')}</label>
              <input type="email" value={form.email} required
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="you@example.com" />
            </div>
            <div className={styles.field}>
              <label>{t('password')}</label>
              <input type="password" value={form.password} required
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="Enter your password" />
            </div>
            <button type="submit" className={styles.submitBtn}
              style={{ background: cfg.color }}
              disabled={loading}>
              {loading ? 'Please wait...' : <>{t('login')} <FiArrowRight size={14} /></>}
            </button>
          </form>

          {role !== 'admin' && (
            <p className={styles.switchLink}>
              {t('no_account')} <Link to={`/signup/${role}`}>{t('signup')}</Link>
            </p>
          )}
          <p className={styles.switchLink}><Link to="/">← Back to Home</Link></p>
        </div>
      </div>
    </div>
  )
}
