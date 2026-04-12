import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { scanAPI } from '../api'
import toast from 'react-hot-toast'
import { FiCheckCircle, FiAlertTriangle, FiUpload, FiCamera, FiZap, FiClock, FiDownload } from 'react-icons/fi'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import styles from './DiseaseDetection.module.css'

export default function DiseaseDetection() {
  const { t } = useTranslation()
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('upload')
  const videoRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [history, setHistory] = useState([])
  const [historyFilter, setHistoryFilter] = useState('all')

  // Load scan history on mount
  useEffect(() => {
    scanAPI.history().then(r => setHistory(r.data)).catch(() => {})
  }, [])

  const onFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImage(f); setPreview(URL.createObjectURL(f)); setResult(null)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      setStreaming(true)
    } catch { toast.error('Camera not available') }
  }

  const capture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      setImage(file); setPreview(URL.createObjectURL(blob)); setResult(null)
      videoRef.current.srcObject?.getTracks().forEach(t => t.stop())
      setStreaming(false)
    }, 'image/jpeg')
  }

  const analyze = async () => {
    if (!image) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', image)
      const res = await scanAPI.predict(fd)
      setResult(res.data)
      // Refresh history after new scan
      scanAPI.history().then(r => setHistory(r.data)).catch(() => {})
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.includes('Low confidence')) {
        toast.error(t('low_confidence'))
      } else if (detail.includes('Model not found')) {
        toast.error('AI model not available. Please contact admin.')
      } else {
        toast.error(detail || t('error_occurred'))
      }
    } finally { setLoading(false) }
  }

  const isHealthy = result?.disease === 'Healthy'
  const severityColor = isHealthy ? 'var(--primary)' : 'var(--red)'

  // PDF report using browser print
  const downloadPDF = (res, imgSrc) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })
    const html = `
      <html><head><title>VetriScan AI Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1a2332; }
        h1 { color: #1a6b3c; border-bottom: 3px solid #1a6b3c; padding-bottom: 8px; }
        .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-weight:700;
          background:${res.disease==='Healthy'?'#d4edda':'#f8d7da'}; color:${res.disease==='Healthy'?'#1a6b3c':'#c0392b'}; }
        table { width:100%; border-collapse:collapse; margin:16px 0; }
        td,th { padding:10px 14px; border:1px solid #d0d7e2; text-align:left; }
        th { background:#f4f6f9; font-weight:700; }
        .footer { margin-top:32px; font-size:12px; color:#888; border-top:1px solid #ddd; padding-top:12px; }
        img { max-width:200px; border-radius:8px; border:1px solid #ddd; }
      </style></head>
      <body>
        <h1>VetriScan AI — Disease Detection Report</h1>
        <p><strong>Date:</strong> ${date} &nbsp;&nbsp; <strong>Farmer:</strong> ${user.full_name}</p>
        ${imgSrc ? `<img src="${imgSrc}" alt="Scanned cattle" />` : ''}
        <table>
          <tr><th>Field</th><th>Result</th></tr>
          <tr><td>Predicted Disease</td><td><span class="badge">${res.disease}</span></td></tr>
          <tr><td>Confidence</td><td>${res.confidence}%</td></tr>
          <tr><td>Severity</td><td>${res.severity}</td></tr>
        </table>
        <p><strong>Description:</strong> ${res.description}</p>
        <p><strong>Recommended Treatment:</strong> ${res.treatment}</p>
        <div class="footer">This report is AI-generated. Always consult a licensed veterinary doctor for final diagnosis. — VetriScan AI</div>
      </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleIcon}><MdOutlineHealthAndSafety size={20} /></div>
        <div>
          <div className={styles.pageTitleText}>{t('disease_detection')}</div>
          <div className={styles.pageTitleSub}>AI-powered Lumpy Skin Disease Detection</div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'upload' ? styles.activeTab : ''}`}
          onClick={() => setTab('upload')}>
          <FiUpload size={14} /> {t('upload_image')}
        </button>
        <button className={`${styles.tab} ${tab === 'camera' ? styles.activeTab : ''}`}
          onClick={() => setTab('camera')}>
          <FiCamera size={14} /> {t('use_camera')}
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.inputArea}>
          {tab === 'upload' ? (
            <label className={styles.dropzone}>
              <input type="file" accept="image/*" onChange={onFile} hidden />
              {preview
                ? <img src={preview} alt="preview" className={styles.preview} />
                : <div className={styles.dropPlaceholder}>
                    <FiUpload size={36} color="var(--text3)" />
                    <div className={styles.dropText}>{t('upload_image')}</div>
                    <div className={styles.dropHint}>JPG, PNG up to 10MB · Click or drag to upload</div>
                  </div>
              }
            </label>
          ) : (
            <div className={styles.cameraArea}>
              <video ref={videoRef} autoPlay className={styles.video}
                style={{ display: streaming ? 'block' : 'none' }} />
              {preview && !streaming && <img src={preview} alt="capture" className={styles.preview} />}
              {!streaming && !preview && (
                <div className={styles.dropPlaceholder}>
                  <FiCamera size={36} color="var(--text3)" />
                  <div className={styles.dropText}>Camera Preview</div>
                </div>
              )}
              <div className={styles.cameraBtns}>
                {!streaming
                  ? <button className={styles.btnSecondary} onClick={startCamera}>
                      <FiCamera size={14} /> Start Camera
                    </button>
                  : <button className={styles.btnPrimary} onClick={capture}>
                      <FiCamera size={14} /> Capture Photo
                    </button>
                }
              </div>
            </div>
          )}

          {preview && (
            <button className={styles.analyzeBtn} onClick={analyze} disabled={loading}>
              <FiZap size={16} />
              {loading ? t('analyzing') : t('analyze')}
            </button>
          )}

          <div className={styles.tipsCard}>
            <div className={styles.tipsTitle}>{t('tips_accuracy')}</div>
            <ul className={styles.tipsList}>
              <li>{t('tip1')}</li>
              <li>{t('tip2')}</li>
              <li>{t('tip3')}</li>
              <li>{t('tip4')}</li>
            </ul>
          </div>
        </div>

    {result && (
          <div className={styles.result}>
            <div className={styles.resultHeader}>
              <div className={styles.resultIcon} style={{ background: `${severityColor}15`, color: severityColor }}>
                {isHealthy ? <FiCheckCircle size={24} /> : <FiAlertTriangle size={24} />}
              </div>
              <div>
                <div className={styles.resultTitle}>Analysis Results</div>
                <div className={styles.resultSub}>AI Model Prediction</div>
              </div>
            </div>

            <div className={styles.resultCard} style={{ borderLeftColor: severityColor }}>
              <div className={styles.disease} style={{ color: severityColor }}>{result.disease}</div>
              <div className={styles.severity}>
                {t('severity')}: <strong style={{ color: severityColor }}>{result.severity}</strong>
              </div>
            </div>

            <div className={styles.confSection}>
              <div className={styles.confHeader}>
                <span className={styles.confLabel}>{t('confidence')}</span>
                <span className={styles.confValue} style={{ color: severityColor }}>{result.confidence}%</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${result.confidence}%`, background: severityColor }} />
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>{t('description')}</div>
                <div className={styles.infoText}>{result.description}</div>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>{t('treatment')}</div>
                <div className={styles.infoText}>{result.treatment}</div>
              </div>
            </div>

            {!isHealthy && (
              <div className={styles.warning}>
                <FiAlertTriangle size={15} />
                {t('high_severity')}
              </div>
            )}

            {/* PDF Download */}
            <button className={styles.pdfBtn} onClick={() => downloadPDF(result, preview)}>
              <FiDownload size={15} /> {t('download_report')}
            </button>
          </div>
        )}
      </div>

      {/* Scan History Gallery */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <FiClock size={15} />
          <span>{t('scan_history')}</span>
          <span className={styles.historyCount}>{history.length} scans</span>
          <select className={styles.historyFilter} value={historyFilter}
            onChange={e => setHistoryFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Lumpy Skin Disease">Disease Only</option>
            <option value="Healthy">Healthy Only</option>
          </select>
        </div>
        {history.length === 0 ? (
          <div className={styles.historyEmpty}>{t('no_scans')}</div>
        ) : (
          <div className={styles.historyGrid}>
            {history
              .filter(s => historyFilter === 'all' || s.predicted_disease === historyFilter)
              .map((s, i) => {
                const healthy = s.predicted_disease === 'Healthy'
                return (
                  <div key={i} className={styles.historyCard}>
                    <div className={styles.historyCardBadge}
                      style={{ background: healthy ? 'var(--primary)' : 'var(--red)' }}>
                      {healthy ? <FiCheckCircle size={11} /> : <FiAlertTriangle size={11} />}
                      {s.predicted_disease === 'Healthy' ? 'Healthy' : 'Disease'}
                    </div>
                    <div className={styles.historyCardBody}>
                      <div className={styles.historyCardDisease}
                        style={{ color: healthy ? 'var(--primary)' : 'var(--red)' }}>
                        {s.predicted_disease}
                      </div>
                      <div className={styles.historyCardConf}>{s.confidence}% confidence</div>
                      <div className={styles.historyCardDate}>{s.scanned_at?.slice(0, 10)}</div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
