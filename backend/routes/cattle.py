from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth_utils import get_current_user
from database import query

router = APIRouter()


class CattleCreate(BaseModel):
    tag_id: str = ""
    name: str
    breed: str = ""
    age_years: float = 0
    gender: str = "female"
    weight_kg: float = 0
    notes: str = ""


class VaccinationCreate(BaseModel):
    cattle_id: int
    vaccine_name: str
    given_date: str
    next_due_date: Optional[str] = None
    notes: str = ""


@router.get("/")
def get_cattle(user=Depends(get_current_user)):
    uid = int(user["sub"])
    cattle = query(
        "SELECT * FROM cattle WHERE farmer_id=%s ORDER BY created_at DESC",
        (uid,), fetch=True,
    )
    for c in cattle:
        c["created_at"] = str(c["created_at"])
        # Get last scan for this cattle (by tag_id match in notes or just count)
        vax = query("SELECT COUNT(*) as cnt FROM vaccinations WHERE cattle_id=%s", (c["id"],), fetch_one=True)
        c["vaccination_count"] = vax["cnt"] if vax else 0
    return cattle


@router.post("/")
def add_cattle(req: CattleCreate, user=Depends(get_current_user)):
    uid = int(user["sub"])
    cid = query(
        "INSERT INTO cattle (farmer_id, tag_id, name, breed, age_years, gender, weight_kg, notes) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, req.tag_id, req.name, req.breed, req.age_years, req.gender, req.weight_kg, req.notes),
    )
    return {"id": cid, "message": "Cattle registered successfully"}


@router.put("/{cid}")
def update_cattle(cid: int, req: CattleCreate, user=Depends(get_current_user)):
    uid = int(user["sub"])
    existing = query("SELECT id FROM cattle WHERE id=%s AND farmer_id=%s", (cid, uid), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Cattle not found")
    query(
        "UPDATE cattle SET tag_id=%s, name=%s, breed=%s, age_years=%s, gender=%s, weight_kg=%s, notes=%s WHERE id=%s",
        (req.tag_id, req.name, req.breed, req.age_years, req.gender, req.weight_kg, req.notes, cid),
    )
    return {"message": "Updated"}


@router.delete("/{cid}")
def delete_cattle(cid: int, user=Depends(get_current_user)):
    uid = int(user["sub"])
    query("DELETE FROM cattle WHERE id=%s AND farmer_id=%s", (cid, uid))
    return {"message": "Deleted"}


@router.get("/{cid}/vaccinations")
def get_vaccinations(cid: int, user=Depends(get_current_user)):
    vax = query(
        "SELECT * FROM vaccinations WHERE cattle_id=%s ORDER BY given_date DESC",
        (cid,), fetch=True,
    )
    for v in vax:
        v["given_date"] = str(v["given_date"])
        v["next_due_date"] = str(v["next_due_date"]) if v["next_due_date"] else None
        v["created_at"] = str(v["created_at"])
    return vax


@router.get("/upcoming-vaccinations")
def upcoming_vaccinations(user=Depends(get_current_user)):
    uid = int(user["sub"])
    rows = query(
        """SELECT v.*, c.name as cattle_name, c.tag_id
           FROM vaccinations v
           JOIN cattle c ON v.cattle_id = c.id
           WHERE c.farmer_id = %s AND v.next_due_date IS NOT NULL
           AND v.next_due_date >= CURDATE()
           ORDER BY v.next_due_date ASC LIMIT 10""",
        (uid,), fetch=True,
    )
    for r in rows:
        r["given_date"] = str(r["given_date"])
        r["next_due_date"] = str(r["next_due_date"])
        r["created_at"] = str(r["created_at"])
    return rows


@router.post("/vaccinations")
def add_vaccination(req: VaccinationCreate, user=Depends(get_current_user)):
    vid = query(
        "INSERT INTO vaccinations (cattle_id, vaccine_name, given_date, next_due_date, notes) VALUES (%s,%s,%s,%s,%s)",
        (req.cattle_id, req.vaccine_name, req.given_date, req.next_due_date or None, req.notes),
    )
    return {"id": vid, "message": "Vaccination recorded"}


@router.get("/{cid}/certificate")
def health_certificate(cid: int, user=Depends(get_current_user)):
    from fastapi.responses import HTMLResponse
    from datetime import datetime

    cattle = query("SELECT * FROM cattle WHERE id=%s AND farmer_id=%s", (cid, int(user["sub"])), fetch_one=True)
    if not cattle:
        raise HTTPException(status_code=404, detail="Cattle not found")

    farmer = query("SELECT full_name, email, phone FROM users WHERE id=%s", (int(user["sub"]),), fetch_one=True)
    farm   = query("SELECT farm_name, location FROM farmer_profiles WHERE user_id=%s", (int(user["sub"]),), fetch_one=True)
    vax    = query("SELECT * FROM vaccinations WHERE cattle_id=%s ORDER BY given_date DESC", (cid,), fetch=True)
    scans  = query("SELECT predicted_disease, confidence, scanned_at FROM scans WHERE farmer_id=%s ORDER BY scanned_at DESC LIMIT 3", (int(user["sub"]),), fetch=True)

    vax_rows = "".join([f"<tr><td>{v['vaccine_name']}</td><td>{str(v['given_date'])}</td><td>{str(v['next_due_date']) if v['next_due_date'] else 'N/A'}</td></tr>" for v in vax]) or "<tr><td colspan='3'>No vaccinations recorded</td></tr>"
    scan_rows = "".join([f"<tr><td style='color:{'green' if s['predicted_disease']=='Healthy' else 'red'};font-weight:600'>{s['predicted_disease']}</td><td>{s['confidence']}%</td><td>{str(s['scanned_at'])[:10]}</td></tr>" for s in scans]) or "<tr><td colspan='3'>No scans recorded</td></tr>"

    html = f"""<!DOCTYPE html><html><head><title>Cattle Health Certificate</title>
    <style>body{{font-family:Arial,sans-serif;padding:40px;color:#1a2332;max-width:800px;margin:0 auto}}
    .header{{text-align:center;border-bottom:3px solid #1a6b3c;padding-bottom:16px;margin-bottom:24px}}
    h1{{color:#1a6b3c;margin:0}}h2{{color:#1a5276;margin-top:20px;font-size:1rem}}
    .cert-no{{color:#888;font-size:0.85rem;margin-top:4px}}
    .grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}}
    .field{{background:#f4f6f9;border-radius:6px;padding:10px 14px}}
    .field-label{{font-size:0.72rem;color:#4a5568;text-transform:uppercase;letter-spacing:0.4px}}
    .field-value{{font-weight:700;color:#1a2332;margin-top:2px}}
    table{{width:100%;border-collapse:collapse;margin:10px 0}}
    td,th{{padding:8px 12px;border:1px solid #d0d7e2;text-align:left;font-size:0.88rem}}
    th{{background:#f4f6f9;font-weight:700}}
    .seal{{text-align:center;margin-top:32px;padding:16px;border:2px dashed #1a6b3c;border-radius:8px;color:#1a6b3c}}
    .footer{{margin-top:24px;font-size:11px;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:10px}}</style></head>
    <body>
    <div class="header">
      <h1>VetriScan AI</h1>
      <div>Cattle Health Certificate</div>
      <div class="cert-no">Certificate No: VSC-{cid}-{datetime.now().strftime('%Y%m%d')}</div>
    </div>
    <h2>Cattle Information</h2>
    <div class="grid">
      <div class="field"><div class="field-label">Name</div><div class="field-value">{cattle['name']}</div></div>
      <div class="field"><div class="field-label">Tag ID</div><div class="field-value">{cattle['tag_id'] or 'N/A'}</div></div>
      <div class="field"><div class="field-label">Breed</div><div class="field-value">{cattle['breed'] or 'N/A'}</div></div>
      <div class="field"><div class="field-label">Age</div><div class="field-value">{cattle['age_years']} years</div></div>
      <div class="field"><div class="field-label">Gender</div><div class="field-value">{cattle['gender'].title()}</div></div>
      <div class="field"><div class="field-label">Weight</div><div class="field-value">{cattle['weight_kg']} kg</div></div>
    </div>
    <h2>Owner Information</h2>
    <div class="grid">
      <div class="field"><div class="field-label">Farmer Name</div><div class="field-value">{farmer['full_name']}</div></div>
      <div class="field"><div class="field-label">Farm</div><div class="field-value">{farm['farm_name'] if farm and farm['farm_name'] else 'N/A'}</div></div>
      <div class="field"><div class="field-label">Location</div><div class="field-value">{farm['location'] if farm and farm['location'] else 'N/A'}</div></div>
      <div class="field"><div class="field-label">Contact</div><div class="field-value">{farmer['phone'] or 'N/A'}</div></div>
    </div>
    <h2>Vaccination History</h2>
    <table><thead><tr><th>Vaccine</th><th>Date Given</th><th>Next Due</th></tr></thead><tbody>{vax_rows}</tbody></table>
    <h2>Recent AI Health Scans</h2>
    <table><thead><tr><th>Result</th><th>Confidence</th><th>Date</th></tr></thead><tbody>{scan_rows}</tbody></table>
    <div class="seal">This certificate is generated by VetriScan AI platform on {datetime.now().strftime('%d %B %Y')}<br>
    <strong>AI Model Accuracy: 95.59% | MobileNetV2 Transfer Learning</strong></div>
    <div class="footer">VetriScan AI — Smart Cattle Health Platform | This is an AI-generated certificate. Consult a licensed veterinarian for official certification.</div>
    <script>window.print()</script></body></html>"""

    return HTMLResponse(content=html)
