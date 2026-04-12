import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GiCow } from 'react-icons/gi'
import { FiSearch, FiMessageSquare, FiActivity, FiShield, FiArrowRight, FiGlobe } from 'react-icons/fi'
import { MdOutlineHealthAndSafety, MdOutlineLocalHospital, MdOutlineAnalytics } from 'react-icons/md'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './Landing.module.css'

const FEATURES = [
  {
    icon: <MdOutlineHealthAndSafety size={28} />,
    key: 'feature_detection',
    role: 'farmer',
    desc: {
      en: 'Upload cattle images for instant AI-powered Lumpy Skin Disease detection with 95%+ accuracy.',
      hi: 'पशुओं की छवियां अपलोड करें और 95%+ सटीकता के साथ लम्पी स्किन रोग का पता लगाएं।',
      mr: 'जनावरांच्या प्रतिमा अपलोड करा आणि 95%+ अचूकतेसह लम्पी स्किन रोग ओळखा.',
    }
  },
  {
    icon: <FiMessageSquare size={28} />,
    key: 'feature_chatbot',
    role: 'farmer',
    desc: {
      en: 'VetriBot powered by Google Gemini answers cattle health questions in English, Hindi and Marathi.',
      hi: 'गूगल जेमिनी द्वारा संचालित वेट्रीबॉट हिंदी, मराठी और अंग्रेजी में पशु स्वास्थ्य प्रश्नों का उत्तर देता है।',
      mr: 'Google Gemini द्वारे चालवलेला VetriBot मराठी, हिंदी आणि इंग्रजीत पशु आरोग्य प्रश्नांची उत्तरे देतो.',
    }
  },
  {
    icon: <MdOutlineLocalHospital size={28} />,
    key: 'feature_consult',
    role: 'doctor',
    desc: {
      en: 'Connect directly with certified veterinary doctors for expert advice and treatment plans.',
      hi: 'प्रमाणित पशु चिकित्सकों से सीधे जुड़ें और विशेषज्ञ सलाह प्राप्त करें।',
      mr: 'प्रमाणित पशुवैद्यकांशी थेट संपर्क साधा आणि तज्ञ सल्ला मिळवा.',
    }
  },
  {
    icon: <MdOutlineAnalytics size={28} />,
    key: 'feature_admin',
    role: 'admin',
    desc: {
      en: 'Manage users, approve doctors, monitor scans and view platform analytics in real time.',
      hi: 'उपयोगकर्ताओं को प्रबंधित करें, डॉक्टरों को स्वीकृत करें और प्लेटफॉर्म एनालिटिक्स देखें।',
      mr: 'वापरकर्ते व्यवस्थापित करा, डॉक्टरांना मंजूर करा आणि प्लॅटफॉर्म विश्लेषण पहा.',
    }
  },
]

export default function Landing() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language

  const heroDesc = {
    en: 'Empowering Indian farmers with AI-powered cattle health monitoring. Detect Lumpy Skin Disease instantly, consult certified veterinary doctors, and get 24/7 AI assistance.',
    hi: 'भारतीय किसानों को AI-संचालित पशु स्वास्थ्य निगरानी के साथ सशक्त बनाना। लम्पी स्किन रोग का तुरंत पता लगाएं, प्रमाणित पशु चिकित्सकों से परामर्श करें।',
    mr: 'भारतीय शेतकऱ्यांना AI-चालित पशु आरोग्य देखरेखीसह सक्षम करणे. लम्पी स्किन रोग त्वरित ओळखा, प्रमाणित पशुवैद्यकांचा सल्ला घ्या.',
  }

  return (
    <div className={styles.page}>
      {/* Gov top strip */}
      <div className={styles.govStrip}>
        <div className={styles.govStripLeft}>
          <span>Government of India Initiative</span>
          <span>|</span>
          <span>Ministry of Agriculture & Farmers Welfare</span>
        </div>
        <div className={styles.govStripRight}>
          <FiGlobe size={12} />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerLogo}><GiCow size={30} /></div>
          <div>
            <div className={styles.headerTitle}>VetriScan AI</div>
            <div className={styles.headerSub}>{t('tagline')}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={`${styles.headerBtn} ${styles.btnOutline}`} onClick={() => navigate('/login/farmer')}>
            {t('farmer')} {t('login')}
          </button>
          <button className={`${styles.headerBtn} ${styles.btnOutline}`} onClick={() => navigate('/login/doctor')}>
            {t('doctor')} {t('login')}
          </button>
          <button className={`${styles.headerBtn} ${styles.btnFill}`} onClick={() => navigate('/login/admin')}>
            {t('admin')}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroBadge}>
            <FiShield size={11} /> AI-Powered Cattle Health Platform
          </div>
          <h1 className={styles.heroTitle}>
            {lang === 'hi' ? <>स्मार्ट <span>पशु स्वास्थ्य</span> प्लेटफॉर्म</> :
             lang === 'mr' ? <>स्मार्ट <span>पशु आरोग्य</span> प्लॅटफॉर्म</> :
             <>Smart <span>Cattle Health</span> Platform</>}
          </h1>
          <p className={styles.heroDesc}>{heroDesc[lang] || heroDesc.en}</p>
          <div className={styles.heroBtns}>
            <button className={styles.heroBtnPrimary} onClick={() => navigate('/login/farmer')}>
              <GiCow size={18} />
              {t('farmer')} {t('login')}
            </button>
            <button className={styles.heroBtnSecondary} onClick={() => navigate('/signup/farmer')}>
              {t('signup')} <FiArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroCard}>
            <div className={styles.heroCardIcon}><GiCow /></div>
            <div className={styles.heroCardStat}>95.59%</div>
            <div className={styles.heroCardLabel}>AI Model Accuracy</div>
            <div className={styles.heroCardSub}>MobileNetV2 · Transfer Learning · CNN</div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        {[
          { num: '95.59%', label: 'Model Accuracy' },
          { num: '1,024',  label: 'Training Images' },
          { num: '3',      label: lang === 'hi' ? 'समर्थित भाषाएं' : lang === 'mr' ? 'समर्थित भाषा' : 'Languages Supported' },
          { num: '24/7',   label: lang === 'hi' ? 'AI सहायता' : lang === 'mr' ? 'AI सहाय्य' : 'AI Assistance' },
        ].map(s => (
          <div key={s.label} className={styles.statItem}>
            <div className={styles.statNum}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('key_features')}</h2>
          <div className={styles.sectionLine} />
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.key} className={styles.featureCard} onClick={() => navigate(`/login/${f.role}`)}>
              <div className={styles.featureIconBox}>{f.icon}</div>
              <div className={styles.featureTitle}>{t(f.key)}</div>
              <div className={styles.featureDesc}>{f.desc[lang] || f.desc.en}</div>
              <span className={styles.featureLink}>{t('get_started')} <FiArrowRight size={11} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        VetriScan AI — Smart Cattle Health Platform | Government of India Initiative | Ministry of Agriculture &amp; Farmers Welfare
      </footer>
    </div>
  )
}
