import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { FiHome, FiLogOut, FiUser, FiShield, FiSun, FiMoon, FiMapPin, FiActivity } from 'react-icons/fi'
import { MdOutlineHealthAndSafety, MdOutlineLocalHospital } from 'react-icons/md'
import { FiMessageSquare } from 'react-icons/fi'
import { GiCow } from 'react-icons/gi'
import { consultAPI } from '../api'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Layout.module.css'

export default function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [unread, setUnread] = useState(0)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Poll for unread consultation replies every 15 seconds (farmers only)
  useEffect(() => {
    if (user.role !== 'farmer') return
    const fetchUnread = () => {
      consultAPI.unreadCount().then(r => setUnread(r.data.count)).catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [user.role])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const farmerNav = [
    { to: '/dashboard',   icon: <FiHome size={17} />,                   label: t('dashboard') },
    { to: '/detection',   icon: <MdOutlineHealthAndSafety size={17} />, label: t('disease_detection') },
    { to: '/cattle',      icon: <GiCow size={17} />,                    label: 'My Cattle' },
    { to: '/chatbot',     icon: <FiMessageSquare size={17} />,          label: t('chatbot') },
    { to: '/consult',     icon: <MdOutlineLocalHospital size={17} />,   label: t('consult_doctor'), badge: unread },
    { to: '/vet-clinics', icon: <FiMapPin size={17} />,                 label: 'Vet Clinics' },
  ]
  const doctorNav = [
    { to: '/dashboard',   icon: <FiHome size={17} />,                   label: t('dashboard') },
    { to: '/consult',     icon: <MdOutlineLocalHospital size={17} />,   label: 'Patient Consultations' },
    { to: '/vet-clinics', icon: <FiMapPin size={17} />,                 label: 'Vet Clinics' },
  ]
  const adminNav = [
    { to: '/dashboard', icon: <FiShield size={17} />,   label: t('admin_panel') },
    { to: '/monitor',   icon: <FiActivity size={17} />, label: 'Live Monitor' },
  ]

  const nav = user.role === 'farmer' ? farmerNav : user.role === 'doctor' ? doctorNav : adminNav
  const roleLabel = user.role === 'farmer' ? t('farmer') : user.role === 'doctor' ? t('doctor') : t('admin')

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}><GiCow size={24} /></div>
          <div>
            <div className={styles.brandName}>VetriScan AI</div>
            <div className={styles.brandSub}>Cattle Health Platform</div>
          </div>
        </div>

        {/* User card */}
        <div className={styles.userCard}>
          <div className={styles.userAvatar}><FiUser size={16} /></div>
          <div>
            <div className={styles.userName}>{user.full_name}</div>
            <div className={styles.userRole}>{roleLabel}</div>
          </div>
        </div>

        {/* Nav */}
        <div className={styles.navSection}>
          <div className={styles.navSectionLabel}>Navigation</div>
        </div>
        <nav className={styles.nav}>
          {nav.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge > 0 && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <LanguageSwitcher />
          <button className={styles.themeBtn} onClick={() => setDark(!dark)}>
            {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className={styles.logoutBtn} onClick={logout}>
            <FiLogOut size={15} /> {t('logout')}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
