"""
BAND-6G SENTINEL — Backend Biométrie FastAPI
Khedim Benyakhlef (Beny-Joe) 🇩🇿
"""
import os, sys, base64, time, io, random
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent))

app = FastAPI(title="BAND-6G Biometric API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy load face engine
_face_engine = None
_engine_tried = False

def get_face_engine():
    global _face_engine, _engine_tried
    if _engine_tried:
        return _face_engine
    _engine_tried = True
    try:
        from backend.face_engine import analyze_frame, register_face, get_system_info
        _face_engine = {"analyze_frame": analyze_frame, "register_face": register_face, "get_system_info": get_system_info}
        print("✅ InsightFace engine chargé")
    except Exception as e:
        print(f"⚠️ Face engine non dispo: {e}")
        _face_engine = None
    return _face_engine

def b64_to_numpy(b64: str):
    import numpy as np
    from PIL import Image
    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)

class IdentifyRequest(BaseModel):
    image: str
    threshold: Optional[float] = 0.55

class RegisterRequest(BaseModel):
    image: str
    name: str

@app.get("/")
def root():
    return {"service": "BAND-6G Biometric API", "version": "1.0.0", "status": "ONLINE", "engine": "KHEDIM IA v8.0", "author": "Khedim Benyakhlef (Beny-Joe)"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/identify")
async def identify(req: IdentifyRequest):
    try:
        engine = get_face_engine()
        if engine is None:
            # Simulation réaliste
            has_face = random.random() > 0.3
            if not has_face:
                return {"success": False, "mode": "simulation", "message": "Aucun visage détecté dans l'image", "status": "NO_FACE"}
            names = ["AGENT-ALPHA","AGENT-BRAVO","INCONNU-001","INCONNU-002","SUJET-TERRA-01"]
            name = random.choice(names)
            conf = round(random.uniform(72, 96), 1)
            return {
                "success": True, "mode": "simulation",
                "name": name, "confidence": conf,
                "status": "IDENTIFIED" if "INCONNU" not in name else "UNKNOWN",
                "message": f"[SIM] Identification: {name} — {conf}%"
            }
        img = b64_to_numpy(req.image)
        result = engine["analyze_frame"](img)
        faces = result.get("faces", [])
        if not faces:
            return {"success": False, "mode": "real", "message": "Aucun visage détecté", "status": "NO_FACE"}
        best = faces[0]
        return {
            "success": True, "mode": "real",
            "name": best.get("name", "INCONNU"),
            "confidence": round(best.get("confidence", 0) * 100, 1),
            "status": "IDENTIFIED" if best.get("name") != "INCONNU" else "UNKNOWN",
            "faces_count": len(faces)
        }
    except Exception as e:
        return {"success": False, "mode": "error", "message": str(e), "status": "ERROR"}

@app.post("/register")
async def register(req: RegisterRequest):
    try:
        if not req.name or len(req.name.strip()) < 2:
            return {"success": False, "message": "Nom invalide"}
        engine = get_face_engine()
        if engine is None:
            return {"success": True, "mode": "simulation", "name": req.name, "message": f"[SIM] Agent '{req.name}' enregistré en base de données"}
        img = b64_to_numpy(req.image)
        result = engine["register_face"](img, req.name.strip())
        return {"success": result.get("success", False), "mode": "real", "name": req.name, "message": result.get("message", "Enregistré")}
    except Exception as e:
        return {"success": False, "mode": "error", "message": str(e)}

@app.get("/stats")
async def stats():
    engine = get_face_engine()
    if engine is None:
        return {"success": True, "mode": "simulation", "stats": {"total_faces": 0, "status": "SIMULATION", "message": "Mode simulation actif — InsightFace non chargé"}}
    try:
        info = engine["get_system_info"]()
        return {"success": True, "mode": "real", "stats": {"total_faces": info.get("total_persons", 0), "status": "ONLINE", "engine": "InsightFace"}}
    except Exception as e:
        return {"success": True, "mode": "error", "stats": {"total_faces": 0, "status": "ERROR", "message": str(e)}}
