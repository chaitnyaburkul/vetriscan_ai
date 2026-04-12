from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth_utils import get_current_user
from database import query
from datetime import date

router = APIRouter()


class ProfileUpdate(BaseModel):
    farm_name: str = ""
    location: str = ""
    cattle_count: int = 0


class DoctorProfileUpdate(BaseModel):
    specialization: str = ""
    license_number: str = ""
    experience_years: int = 0
    available: bool = True


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    uid = int(user["sub"])
    u = query("SELECT id, full_name, email, phone, role FROM users WHERE id=%s", (uid,), fetch_one=True)
    if not u:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="User not found. Please login again.")
    if user["role"] == "farmer":
        profile = query("SELECT * FROM farmer_profiles WHERE user_id=%s", (uid,), fetch_one=True)
        scans   = query("SELECT COUNT(*) as cnt FROM scans WHERE farmer_id=%s", (uid,), fetch_one=True)
        consults= query("SELECT COUNT(*) as cnt FROM consultations WHERE farmer_id=%s", (uid,), fetch_one=True)
        return {**u, "profile": profile, "scan_count": scans["cnt"], "consult_count": consults["cnt"]}
    elif user["role"] == "doctor":
        profile = query("SELECT * FROM doctor_profiles WHERE user_id=%s", (uid,), fetch_one=True)
        return {**u, "profile": profile}
    return u


@router.put("/profile/farmer")
def update_farmer_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    uid = int(user["sub"])
    existing = query("SELECT id FROM farmer_profiles WHERE user_id=%s", (uid,), fetch_one=True)
    if existing:
        query("UPDATE farmer_profiles SET farm_name=%s, location=%s, cattle_count=%s WHERE user_id=%s",
              (req.farm_name, req.location, req.cattle_count, uid))
    else:
        query("INSERT INTO farmer_profiles (user_id, farm_name, location, cattle_count) VALUES (%s,%s,%s,%s)",
              (uid, req.farm_name, req.location, req.cattle_count))
    return {"message": "Profile updated"}


@router.put("/profile/doctor")
def update_doctor_profile(req: DoctorProfileUpdate, user=Depends(get_current_user)):
    uid = int(user["sub"])
    existing = query("SELECT id FROM doctor_profiles WHERE user_id=%s", (uid,), fetch_one=True)
    if existing:
        query("UPDATE doctor_profiles SET specialization=%s, license_number=%s, experience_years=%s, available=%s WHERE user_id=%s",
              (req.specialization, req.license_number, req.experience_years, int(req.available), uid))
    else:
        query("INSERT INTO doctor_profiles (user_id, specialization, license_number, experience_years, available) VALUES (%s,%s,%s,%s,%s)",
              (uid, req.specialization, req.license_number, req.experience_years, int(req.available)))
    return {"message": "Profile updated"}


@router.get("/tips")
def get_tip(user=Depends(get_current_user)):
    tips = [
        {"title": "Hygiene",         "desc": "Clean cattle sheds daily. Disinfect water troughs weekly to prevent bacterial infections."},
        {"title": "Vaccination",     "desc": "Vaccinate against Lumpy Skin Disease before monsoon season (June-July). Keep records updated."},
        {"title": "Nutrition",       "desc": "Provide balanced feed with minerals and vitamins. Green fodder improves milk production by 15%."},
        {"title": "Early Detection", "desc": "Check cattle skin daily for nodules, lesions or swelling — early detection saves lives."},
        {"title": "Hydration",       "desc": "Ensure fresh water is available 24/7. A dairy cow needs 50-80 litres of water per day."},
        {"title": "Fever Check",     "desc": "Normal cattle temperature is 38-39.5 degrees C. Check regularly during disease outbreaks."},
    ]
    idx   = date.today().timetuple().tm_yday % len(tips)
    month = date.today().month
    alert = None
    if month in [6, 7, 8, 9]:
        alert = {"type": "warning", "msg": "Monsoon Alert: High risk of Lumpy Skin Disease. Ensure all cattle are vaccinated and sheds are dry."}
    elif month in [12, 1, 2]:
        alert = {"type": "info", "msg": "Winter Alert: Risk of Bovine Respiratory Disease increases. Ensure proper ventilation without cold drafts."}
    return {"tip": tips[idx], "alert": alert}


@router.get("/chat-history")
def get_chat_history(user=Depends(get_current_user)):
    logs = query(
        "SELECT user_message, bot_response, created_at FROM chat_logs WHERE user_id=%s ORDER BY created_at DESC LIMIT 50",
        (int(user["sub"]),), fetch=True,
    )
    for l in logs:
        l["created_at"] = str(l["created_at"])
    return logs


@router.delete("/chat-history")
def clear_chat_history(user=Depends(get_current_user)):
    query("DELETE FROM chat_logs WHERE user_id=%s", (int(user["sub"]),))
    return {"message": "Chat history cleared"}
