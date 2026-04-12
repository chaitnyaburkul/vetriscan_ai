from fastapi import APIRouter, Depends
from auth_utils import require_role
from database import query

router = APIRouter()
admin_only = require_role("admin")


@router.get("/stats")
def get_stats(user=Depends(admin_only)):
    return {
        "total_users":      query("SELECT COUNT(*) as c FROM users WHERE role!='admin'", fetch_one=True)["c"],
        "total_farmers":    query("SELECT COUNT(*) as c FROM users WHERE role='farmer'", fetch_one=True)["c"],
        "total_doctors":    query("SELECT COUNT(*) as c FROM users WHERE role='doctor' AND is_approved=1", fetch_one=True)["c"],
        "pending_docs":     query("SELECT COUNT(*) as c FROM users WHERE role='doctor' AND is_approved=0", fetch_one=True)["c"],
        "total_scans":      query("SELECT COUNT(*) as c FROM scans", fetch_one=True)["c"],
        "scans_today":      query("SELECT COUNT(*) as c FROM scans WHERE DATE(scanned_at)=CURDATE()", fetch_one=True)["c"],
        "total_consults":   query("SELECT COUNT(*) as c FROM consultations", fetch_one=True)["c"],
        "pending_consults": query("SELECT COUNT(*) as c FROM consultations WHERE status='pending'", fetch_one=True)["c"],
    }


@router.get("/analytics")
def get_analytics(user=Depends(admin_only)):
    disease_dist = query(
        "SELECT predicted_disease, COUNT(*) as cnt FROM scans GROUP BY predicted_disease",
        fetch=True,
    )
    daily_scans = query(
        """SELECT DATE(scanned_at) as day, COUNT(*) as cnt
           FROM scans WHERE scanned_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           GROUP BY DATE(scanned_at) ORDER BY day""",
        fetch=True,
    )
    for d in daily_scans:
        d["day"] = str(d["day"])
    user_regs = query(
        """SELECT DATE(created_at) as day, role, COUNT(*) as cnt
           FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY DATE(created_at), role ORDER BY day""",
        fetch=True,
    )
    for u in user_regs:
        u["day"] = str(u["day"])
    return {
        "disease_distribution": disease_dist,
        "daily_scans": daily_scans,
        "user_registrations": user_regs,
    }


@router.get("/users")
def get_users(user=Depends(admin_only)):
    users = query("SELECT id, full_name, email, role, is_approved, created_at FROM users ORDER BY created_at DESC", fetch=True)
    for u in users:
        u["created_at"] = str(u["created_at"])
    return users


@router.get("/pending-doctors")
def pending_doctors(user=Depends(admin_only)):
    docs = query(
        """SELECT u.id, u.full_name, u.email, u.phone, dp.specialization, dp.license_number, dp.experience_years
           FROM users u LEFT JOIN doctor_profiles dp ON u.id=dp.user_id
           WHERE u.role='doctor' AND u.is_approved=0""",
        fetch=True,
    )
    return docs


@router.patch("/approve/{uid}")
def approve_doctor(uid: int, user=Depends(admin_only)):
    query("UPDATE users SET is_approved=1 WHERE id=%s", (uid,))
    return {"message": "Doctor approved"}


@router.delete("/user/{uid}")
def delete_user(uid: int, user=Depends(admin_only)):
    query("DELETE FROM users WHERE id=%s", (uid,))
    return {"message": "User deleted"}


@router.get("/scans")
def get_scans(user=Depends(admin_only)):
    scans = query(
        """SELECT s.id, u.full_name as farmer, s.predicted_disease, s.confidence, s.scanned_at
           FROM scans s JOIN users u ON s.farmer_id=u.id ORDER BY s.scanned_at DESC LIMIT 100""",
        fetch=True,
    )
    for s in scans:
        s["scanned_at"] = str(s["scanned_at"])
    return scans


@router.get("/consultations")
def get_all_consultations(user=Depends(admin_only)):
    rows = query(
        """SELECT c.id, c.status, c.created_at,
           f.full_name as farmer_name, d.full_name as doctor_name,
           s.predicted_disease, s.confidence
           FROM consultations c
           JOIN users f ON c.farmer_id=f.id
           LEFT JOIN users d ON c.doctor_id=d.id
           LEFT JOIN scans s ON c.scan_id=s.id
           ORDER BY c.created_at DESC LIMIT 100""",
        fetch=True,
    )
    for r in rows:
        r["created_at"] = str(r["created_at"])
    return rows


@router.get("/export/scans")
def export_scans_csv(user=Depends(admin_only)):
    from fastapi.responses import StreamingResponse
    import csv, io
    scans = query(
        """SELECT s.id, u.full_name as farmer, s.predicted_disease, s.confidence, s.scanned_at
           FROM scans s JOIN users u ON s.farmer_id=u.id ORDER BY s.scanned_at DESC""",
        fetch=True,
    )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id","farmer","predicted_disease","confidence","scanned_at"])
    writer.writeheader()
    for s in scans:
        s["scanned_at"] = str(s["scanned_at"])
        writer.writerow(s)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=scan_logs.csv"})


@router.get("/export/users")
def export_users_csv(user=Depends(admin_only)):
    from fastapi.responses import StreamingResponse
    import csv, io
    users = query(
        "SELECT id, full_name, email, role, is_approved, created_at FROM users ORDER BY created_at DESC",
        fetch=True,
    )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id","full_name","email","role","is_approved","created_at"])
    writer.writeheader()
    for u in users:
        u["created_at"] = str(u["created_at"])
        writer.writerow(u)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"})


@router.get("/report/pdf")
def generate_report(user=Depends(admin_only)):
    from fastapi.responses import HTMLResponse
    from datetime import datetime

    stats_data = {
        "total_users":   query("SELECT COUNT(*) as c FROM users WHERE role!='admin'", fetch_one=True)["c"],
        "total_farmers": query("SELECT COUNT(*) as c FROM users WHERE role='farmer'", fetch_one=True)["c"],
        "total_doctors": query("SELECT COUNT(*) as c FROM users WHERE role='doctor' AND is_approved=1", fetch_one=True)["c"],
        "total_scans":   query("SELECT COUNT(*) as c FROM scans", fetch_one=True)["c"],
        "total_consults":query("SELECT COUNT(*) as c FROM consultations", fetch_one=True)["c"],
    }
    disease_dist = query("SELECT predicted_disease, COUNT(*) as cnt FROM scans GROUP BY predicted_disease", fetch=True)
    recent_scans = query(
        """SELECT u.full_name, s.predicted_disease, s.confidence, s.scanned_at
           FROM scans s JOIN users u ON s.farmer_id=u.id ORDER BY s.scanned_at DESC LIMIT 10""",
        fetch=True,
    )

    rows_html = "".join([
        f"<tr><td>{s['full_name']}</td><td style='color:{'green' if s['predicted_disease']=='Healthy' else 'red'};font-weight:600'>{s['predicted_disease']}</td><td>{s['confidence']}%</td><td>{str(s['scanned_at'])[:10]}</td></tr>"
        for s in recent_scans
    ])
    dist_html = "".join([f"<li>{d['predicted_disease']}: <strong>{d['cnt']}</strong> scans</li>" for d in disease_dist])

    html = f"""<!DOCTYPE html><html><head><title>VetriScan AI Platform Report</title>
    <style>body{{font-family:Arial,sans-serif;padding:32px;color:#1a2332}}
    h1{{color:#1a6b3c;border-bottom:3px solid #1a6b3c;padding-bottom:8px}}
    h2{{color:#1a5276;margin-top:24px}}.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0}}
    .card{{background:#f4f6f9;border:1px solid #d0d7e2;border-radius:8px;padding:14px;text-align:center}}
    .num{{font-size:2rem;font-weight:800;color:#1a6b3c}}.lbl{{font-size:0.78rem;color:#4a5568;margin-top:4px}}
    table{{width:100%;border-collapse:collapse;margin:12px 0}}
    td,th{{padding:9px 12px;border:1px solid #d0d7e2;text-align:left}}th{{background:#f4f6f9;font-weight:700}}
    .footer{{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px}}</style></head>
    <body>
    <h1>VetriScan AI — Platform Report</h1>
    <p>Generated: {datetime.now().strftime('%d %B %Y, %H:%M')} | Admin Report</p>
    <h2>Platform Statistics</h2>
    <div class="grid">
      <div class="card"><div class="num">{stats_data['total_users']}</div><div class="lbl">Total Users</div></div>
      <div class="card"><div class="num">{stats_data['total_farmers']}</div><div class="lbl">Farmers</div></div>
      <div class="card"><div class="num">{stats_data['total_doctors']}</div><div class="lbl">Doctors</div></div>
      <div class="card"><div class="num">{stats_data['total_scans']}</div><div class="lbl">Total Scans</div></div>
      <div class="card"><div class="num">{stats_data['total_consults']}</div><div class="lbl">Consultations</div></div>
    </div>
    <h2>Disease Distribution</h2><ul>{dist_html}</ul>
    <h2>Recent Scans (Last 10)</h2>
    <table><thead><tr><th>Farmer</th><th>Disease</th><th>Confidence</th><th>Date</th></tr></thead>
    <tbody>{rows_html}</tbody></table>
    <div class="footer">VetriScan AI — Smart Cattle Health Platform | Confidential Admin Report</div>
    <script>window.print()</script></body></html>"""

    return HTMLResponse(content=html)


@router.get("/outbreak-alerts")
def outbreak_alerts(user=Depends(admin_only)):
    """Return diseases reported by 3+ farmers in last 24 hours."""
    alerts = query(
        """SELECT predicted_disease, COUNT(DISTINCT farmer_id) as farmer_count,
           COUNT(*) as scan_count
           FROM scans
           WHERE predicted_disease != 'Healthy'
           AND scanned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
           GROUP BY predicted_disease
           HAVING farmer_count >= 3
           ORDER BY farmer_count DESC""",
        fetch=True,
    )
    return alerts


@router.get("/realtime")
def realtime_data(user=Depends(admin_only)):
    """Real-time data for live monitoring dashboard."""
    from datetime import datetime

    # Last 20 scans with timestamps
    recent = query(
        """SELECT s.predicted_disease, s.confidence, s.scanned_at,
           u.full_name as farmer, fp.location
           FROM scans s
           JOIN users u ON s.farmer_id=u.id
           LEFT JOIN farmer_profiles fp ON u.id=fp.user_id
           ORDER BY s.scanned_at DESC LIMIT 20""",
        fetch=True,
    )
    for r in recent:
        r["scanned_at"] = str(r["scanned_at"])

    # Hourly scan counts for last 24 hours
    hourly = query(
        """SELECT HOUR(scanned_at) as hour, COUNT(*) as cnt,
           SUM(CASE WHEN predicted_disease != 'Healthy' THEN 1 ELSE 0 END) as disease_cnt
           FROM scans
           WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
           GROUP BY HOUR(scanned_at) ORDER BY hour""",
        fetch=True,
    )

    # Current stats
    stats = {
        "total_scans_today": query("SELECT COUNT(*) as c FROM scans WHERE DATE(scanned_at)=CURDATE()", fetch_one=True)["c"],
        "disease_today":     query("SELECT COUNT(*) as c FROM scans WHERE DATE(scanned_at)=CURDATE() AND predicted_disease!='Healthy'", fetch_one=True)["c"],
        "active_farmers":    query("SELECT COUNT(DISTINCT farmer_id) as c FROM scans WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)", fetch_one=True)["c"],
        "pending_consults":  query("SELECT COUNT(*) as c FROM consultations WHERE status='pending'", fetch_one=True)["c"],
    }

    return {"recent_scans": recent, "hourly": hourly, "stats": stats}
