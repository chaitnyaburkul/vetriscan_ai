import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cattleAPI } from '../api'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { GiCow } from 'react-icons/gi'
import styles from './CattleManager.module.css'

const EMPTY_FORM = { tag_id: '', name: '', breed: '', age_years: 0, gender: 'female', weight_kg: 0, notes: '' }
const EMPTY_VAX  = { cattle_id: '', vaccine_name: '', given_date: '', next_due_date: '', notes: '' }

export default function CattleManager() {
  const { t } = useTranslation()
  const [cattle, setCattle] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [vaxForm, setVaxForm] = useState(EMPTY_VAX)
  const [selectedCattle, setSelectedCattle] = useState(null)
  const [vaccinations, setVaccinations] = useState([])
  const [showVaxForm, setShowVaxForm] = useState(false)

  const load = () => {
    cattleAPI.getAll().then(r => setCattle(r.data)).catch(() => {})
    cattleAPI.upcoming().then(r => setUpcoming(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const loadVax = (id) => {
    cattleAPI.getVaccinations(id).then(r => setVaccinations(r.data)).catch(() => {})
  }

  const saveCattle = async () => {
    if (!form.name.trim()) { toast.error('Cattle name is required'); return }
    try {
      if (editId) {
        await cattleAPI.update(editId, form)
        toast.success('Cattle updated!')
      } else {
        await cattleAPI.add(form)
        toast.success('Cattle registered!')
      }
      setForm(EMPTY_FORM); setEditId(null); setTab('list'); load()
    } catch { toast.error('Failed to save') }
  }

  const deleteCattle = async (id) => {
    if (!window.confirm('Delete this cattle?')) return
    await cattleAPI.remove(id)
    toast.success('Deleted')
    load()
    if (selectedCattle?.id === id) setSelectedCattle(null)
  }

  const startEdit = (c) => {
    setForm({ tag_id: c.tag_id||'', name: c.name, breed: c.breed||'', age_years: c.age_years||0, gender: c.gender||'female', weight_kg: c.weight_kg||0, notes: c.notes||'' })
    setEditId(c.id); setTab('add')
  }

  const saveVax = async () => {
    if (!vaxForm.vaccine_name || !vaxForm.given_date) { toast.error('Vaccine name and date required'); return }
    try {
      await cattleAPI.addVaccination({ ...vaxForm, cattle_id: selectedCattle.id })
      toast.success('Vaccination recorded!')
      setVaxForm(EMPTY_VAX); setShowVaxForm(false)
      loadVax(selectedCattle.id); load()
    } catch { toast.error('Failed to save vaccination') }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleIcon}><GiCow size={20} /></div>
        <div>
          <div className={styles.pageTitleText}>Cattle Management</div>
          <div className={styles.pageTitleSub}>Register and track your cattle health records</div>
        </div>
      </div>

      {/* Upcoming vaccinations alert */}
      {upcoming.length > 0 && (
        <div className={styles.upcomingAlert}>
          <FiAlertTriangle size={15} />
          <strong>{upcoming.length} upcoming vaccination{upcoming.length > 1 ? 's' : ''}:</strong>
          {upcoming.slice(0, 3).map(v => (
            <span key={v.id} className={styles.upcomingItem}>
              {v.cattle_name} — {v.vaccine_name} due {v.next_due_date}
            </span>
          ))}
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'list' ? styles.activeTab : ''}`} onClick={() => setTab('list')}>
          <GiCow size={14} /> My Cattle ({cattle.length})
        </button>
        <button className={`${styles.tab} ${tab === 'add' ? styles.activeTab : ''}`} onClick={() => { setTab('add'); setForm(EMPTY_FORM); setEditId(null) }}>
          <FiPlus size={14} /> {editId ? 'Edit Cattle' : 'Register Cattle'}
        </button>
      </div>

      {/* Cattle list */}
      {tab === 'list' && (
        <div className={styles.content}>
          <div className={styles.cattleList}>
            {cattle.length === 0 && (
              <div className={styles.empty}><GiCow size={32} color="var(--text3)" /><span>No cattle registered yet.</span></div>
            )}
            {cattle.map(c => (
              <div key={c.id}
                className={`${styles.cattleCard} ${selectedCattle?.id === c.id ? styles.cattleCardActive : ''}`}
                onClick={() => { setSelectedCattle(c); loadVax(c.id) }}>
                <div className={styles.cattleHeader}>
                  <div className={styles.cattleIcon}><GiCow size={20} /></div>
                  <div className={styles.cattleInfo}>
                    <div className={styles.cattleName}>{c.name}</div>
                    <div className={styles.cattleMeta}>
                      {c.tag_id && <span>#{c.tag_id}</span>}
                      {c.breed && <span>{c.breed}</span>}
                      <span>{c.age_years} yrs</span>
                      <span>{c.gender}</span>
                    </div>
                  </div>
                  <div className={styles.cattleActions}>
                    <button className={styles.iconBtn} title="Health Certificate"
                      onClick={e => { e.stopPropagation(); window.open(`/api/cattle/${c.id}/certificate`, '_blank') }}>
                      Cert
                    </button>
                    <button className={styles.iconBtn} onClick={e => { e.stopPropagation(); startEdit(c) }}><FiEdit2 size={14} /></button>
                    <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={e => { e.stopPropagation(); deleteCattle(c.id) }}><FiTrash2 size={14} /></button>
                  </div>
                </div>
                <div className={styles.cattleStats}>
                  <span>{c.vaccination_count} vaccinations</span>
                  {c.weight_kg > 0 && <span>{c.weight_kg} kg</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Vaccination panel */}
          {selectedCattle && (
            <div className={styles.vaxPanel}>
              <div className={styles.vaxHeader}>
                <div className={styles.vaxTitle}>Vaccinations — {selectedCattle.name}</div>
                <button className={styles.addVaxBtn} onClick={() => setShowVaxForm(!showVaxForm)}>
                  <FiPlus size={13} /> Add Vaccination
                </button>
              </div>

              {showVaxForm && (
                <div className={styles.vaxForm}>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label>Vaccine Name</label>
                      <input value={vaxForm.vaccine_name} onChange={e => setVaxForm({...vaxForm, vaccine_name: e.target.value})} placeholder="e.g. LSD Vaccine" />
                    </div>
                    <div className={styles.field}>
                      <label>Date Given</label>
                      <input type="date" value={vaxForm.given_date} max={today} onChange={e => setVaxForm({...vaxForm, given_date: e.target.value})} />
                    </div>
                    <div className={styles.field}>
                      <label>Next Due Date</label>
                      <input type="date" value={vaxForm.next_due_date} min={today} onChange={e => setVaxForm({...vaxForm, next_due_date: e.target.value})} />
                    </div>
                  </div>
                  <button className={styles.saveVaxBtn} onClick={saveVax}><FiCheckCircle size={13} /> Save</button>
                </div>
              )}

              <div className={styles.vaxList}>
                {vaccinations.length === 0 && <div className={styles.vaxEmpty}>No vaccinations recorded yet.</div>}
                {vaccinations.map(v => (
                  <div key={v.id} className={styles.vaxItem}>
                    <div className={styles.vaxName}>{v.vaccine_name}</div>
                    <div className={styles.vaxDates}>
                      Given: {v.given_date}
                      {v.next_due_date && <span className={styles.vaxDue}> · Next due: {v.next_due_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit form */}
      {tab === 'add' && (
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.field}><label>Cattle Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ganga" /></div>
            <div className={styles.field}><label>Tag / ID</label>
              <input value={form.tag_id} onChange={e => setForm({...form, tag_id: e.target.value})} placeholder="e.g. C001" /></div>
            <div className={styles.field}><label>Breed</label>
              <input value={form.breed} onChange={e => setForm({...form, breed: e.target.value})} placeholder="e.g. Gir, HF, Jersey" /></div>
            <div className={styles.field}><label>Age (years)</label>
              <input type="number" min="0" step="0.5" value={form.age_years} onChange={e => setForm({...form, age_years: +e.target.value})} /></div>
            <div className={styles.field}><label>Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="female">Female (Cow)</option>
                <option value="male">Male (Bull)</option>
              </select></div>
            <div className={styles.field}><label>Weight (kg)</label>
              <input type="number" min="0" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: +e.target.value})} /></div>
          </div>
          <div className={styles.field}><label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes..." /></div>
          <button className={styles.submitBtn} onClick={saveCattle}>
            <FiCheckCircle size={15} /> {editId ? 'Update Cattle' : 'Register Cattle'}
          </button>
        </div>
      )}
    </div>
  )
}
