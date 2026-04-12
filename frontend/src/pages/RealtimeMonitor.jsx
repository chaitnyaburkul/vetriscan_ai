import { useState, useEffect, useRef } from 'react'
import { adminAPI } from '../api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiUsers, FiRefreshCw } from 'react-icons/fi'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import styles from './RealtimeMonitor.module.css'

const COLORS = { Healthy: '#1a6b3c', 'Lumpy Skin Disease': '#c0392b' }
const REFRESH_INTERVAL = 10000 // 10 seconds

export default function RealtimeMonitor() {
  const [data, setData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isLive, setIsLive] = useState(true)
  const intervalRef = useRef(null)

  const fetchData = async () => {
    try {
      const res = await adminAPI.realtime()
      setData(res.data)
      setLastUpdated(new Date())
    } catch {}
  }

  useEffect(() => {
    fetchData()
    if (isLive) {
      intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL)
    }
    return () => clearInterval(intervalRef.current)
  }, [isLive])

  const toggleLive = () => {
    setIsLive(prev => {
      if (!prev) fetchData()
      return !prev
    })
  }

  if (!data) return <div className={styles.loading}><FiRefreshCw size={24} className={styles.spin} /> Loading live data...</div>

  const { recent_scans, hourly, stats } = data

  // Pie chart data
  const diseaseCount = recent_scans.filter(s => s.predicted_disease !== 'Healthy').length
  const healthyCount = recent_scans.filter(s => s.predicted_disease === 'Healthy').length
  const pieData = [
    { name: 'Healthy', value: healthyCount },
    { name: 'Disease', value: diseaseCount },
  ].filter(d => d.value > 0)

  // Hourly chart data — fill missing hours
  const hourlyMap = {}
  hourly.forEach(h => { hourlyMap[h.hour] = h })
  const hourlyFull = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    total: hourlyMap[i]?.cnt || 0,
    disease: hourlyMap[i]?.disease_cnt || 0,
  }))

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Real-Time Disease Monitoring</div>
          <div className={styles.subtitle}>
            Live dashboard — auto-refreshes every 10 seconds
            {lastUpdated && <span> · Last updated: {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </div>
        <div className={styles.controls}>
          <div className={`${styles.liveDot} ${isLive ? styles.liveOn : styles.liveOff}`} />
          <button className={`${styles.liveBtn} ${isLive ? styles.liveBtnOn : ''}`} onClick={toggleLive}>
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button className={styles.refreshBtn} onClick={fetchData}>
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Live stats */}
      <div className={styles.statsRow}>
        {[
          { label: 'Scans Today',      value: stats.total_scans_today, icon: <MdOutlineHealthAndSafety size={20} />, color: '#1a6b3c' },
          { label: 'Disease Detected', value: stats.disease_today,     icon: <FiAlertTriangle size={20} />,         color: '#c0392b' },
          { label: 'Active Farmers',   value: stats.active_farmers,    icon: <FiUsers size={20} />,                 color: '#1a5276', sub: 'last 1 hour' },
          { label: 'Pending Consults', value: stats.pending_consults,  icon: <FiActivity size={20} />,              color: '#d68910' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} style={{ borderLeftColor: s.color }}>
            <div className={styles.statIcon} style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
            <div>
              <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
              {s.sub && <div className={styles.statSub}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        {/* Hourly scan activity */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Scan Activity — Last 24 Hours</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourlyFull} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="diseaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c0392b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c0392b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text3)' }} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total" name="Total Scans" stroke="#1a6b3c" fill="url(#totalGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="disease" name="Disease" stroke="#c0392b" fill="url(#diseaseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Disease distribution pie */}
        <div className={styles.chartCard} style={{ maxWidth: 280 }}>
          <div className={styles.chartTitle}>Detection Results (Last 20)</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'Healthy' ? '#1a6b3c' : '#c0392b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className={styles.noData}>No scan data yet</div>}
        </div>
      </div>

      {/* Live feed */}
      <div className={styles.feedCard}>
        <div className={styles.feedHeader}>
          <div className={styles.feedTitle}>
            <div className={`${styles.liveDot} ${isLive ? styles.liveOn : styles.liveOff}`} />
            Live Scan Feed
          </div>
          <span className={styles.feedCount}>{recent_scans.length} recent scans</span>
        </div>
        <div className={styles.feedList}>
          {recent_scans.length === 0 && <div className={styles.noData}>No scans yet.</div>}
          {recent_scans.map((s, i) => {
            const isHealthy = s.predicted_disease === 'Healthy'
            return (
              <div key={i} className={styles.feedItem}>
                <div className={styles.feedDot} style={{ background: isHealthy ? '#1a6b3c' : '#c0392b' }} />
                <div className={styles.feedInfo}>
                  <span className={styles.feedFarmer}>{s.farmer}</span>
                  {s.location && <span className={styles.feedLocation}>{s.location}</span>}
                </div>
                <div className={styles.feedDisease} style={{ color: isHealthy ? '#1a6b3c' : '#c0392b' }}>
                  {s.predicted_disease}
                </div>
                <div className={styles.feedConf}>{s.confidence}%</div>
                <div className={styles.feedTime}>{s.scanned_at?.slice(11, 16)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
