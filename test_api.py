import requests

base = 'http://localhost:8000/api'
tests = []

r = requests.post(f'{base}/auth/login', json={'email':'testfarmer@test.com','password':'test123'})
farmer_token = r.json().get('token','')
tests.append(('Farmer Login', r.status_code == 200))

r = requests.post(f'{base}/auth/login', json={'email':'admin@vetriscai.com','password':'admin123'})
admin_token = r.json().get('token','')
tests.append(('Admin Login', r.status_code == 200))

h_farmer = {'Authorization': f'Bearer {farmer_token}'}
h_admin  = {'Authorization': f'Bearer {admin_token}'}

r = requests.get(f'{base}/users/me', headers=h_farmer)
tests.append(('Get Profile', r.status_code == 200))

r = requests.get(f'{base}/scans/history', headers=h_farmer)
tests.append(('Scan History', r.status_code == 200))

r = requests.get(f'{base}/consultations/doctors', headers=h_farmer)
tests.append(('Get Doctors', r.status_code == 200))

r = requests.get(f'{base}/consultations/my', headers=h_farmer)
tests.append(('My Consultations', r.status_code == 200))

r = requests.get(f'{base}/admin/stats', headers=h_admin)
tests.append(('Admin Stats', r.status_code == 200))

r = requests.get(f'{base}/admin/users', headers=h_admin)
tests.append(('Admin Users', r.status_code == 200))

print('=== API Test Results ===')
for name, ok in tests:
    status = 'PASS' if ok else 'FAIL'
    print(f'  {status} - {name}')
print(f'Passed: {sum(1 for _,ok in tests if ok)}/{len(tests)}')
