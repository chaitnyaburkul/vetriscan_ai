"""Run this to create users in the new vetriscai_react_db"""
import sys
sys.path.insert(0, '.')
from auth_utils import hash_password
from database import query

def create_user(full_name, email, phone, password, role, is_approved=1):
    existing = query("SELECT id FROM users WHERE email=%s", (email,), fetch_one=True)
    if existing:
        print(f"  Already exists: {email} (id={existing['id']})")
        return existing['id']
    h = hash_password(password)
    uid = query(
        "INSERT INTO users (full_name, email, phone, password_hash, role, is_approved) VALUES (%s,%s,%s,%s,%s,%s)",
        (full_name, email, phone, h, role, is_approved)
    )
    print(f"  Created: {email} (id={uid})")
    return uid

print("Seeding vetriscai_react_db...")

# Admin
create_user('Admin', 'admin@vetriscai.com', '0000000000', 'admin123', 'admin')

# Doctor
doc_id = create_user('Dr. Rajesh Kumar', 'doctor@vetriscai.com', '9876543210', 'doctor123', 'doctor')
existing_dp = query("SELECT id FROM doctor_profiles WHERE user_id=%s", (doc_id,), fetch_one=True)
if not existing_dp:
    query("INSERT INTO doctor_profiles (user_id, specialization, license_number, experience_years, available) VALUES (%s,%s,%s,%s,%s)",
          (doc_id, 'Bovine Medicine and Surgery', 'VET-MH-2024-001', 8, 1))

# Farmers
bhim_id = create_user('Bhim', 'rathodbhim86@gmail.com', '', 'bhim123', 'farmer')
existing_fp = query("SELECT id FROM farmer_profiles WHERE user_id=%s", (bhim_id,), fetch_one=True)
if not existing_fp:
    query("INSERT INTO farmer_profiles (user_id, farm_name, location, cattle_count) VALUES (%s,%s,%s,%s)",
          (bhim_id, '', '', 0))

test_id = create_user('Test Farmer', 'testfarmer@test.com', '', 'test123', 'farmer')
existing_fp2 = query("SELECT id FROM farmer_profiles WHERE user_id=%s", (test_id,), fetch_one=True)
if not existing_fp2:
    query("INSERT INTO farmer_profiles (user_id, farm_name, location, cattle_count) VALUES (%s,%s,%s,%s)",
          (test_id, 'Test Farm', 'Pune', 5))

print("\nDone! All users created.")
print("\nLogin credentials:")
print("  Admin  : admin@vetriscai.com / admin123")
print("  Doctor : doctor@vetriscai.com / doctor123")
print("  Farmer : rathodbhim86@gmail.com / bhim123")
print("  Farmer : testfarmer@test.com / test123")
