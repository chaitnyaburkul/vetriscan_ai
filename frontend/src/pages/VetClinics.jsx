import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMapPin, FiSearch, FiPhone, FiNavigation } from 'react-icons/fi'
import { MdOutlineLocalHospital } from 'react-icons/md'
import styles from './VetClinics.module.css'

// Leaflet CSS injected dynamically
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

export default function VetClinics() {
  const { t } = useTranslation()
  const [location, setLocation] = useState(null)
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchCity, setSearchCity] = useState('')

  // Inject Leaflet CSS
  useEffect(() => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
  }, [])

  const fetchClinics = async (lat, lon) => {
    setLoading(true)
    setError('')
    try {
      // Overpass API — free, no key needed
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="veterinary"](around:15000,${lat},${lon});
          node["amenity"="animal_hospital"](around:15000,${lat},${lon});
          node["healthcare"="veterinary"](around:15000,${lat},${lon});
        );
        out body;
      `
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      })
      const json = await res.json()
      const results = json.elements.map(el => ({
        id: el.id,
        name: el.tags?.name || 'Veterinary Clinic',
        lat: el.lat,
        lon: el.lon,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
        address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || null,
        opening: el.tags?.opening_hours || null,
      }))
      setClinics(results)
      if (results.length === 0) setError('No veterinary clinics found within 15km. Try a different location.')
    } catch {
      setError('Failed to fetch clinics. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser.'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lon: longitude })
        fetchClinics(latitude, longitude)
        initMap(latitude, longitude)
      },
      () => { setError('Location access denied. Please enter a city name.'); setLoading(false) }
    )
  }

  const searchByCity = async () => {
    if (!searchCity.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchCity)}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) { setError('City not found. Try a different name.'); setLoading(false); return }
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      setLocation({ lat, lon })
      fetchClinics(lat, lon)
      initMap(lat, lon)
    } catch {
      setError('Search failed. Please try again.')
      setLoading(false)
    }
  }

  const initMap = (lat, lon) => {
    setTimeout(() => {
      if (typeof window === 'undefined') return
      import('leaflet').then(L => {
        const mapEl = document.getElementById('vet-map')
        if (!mapEl) return
        if (mapEl._leaflet_id) {
          mapEl._leaflet_id = null
          mapEl.innerHTML = ''
        }
        const map = L.default.map('vet-map').setView([lat, lon], 13)
        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map)

        // User location marker
        const userIcon = L.default.divIcon({
          html: '<div style="background:#1a6b3c;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7]
        })
        L.default.marker([lat, lon], { icon: userIcon }).addTo(map).bindPopup('Your Location')

        // Clinic markers — added after clinics load
        window._vetMap = map
        window._L = L.default
        setMapLoaded(true)
      })
    }, 300)
  }

  // Add clinic markers when clinics update
  useEffect(() => {
    if (!window._vetMap || !window._L || !clinics.length) return
    const L = window._L
    const map = window._vetMap
    clinics.forEach(c => {
      const icon = L.divIcon({
        html: `<div style="background:#c0392b;color:white;padding:3px 7px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">+Vet</div>`,
        iconAnchor: [20, 10]
      })
      L.marker([c.lat, c.lon], { icon }).addTo(map)
        .bindPopup(`<b>${c.name}</b>${c.address ? `<br>${c.address}` : ''}${c.phone ? `<br>📞 ${c.phone}` : ''}`)
    })
  }, [clinics])

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleIcon}><MdOutlineLocalHospital size={20} /></div>
        <div>
          <div className={styles.pageTitleText}>Nearby Veterinary Clinics</div>
          <div className={styles.pageTitleSub}>Find certified veterinary clinics near you</div>
        </div>
      </div>

      {/* Search controls */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <FiSearch size={15} />
          <input value={searchCity} onChange={e => setSearchCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchByCity()}
            placeholder="Enter city or district name (e.g. Pune, Nashik)..." />
        </div>
        <button className={styles.searchBtn} onClick={searchByCity} disabled={loading}>Search</button>
        <button className={styles.locationBtn} onClick={useMyLocation} disabled={loading}>
          <FiNavigation size={14} /> Use My Location
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loadingMsg}><FiSearch size={14} /> Searching for veterinary clinics...</div>}

      {/* Map */}
      {location && (
        <div id="vet-map" className={styles.map} />
      )}

      {!location && !loading && (
        <div className={styles.placeholder}>
          <MdOutlineLocalHospital size={48} color="var(--text3)" />
          <div>Search for a city or use your location to find nearby veterinary clinics</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 4 }}>
            Powered by OpenStreetMap — No API key required
          </div>
        </div>
      )}

      {/* Clinic list */}
      {clinics.length > 0 && (
        <div className={styles.clinicList}>
          <div className={styles.clinicListTitle}>
            Found {clinics.length} veterinary clinic{clinics.length > 1 ? 's' : ''} within 15km
          </div>
          {clinics.map(c => (
            <div key={c.id} className={styles.clinicCard}>
              <div className={styles.clinicIcon}><MdOutlineLocalHospital size={18} /></div>
              <div className={styles.clinicInfo}>
                <div className={styles.clinicName}>{c.name}</div>
                {c.address && <div className={styles.clinicAddress}><FiMapPin size={11} /> {c.address}</div>}
                {c.phone && <div className={styles.clinicPhone}><FiPhone size={11} /> {c.phone}</div>}
                {c.opening && <div className={styles.clinicHours}>{c.opening}</div>}
              </div>
              <a href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}&zoom=16`}
                target="_blank" rel="noreferrer" className={styles.dirBtn}>
                <FiNavigation size={13} /> Directions
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
