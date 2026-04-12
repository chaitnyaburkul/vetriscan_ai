import os, sys, time
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from auth_utils import get_current_user
from database import query
from PIL import Image
from io import BytesIO

# Model path — stored in backend/assets/
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../assets/cattle_disease_model.h5"))

router = APIRouter()

# Cached model — loaded once on first prediction
_model = None

def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            return None
        from tensorflow.keras.models import load_model as keras_load
        _model = keras_load(MODEL_PATH)
    return _model


@router.post("/predict")
async def predict(file: UploadFile = File(...), user=Depends(get_current_user)):
    import numpy as np
    from PIL import ImageEnhance

    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert("RGB")

    model = get_model()
    if model is None:
        raise HTTPException(status_code=500, detail=f"Model not found. Expected at: {MODEL_PATH}")

    def preprocess(img):
        return np.array(img.resize((224, 224)), dtype=np.float32) / 255.0

    variants = [
        image,
        image.transpose(Image.FLIP_LEFT_RIGHT),
        ImageEnhance.Brightness(image).enhance(1.2),
        ImageEnhance.Brightness(image).enhance(0.8),
        ImageEnhance.Contrast(image).enhance(1.2),
    ]
    scores = []
    for v in variants:
        arr = np.expand_dims(preprocess(v), axis=0)
        score = float(model.predict(arr, verbose=0)[0][0])
        scores.append(score)

    avg_score = float(np.mean(scores))
    if avg_score < 0.5:
        disease = "Lumpy Skin Disease"
        confidence = round((1 - avg_score) * 100, 2)
    else:
        disease = "Healthy"
        confidence = round(avg_score * 100, 2)

    if confidence < 60.0:
        raise HTTPException(status_code=422, detail=f"Low confidence ({confidence}%). Please upload a clearer cattle image.")

    upload_dir = os.path.join(os.path.dirname(__file__), "../uploads")
    os.makedirs(upload_dir, exist_ok=True)
    img_path = os.path.join(upload_dir, f"{user['sub']}_{int(time.time())}.jpg")
    image.save(img_path)

    scan_id = query(
        "INSERT INTO scans (farmer_id, image_path, predicted_disease, confidence) VALUES (%s,%s,%s,%s)",
        (int(user["sub"]), img_path, disease, confidence),
    )

    return {
        "scan_id": scan_id,
        "disease": disease,
        "confidence": confidence,
        "severity": "High" if disease != "Healthy" else "None",
        "description": "Viral disease causing nodular skin lesions, fever, and reduced milk production." if disease != "Healthy" else "The cattle appears healthy. No disease detected.",
        "treatment": "Vaccination, anti-inflammatory drugs, wound care. Isolate affected animals immediately." if disease != "Healthy" else "Maintain regular vaccination and hygiene schedules.",
    }


@router.get("/history")
def scan_history(user=Depends(get_current_user)):
    scans = query(
        "SELECT id, predicted_disease, confidence, scanned_at FROM scans WHERE farmer_id=%s ORDER BY scanned_at DESC LIMIT 20",
        (int(user["sub"]),), fetch=True,
    )
    for s in scans:
        s["scanned_at"] = str(s["scanned_at"])
    return scans
