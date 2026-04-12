import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGS = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिंदी' },
  { code: 'mr', label: 'म', full: 'मराठी' },
]

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const change = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{t('language')}:</span>
      <div className={styles.buttons}>
        {LANGS.map(l => (
          <button key={l.code}
            className={`${styles.btn} ${i18n.language === l.code ? styles.active : ''}`}
            onClick={() => change(l.code)}
            title={l.full}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
