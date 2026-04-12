from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth_utils import get_current_user
from database import query

router = APIRouter()


class ConsultRequest(BaseModel):
    doctor_id: int
    message: str
    scan_id: Optional[int] = None

class MessageRequest(BaseModel):
    message: str

class RatingRequest(BaseModel):
    rating: int
    review: str = ""

class PrescriptionRequest(BaseModel):
    prescription: str
    notes: str = ""


# ── Static routes FIRST (must be before /{cid} routes) ────────

@router.get("/doctors")
def get_doctors(user=Depends(get_current_user)):
    return query(
        """SELECT u.id, u.full_name, dp.specialization, dp.experience_years
           FROM users u JOIN doctor_profiles dp ON u.id=dp.user_id
           WHERE u.role='doctor' AND u.is_approved=1 AND dp.available=1""",
        fetch=True,
    )


@router.post("/request")
def request_consultation(req: ConsultRequest, user=Depends(get_current_user)):
    cid = query(
        "INSERT INTO consultations (farmer_id, doctor_id, scan_id, message, status) VALUES (%s,%s,%s,%s,'pending')",
        (int(user["sub"]), req.doctor_id, req.scan_id, req.message),
    )
    query("INSERT INTO consultation_messages (consultation_id, sender_id, message) VALUES (%s,%s,%s)",
          (cid, int(user["sub"]), req.message))
    return {"consultation_id": cid, "message": "Consultation request sent"}


@router.get("/my")
def my_consultations(user=Depends(get_current_user)):
    uid = int(user["sub"])
    if user["role"] == "farmer":
        rows = query(
            """SELECT c.id, c.status, c.created_at, u.full_name as doctor_name,
               s.predicted_disease, s.confidence
               FROM consultations c
               LEFT JOIN users u ON c.doctor_id=u.id
               LEFT JOIN scans s ON c.scan_id=s.id
               WHERE c.farmer_id=%s ORDER BY c.created_at DESC""",
            (uid,), fetch=True,
        )
    else:
        rows = query(
            """SELECT c.id, c.status, c.created_at, u.full_name as farmer_name, u.phone,
               s.predicted_disease, s.confidence
               FROM consultations c
               JOIN users u ON c.farmer_id=u.id
               LEFT JOIN scans s ON c.scan_id=s.id
               WHERE c.doctor_id=%s ORDER BY c.created_at DESC""",
            (uid,), fetch=True,
        )
    for r in rows:
        r["created_at"] = str(r["created_at"])
    return rows


@router.get("/unread-count")
def unread_count(user=Depends(get_current_user)):
    uid = int(user["sub"])
    result = query(
        """SELECT COUNT(DISTINCT c.id) as cnt
           FROM consultations c
           JOIN consultation_messages cm ON c.id = cm.consultation_id
           JOIN users u ON cm.sender_id = u.id
           WHERE c.farmer_id = %s AND u.role = 'doctor'
           AND cm.sent_at > COALESCE(c.replied_at, '2000-01-01')""",
        (uid,), fetch_one=True,
    )
    return {"count": result["cnt"] if result else 0}


@router.get("/doctor/{doctor_id}/rating")
def doctor_avg_rating(doctor_id: int, user=Depends(get_current_user)):
    r = query("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM doctor_ratings WHERE doctor_id=%s",
              (doctor_id,), fetch_one=True)
    return {"avg_rating": round(float(r["avg_rating"] or 0), 1), "total": r["total"]}


# ── Dynamic /{cid} routes AFTER static routes ─────────────────

@router.get("/{cid}/messages")
def get_messages(cid: int, user=Depends(get_current_user)):
    msgs = query(
        """SELECT cm.message, cm.sent_at, u.full_name, u.role
           FROM consultation_messages cm JOIN users u ON cm.sender_id=u.id
           WHERE cm.consultation_id=%s ORDER BY cm.sent_at ASC""",
        (cid,), fetch=True,
    )
    for m in msgs:
        m["sent_at"] = str(m["sent_at"])
    return msgs


@router.post("/{cid}/message")
def send_message(cid: int, req: MessageRequest, user=Depends(get_current_user)):
    query("INSERT INTO consultation_messages (consultation_id, sender_id, message) VALUES (%s,%s,%s)",
          (cid, int(user["sub"]), req.message))
    query("UPDATE consultations SET status='replied', replied_at=NOW() WHERE id=%s AND status='pending'", (cid,))
    return {"message": "Sent"}


@router.patch("/{cid}/close")
def close_consultation(cid: int, user=Depends(get_current_user)):
    query("UPDATE consultations SET status='closed' WHERE id=%s", (cid,))
    return {"message": "Closed"}


@router.post("/{cid}/rate")
def rate_doctor(cid: int, req: RatingRequest, user=Depends(get_current_user)):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    consult = query("SELECT * FROM consultations WHERE id=%s AND farmer_id=%s", (cid, int(user["sub"])), fetch_one=True)
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consult["status"] != "closed":
        raise HTTPException(status_code=400, detail="Can only rate closed consultations")
    existing = query("SELECT id FROM doctor_ratings WHERE consultation_id=%s", (cid,), fetch_one=True)
    if existing:
        query("UPDATE doctor_ratings SET rating=%s, review=%s WHERE consultation_id=%s", (req.rating, req.review, cid))
    else:
        query("INSERT INTO doctor_ratings (consultation_id, farmer_id, doctor_id, rating, review) VALUES (%s,%s,%s,%s,%s)",
              (cid, int(user["sub"]), consult["doctor_id"], req.rating, req.review))
    return {"message": "Rating submitted"}


@router.get("/{cid}/rating")
def get_rating(cid: int, user=Depends(get_current_user)):
    r = query("SELECT rating, review FROM doctor_ratings WHERE consultation_id=%s", (cid,), fetch_one=True)
    return r or {}


@router.post("/{cid}/prescription")
def add_prescription(cid: int, req: PrescriptionRequest, user=Depends(get_current_user)):
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can add prescriptions")
    msg = f"[PRESCRIPTION]\n{req.prescription}"
    if req.notes:
        msg += f"\n\n[NOTES]\n{req.notes}"
    query("INSERT INTO consultation_messages (consultation_id, sender_id, message) VALUES (%s,%s,%s)",
          (cid, int(user["sub"]), msg))
    query("UPDATE consultations SET status='replied', replied_at=NOW() WHERE id=%s", (cid,))
    return {"message": "Prescription added"}
