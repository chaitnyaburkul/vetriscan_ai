import requests

base = 'http://localhost:8000/api'
results = []

r  = requests.post(f'{base}/auth/login', json={'email':'testfarmer@test.com','password':'test123'}, timeout=5)
r2 = requests.post(f'{base}/auth/login', json={'email':'admin@vetriscai.com','password':'admin123'}, timeout=5)
r3 = requests.post(f'{base}/auth/login', json={'email':'doctor@vetriscai.com','password':'doctor123'}, timeout=5)

results.append(('Farmer Login', r.status_code))
results.append(('Admin Login',  r2.status_code))
results.append(('Doctor Login', r3.status_code))

ft = r.json().get('token','')  if r.status_code  == 200 else ''
at = r2.json().get('token','') if r2.status_code == 200 else ''
hf = {'Authorization': 'Bearer ' + ft}
ha = {'Authorization': 'Bearer ' + at}

endpoints = [
    (f'{base}/users/me',               hf, 'Farmer /me'),
    (f'{base}/scans/history',          hf, 'Scan History'),
    (f'{base}/consultations/doctors',  hf, 'Get Doctors'),
    (f'{base}/consultations/my',       hf, 'My Consultations'),
    (f'{base}/users/tips',             hf, 'Tips API'),
    (f'{base}/admin/stats',            ha, 'Admin Stats'),
    (f'{base}/admin/analytics',        ha, 'Admin Analytics'),
    (f'{base}/admin/users',            ha, 'Admin Users'),
    (f'{base}/admin/pending-doctors',  ha, 'Pending Doctors'),
    (f'{base}/admin/consultations',    ha, 'Admin Consultations'),
    (f'{base}/users/chat-history',     hf, 'Chat History'),
]

for url, h, name in endpoints:
    try:
        rv = requests.get(url, headers=h, timeout=5)
        results.append((name, rv.status_code))
        if rv.status_code != 200:
            print('  ERROR detail:', rv.text[:120])
    except Exception as e:
        results.append((name, 'ERR'))
        print('  EXCEPTION:', str(e)[:80])

print('\n=== Results ===')
passed = 0
for name, code in results:
    ok = code == 200
    if ok:
        passed += 1
    print(f"  {'PASS' if ok else 'FAIL'} [{code}] {name}")
print(f'\n{passed}/{len(results)} passed')
