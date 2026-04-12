import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { consultAPI, scanAPI } from '../api'
import toast from 'react-hot-toast'
import { FiSend, FiUser, FiCheckCircle, FiClock, FiLock, FiPlus, FiMessageSquare, FiX, FiStar } from 'react-icons/fi'
import { MdOutlineLocalHospital, MdOutlineHealthAndSafety } from 'react-icons/md'
import { GiCow } from 'react-icons/gi'
import styles from './Consultation.module.css'

// ── Star Rating Widget ─────────────────────────────────────────
function RatingWidget({ consultationId, onRated }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [review, setReview] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    consultAPI.getRating(consultationId).then(r => {
      if (r.data?.rating) { setExisting(r.data); setSubmitted(true) }
    }).catch(() => {})
  }, [consultationId])

  const submit = async () => {
    if (!rating) { toast.error('Please select a rating'); return }
    try {
      await consultAPI.rate(consultationId, { rating, review })
      setSubmitted(true)
      setExisting({ rating, review })
      toast.success('Rating submitted!')
      onRated?.()
    } catch { toast.error('Failed to submit rating') }
  }

  if (submitted && existing) {
    return (
      <div className={styles.ratingDisplay}>
        <span className={styles.ratingLabel}>Your Rating:</span>
        {[1,2,3,4,5].map(s => (
          <FiStar key={s} size={16} fill={s <= existing.rating ? '#f39c12' : 'none'}
            color={s <= existing.rating ? '#f39c12' : 'var(--text3)'} />
        ))}
        {existing.review && <span className={styles.ratingReview}>"{existing.review}"</span>}
      </div>
    )
  }

  return (
    <div className={styles.ratingBox}>
      <div className={styles.ratingLabel}>Rate this consultation:</div>
      <div className={styles.stars}>
        {[1,2,3,4,5].map(s => (
          <FiStar key={s} size={20} style={{ cursor:'pointer' }}
            fill={s <= (hover || rating) ? '#f39c12' : 'none'}
            color={s <= (hover || rating) ? '#f39c12' : 'var(--text3)'}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)} />
        ))}
      </div>
      <input className={styles.reviewInput2} value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="Optional review..." />
      <button className={styles.rateBtn} onClick={submit}>Submit Rating</button>
    </div>
  )
}

// ── Prescription Form (doctor only) ───────────────────────────
function PrescriptionForm({ consultationId, onSent }) {
  const [show, setShow] = useState(false)
  const [prescription, setPrescription] = useState('')
  const [notes, setNotes] = useState('')

  const submit = async () => {
    if (!prescription.trim()) { toast.error('Prescription cannot be empty'); return }
    try {
      await consultAPI.addPrescription(consultationId, { prescription, notes })
      toast.success('Prescription sent!')
      setPrescription(''); setNotes(''); setShow(false)
      onSent?.()
    } catch { toast.error('Failed to send prescription') }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg3)' }}>
      <button onClick={() => setShow(!show)}
        style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        {show ? '▲ Hide Prescription' : '+ Add Prescription / Treatment Notes'}
      </button>
      {show && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea rows={3} value={prescription} onChange={e => setPrescription(e.target.value)}
            placeholder="Prescription (medicines, dosage, duration)..."
            style={{ padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes (optional)..."
            style={{ padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
          <button onClick={submit}
            style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '0.82rem', alignSelf: 'flex-start' }}>
            Send Prescription
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared chat component ──────────────────────────────────────
function ChatPanel({ consultation, currentRole, onClose }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const bottomRef = useRef(null)

  const fetchMessages = () => {
    consultAPI.getMessages(consultation.id).then(r => setMessages(r.data)).catch(() => {})
  }

  useEffect(() => {
    fetchMessages()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [consultation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendReply = async () => {
    if (!reply.trim()) return
    await consultAPI.sendMessage(consultation.id, reply)
    setReply('')
    fetchMessages()
  }

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatPanelHeader}>
        <div>
          <div className={styles.chatPanelTitle}>
            {currentRole === 'farmer'
              ? `Chat with Dr. ${consultation.doctor_name || 'Doctor'}`
              : `Patient: ${consultation.farmer_name || 'Farmer'}`}
          </div>
          <div className={styles.chatPanelSub}>Consultation #{consultation.id}</div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}><FiX size={16} /></button>
      </div>

      {consultation.predicted_disease && (
        <div className={styles.scanBadge}>
          <MdOutlineHealthAndSafety size={13} />
          AI Scan: {consultation.predicted_disease} — {consultation.confidence}% confidence
        </div>
      )}

      <div className={styles.chatMessages}>
        {messages.length === 0 && <div className={styles.chatEmpty}>No messages yet.</div>}
        {messages.map((m, i) => {
          const isMe = m.role === currentRole
          const isPrescription = m.message?.startsWith('[PRESCRIPTION]')
          if (isPrescription) {
            return (
              <div key={i} className={styles.prescriptionMsg}>
                <div className={styles.prescriptionTitle}>Prescription from Dr. {m.full_name}</div>
                <div className={styles.prescriptionText}>
                  {m.message.replace('[PRESCRIPTION]\n', '').replace('[NOTES]\n', '\nNotes: ')}
                </div>
                <div className={styles.msgTime}>{m.sent_at?.slice(11, 16)}</div>
              </div>
            )
          }
          return (
            <div key={i} className={`${styles.msgRow} ${isMe ? styles.myMsg : styles.theirMsg}`}>
              {!isMe && <div className={styles.msgAvatar}><GiCow size={12} /></div>}
              <div className={`${styles.msgBubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                <div className={styles.msgSender}>{isMe ? 'You' : m.full_name}</div>
                <div className={styles.msgText}>{m.message}</div>
                <div className={styles.msgTime}>{m.sent_at?.slice(11, 16)}</div>
              </div>
              {isMe && <div className={styles.msgAvatar} style={{ background: 'var(--blue)' }}><FiUser size={12} /></div>}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {consultation.status !== 'closed' && (
        <div className={styles.replyRow}>
          <input value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendReply()}
            placeholder={t('type_message')} className={styles.replyInput} />
          <button className={styles.replyBtn} onClick={sendReply}><FiSend size={14} /></button>
        </div>
      )}
      {currentRole === 'doctor' && consultation.status !== 'closed' && (
        <PrescriptionForm consultationId={consultation.id} onSent={fetchMessages} />
      )}
    </div>
  )
}

// ── Farmer view ────────────────────────────────────────────────
function FarmerView() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('new')
  const [doctors, setDoctors] = useState([])
  const [scans, setScans] = useState([])
  const [consultations, setConsultations] = useState([])
  const [form, setForm] = useState({ doctor_id: '', message: '', scan_id: null })
  const [submitted, setSubmitted] = useState(false)
  const [activeChat, setActiveChat] = useState(null)

  const load = () => {
    consultAPI.getDoctors().then(r => setDoctors(r.data)).catch(() => {})
    scanAPI.history().then(r => setScans(r.data)).catch(() => {})
    consultAPI.getMy().then(r => setConsultations(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.doctor_id || !form.message.trim()) { toast.error('Please fill all fields'); return }
    try {
      await consultAPI.request({ doctor_id: +form.doctor_id, message: form.message, scan_id: form.scan_id || null })
      setSubmitted(true)
      consultAPI.getMy().then(r => setConsultations(r.data))
    } catch { toast.error(t('error_occurred')) }
  }

  const statusConfig = {
    pending: { color: '#d68910', icon: <FiClock size={13} />,       label: 'Pending' },
    replied: { color: 'var(--primary)', icon: <FiCheckCircle size={13} />, label: 'Replied' },
    closed:  { color: 'var(--text3)', icon: <FiLock size={13} />,   label: 'Closed' },
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleIcon}><MdOutlineLocalHospital size={20} /></div>
        <div>
          <div className={styles.pageTitleText}>{t('consult_doctor')}</div>
          <div className={styles.pageTitleSub}>Connect with certified veterinary doctors</div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'new' ? styles.activeTab : ''}`}
          onClick={() => { setTab('new'); setSubmitted(false) }}>
          <FiPlus size={14} /> {t('new_consultation')}
        </button>
        <button className={`${styles.tab} ${tab === 'my' ? styles.activeTab : ''}`}
          onClick={() => setTab('my')}>
          <FiMessageSquare size={14} /> {t('my_consultations')}
          {consultations.length > 0 && <span className={styles.badge}>{consultations.length}</span>}
        </button>
      </div>

      {tab === 'new' && (
        submitted ? (
          <div className={styles.successCard}>
            <div className={styles.successIcon}><FiCheckCircle size={40} /></div>
            <h2 className={styles.successTitle}>{t('request_submitted')}</h2>
            <p className={styles.successMsg}>{t('request_sent_msg')}</p>
            <button className={styles.btnPrimary} onClick={() => { setSubmitted(false); setTab('my') }}>
              View My Consultations
            </button>
          </div>
        ) : (
          <div className={styles.formCard}>
            <div className={styles.field}>
              <label>{t('select_doctor')}</label>
              <select value={form.doctor_id} onChange={e => setForm({...form, doctor_id: e.target.value})}>
                <option value="">-- Select a Doctor --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name} — {d.specialization || 'General'} ({d.experience_years || 0} yrs) ✓ Available
                  </option>
                ))}
              </select>
              {doctors.length === 0 && <span className={styles.fieldHint}>No doctors available right now. Please try again later.</span>}
            </div>
            <div className={styles.field}>
              <label>{t('attach_scan')}</label>
              <select value={form.scan_id || ''} onChange={e => setForm({...form, scan_id: e.target.value || null})}>
                <option value="">None</option>
                {scans.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.predicted_disease} ({s.confidence}%) — {s.scanned_at?.slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t('describe_condition')}</label>
              <textarea rows={4} value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
                placeholder="e.g. My cow has skin nodules and fever since 3 days..." />
            </div>
            <button className={styles.submitBtn} onClick={submit}>
              <FiSend size={15} /> {t('send_request')}
            </button>
          </div>
        )
      )}

      {tab === 'my' && (
        <div className={styles.splitView}>
          <div className={styles.list}>
            {consultations.length === 0 && (
              <div className={styles.empty}><MdOutlineLocalHospital size={28} color="var(--text3)" /><span>{t('no_consultations')}</span></div>
            )}
            {consultations.map(c => {
              const sc = statusConfig[c.status] || statusConfig.pending
              return (
                <div key={c.id}
                  className={`${styles.consultCard} ${activeChat?.id === c.id ? styles.consultCardActive : ''}`}
                  onClick={() => setActiveChat(activeChat?.id === c.id ? null : c)}>
                  <div className={styles.consultHeader}>
                    <div className={styles.consultInfo}>
                      <div className={styles.consultTitle}>#{c.id} — Dr. {c.doctor_name || 'Doctor'}</div>
                      <div className={styles.consultMeta}>{c.created_at?.slice(0, 10)}</div>
                    </div>
                    <div className={styles.statusBadge} style={{ color: sc.color, borderColor: `${sc.color}40`, background: `${sc.color}10` }}>
                      {sc.icon} {sc.label}
                    </div>
                  </div>
                  {c.predicted_disease && (
                    <div className={styles.scanBadge}>
                      <MdOutlineHealthAndSafety size={13} /> {c.predicted_disease} — {c.confidence}%
                    </div>
                  )}
                  {c.status === 'closed' && (
                    <RatingWidget consultationId={c.id} onRated={load} />
                  )}
                </div>
              )
            })}
          </div>
          {activeChat && (
            <ChatPanel consultation={activeChat} currentRole="farmer" onClose={() => setActiveChat(null)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Doctor view ────────────────────────────────────────────────
function DoctorView() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('pending')
  const [consultations, setConsultations] = useState([])
  const [activeChat, setActiveChat] = useState(null)

  const load = () => consultAPI.getMy().then(r => setConsultations(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const pending = consultations.filter(c => c.status === 'pending')
  const all     = consultations

  const closeCase = async (id) => {
    await consultAPI.close(id)
    load()
    if (activeChat?.id === id) setActiveChat(null)
  }

  const statusConfig = {
    pending: { color: '#d68910', label: 'Pending' },
    replied: { color: 'var(--primary)', label: 'Replied' },
    closed:  { color: 'var(--text3)', label: 'Closed' },
  }

  const list = tab === 'pending' ? pending : all

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleIcon}><MdOutlineLocalHospital size={20} /></div>
        <div>
          <div className={styles.pageTitleText}>Patient Consultations</div>
          <div className={styles.pageTitleSub}>Review and respond to patient cases</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className={styles.pendingAlert}>
          <FiClock size={15} />
          {pending.length} pending case{pending.length > 1 ? 's' : ''} waiting for your reply
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'pending' ? styles.activeTab : ''}`}
          onClick={() => setTab('pending')}>
          <FiClock size={14} /> Pending ({pending.length})
        </button>
        <button className={`${styles.tab} ${tab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setTab('all')}>
          <FiMessageSquare size={14} /> All Cases ({all.length})
        </button>
      </div>

      <div className={styles.splitView}>
        <div className={styles.list}>
          {list.length === 0 && (
            <div className={styles.empty}><FiCheckCircle size={24} color="var(--primary)" /><span>No cases here.</span></div>
          )}
          {list.map(c => {
            const sc = statusConfig[c.status] || statusConfig.pending
            return (
              <div key={c.id}
                className={`${styles.consultCard} ${activeChat?.id === c.id ? styles.consultCardActive : ''}`}
                onClick={() => setActiveChat(activeChat?.id === c.id ? null : c)}>
                <div className={styles.consultHeader}>
                  <div className={styles.consultInfo}>
                    <div className={styles.consultTitle}>{c.farmer_name}</div>
                    <div className={styles.consultMeta}>#{c.id} · {c.created_at?.slice(0, 10)}</div>
                  </div>
                  <div className={styles.statusBadge} style={{ color: sc.color, borderColor: `${sc.color}40`, background: `${sc.color}10` }}>
                    {sc.label}
                  </div>
                </div>
                {c.predicted_disease && (
                  <div className={styles.scanBadge}>
                    <MdOutlineHealthAndSafety size={13} /> {c.predicted_disease} — {c.confidence}%
                  </div>
                )}
                {c.status !== 'closed' && activeChat?.id === c.id && (
                  <button className={styles.closeCase} onClick={e => { e.stopPropagation(); closeCase(c.id) }}>
                    <FiLock size={12} /> Close Case
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {activeChat && (
          <ChatPanel consultation={activeChat} currentRole="doctor" onClose={() => setActiveChat(null)} />
        )}
      </div>
    </div>
  )
}

// ── Entry point ────────────────────────────────────────────────
export default function Consultation() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'doctor' ? <DoctorView /> : <FarmerView />
}
