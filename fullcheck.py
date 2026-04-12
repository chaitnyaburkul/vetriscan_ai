import requests

base = 'http://localhost:8000/api'

# Login
r = requests.post(f'{base}/auth/login', json={'email':'admin@vetriscai.com','password':'admin123'}, timeout=5)
at = r.json().get('token','')
r2 = requests.post(f'{base}/auth/login', json={'email':'testfarmer@test.com','password':'test123'}, timeout=5)
ft = r2.json().get('token','')
r3 = requests.post(f'{base}/auth/login', json={'email':'doctor@vetriscai.com','password':'doctor123'}, timeout=5)
dt = r3.json().get('token','')

ha = {'Authorization': f'Bearer {at}'}
hf = {'Authorization': f'Bearer {ft}'}
hd = {'Authorization': f'Bearer {dt}'}

tests = [
    ('Admin Login',          r.status_code == 200),
    ('Farmer Login',         r2.status_code == 200),
    ('Doctor Login',         r3.status_code == 200),
]

endpoints = [
    (f'{base}/users/me',                    hf, 'Farmer /me'),
    (f'{base}/scans/history',               hf, 'Scan History'),
    (f'{base}/consultations/doctors',       hf, 'Get Doctors'),
    (f'{base}/consultations/my',            hf, 'My Consultations'),
    (f'{base}/consultations/unread-count',  hf, 'Unread Count'),
    (f'{base}/users/tips',                  hf, 'Tips API'),
    (f'{base}/cattle',                      hf, 'Cattle List'),
    (f'{base}/cattle/upcoming-vaccinations',hf, 'Upcoming Vax'),
    (f'{base}/admin/stats',                 ha, 'Admin Stats'),
    (f'{base}/admin/analytics',             ha, 'Admin Analytics'),
    (f'{base}/admin/realtime',              ha, 'Admin Realtime'),
    (f'{base}/admin/outbreak-alerts',       ha, 'Outbreak Alerts'),
    (f'{base}/admin/users',                 ha, 'Admin Users'),
    (f'{base}/admin/consultations',         ha, 'Admin Consultations'),
    (f'{base}/admin/scans',                 ha, 'Admin Scans'),
    (f'{base}/users/me',                    hd, 'Doctor /me'),
    (f'{base}/consultations/my',            hd, 'Doctor Consultations'),
]

for url, h, name in endpoints:
    try:
        rv = requests.get(url, headers=h, timeout=5)
        tests.append((name, rv.status_code == 200))
        if rv.status_code != 200:
            print(f'  ERROR {name}: {rv.status_code} — {rv.text[:80]}')
    except Exception as e:
        tests.append((name, False))
        print(f'  EXCEPTION {name}: {str(e)[:60]}')

print('\n=== Full API Check ===')
passed = sum(1 for _, ok in tests if ok)
for name, ok in tests:
    print(f"  {'PASS' if ok else 'FAIL'} {name}")
print(f'\n{passed}/{len(tests)} passed')
