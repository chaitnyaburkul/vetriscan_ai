from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import query
from auth_utils import hash_password, verify_password, create_token

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str
    expected_role: str = ""   # portal role — enforced if provided


class SignupRequest(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    password: str
    role: str
    farm_name: str = ""
    location: str = ""
    cattle_count: int = 0
    specialization: str = ""
    license_number: str = ""
    experience_years: int = 0


@router.post("/login")
def login(req: LoginRequest):
    user = query("SELECT * FROM users WHERE email=%s", (req.email,), fetch_one=True)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    if not user["is_approved"]:
        raise HTTPException(status_code=403, detail="Account pending approval")

    # Enforce portal role — reject if wrong portal
    if req.expected_role and user["role"] != req.expected_role:
        raise HTTPException(
            status_code=403,
            detail=f"This is a {user['role'].upper()} account. Please use the {user['role']} login portal."
        )

    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "phone": user["phone"],
        }
    }


@router.post("/signup")
def signup(req: SignupRequest):
    existing = query("SELECT id FROM users WHERE email=%s", (req.email,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    is_approved = 0 if req.role == "doctor" else 1
    hashed = hash_password(req.password)

    uid = query(
        "INSERT INTO users (full_name, email, phone, password_hash, role, is_approved) VALUES (%s,%s,%s,%s,%s,%s)",
        (req.full_name, req.email, req.phone, hashed, req.role, is_approved),
    )

    if req.role == "farmer":
        query(
            "INSERT INTO farmer_profiles (user_id, farm_name, location, cattle_count) VALUES (%s,%s,%s,%s)",
            (uid, req.farm_name, req.location, req.cattle_count),
        )
    elif req.role == "doctor":
        query(
            "INSERT INTO doctor_profiles (user_id, specialization, license_number, experience_years, available) VALUES (%s,%s,%s,%s,1)",
            (uid, req.specialization, req.license_number, req.experience_years),
        )

    msg = "Registration successful! Awaiting admin approval." if req.role == "doctor" else "Registration successful!"
    return {"message": msg}
