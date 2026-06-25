"""
╔══════════════════════════════════════════════════════════════╗
║   BAND-6G SENTINEL — BACKEND BIOMÉTRIE                      ║
║   FastAPI wrapper pour KHEDIM IA v8.0                        ║
║   Fondé par Khedim Benyakhlef (Beny-Joe) 🇩🇿                 ║
╚══════════════════════════════════════════════════════════════╝
"""

import os, sys, base64, time, io
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent))

app = FastAPI(title="BAND-6G Biometric API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════
#   LAZY LOAD ENGINES
# ═══════════════════════════════

_face_engine = None
_groq_engine = None

def get_face_engine():
    global _face_engine
    if _face_engine is None:
        try:
            from backend.face_engine import (
                analyze_frame, register_face,
                get_system_info, faces_db
            )
            _face_engine = {
                "analyze_frame": analyze_frame,
                "register_face": register_face,
                "get_system_info": get_system_info,
                "faces_db": faces_db,
            }
            print("✅ Face engine chargé")
        except Exception as e:
            print(f"⚠️ Face engine non disponible: {e}")
            _face_engine = None
    return _face_engine

def get_groq_engine():
    global _groq_engine
    if _groq_engine is None:
        try:
            from backend.groq_engine import groq_engine
            _groq_engine = groq_engine
            print("✅ Groq engine chargé")
        except Exception as e:
            print(f"⚠️ Groq engine non disponible: {e}")
    return _groq_engine

# ═══════════════════════════════
#   MODÈLES
# ═══════════════════════════════

class IdentifyRequest(BaseModel):
    image: str  # base64 JPEG
    threshold: Optional[float] = 0.55

class RegisterRequest(BaseModel):
    image: str  # base64 JPEG
    name: str

class AnalyzeRequest(BaseModel):
    image: str

# ═══════════════════════════════
#   UTILS
# ═══════════════════════════════

def b64_to_numpy(b64: str):
    import numpy as np
    from PIL import Image
    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)

# ═══════════════════════════════
#   ROUTES
# ═══════════════════════════════

@app.get("/")
def root():
    return {
        "service": "BAND-6G Biometric API",
        "version": "1.0.0",
        "status": "ONLINE",
        "engine": "KHEDIM IA v8.0",
        "author": "Khedim Benyakhlef (Beny-Joe)"
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/identify")
async def identify(req: IdentifyRequest):
    try:
        img = b64_to_numpy(req.image)
        engine = get_face_engine()
        if engine is None:
            return {
                "success": False,
                "mode": "simulation",
                "message": "Engine biométrique non disponible sur ce serveur",
                "status": "OFFLINE"
            }
        result = engine["analyze_frame"](img)
        faces = result.get("faces", [])
        if not faces:
            return {
                "success": False,
                "mode": "real",
                "message": "Aucun visage détecté dans l'image",
                "status": "NO_FACE"
            }
        best = faces[0]
        return {
            "success": True,
            "mode": "real",
            "name": best.get("name", "INCONNU"),
            "confidence": round(best.get("confidence", 0) * 100, 1),
            "status": "IDENTIFIED" if best.get("name") != "INCONNU" else "UNKNOWN",
            "faces_count": len(faces),
        }
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": str(e),
            "status": "ERROR"
        }

@app.post("/register")
async def register(req: RegisterRequest):
    try:
        if not req.name or len(req.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Nom invalide")
        img = b64_to_numpy(req.image)
        engine = get_face_engine()
        if engine is None:
            return {
                "success": False,
                "mode": "simulation",
                "message": "Engine non disponible"
            }
        result = engine["register_face"](img, req.name.strip())
        return {
            "success": result.get("success", False),
            "mode": "real",
            "name": req.name,
            "message": result.get("message", "Enregistrement terminé"),
        }
    except Exception as e:
        return {"success": False, "mode": "error", "message": str(e)}

@app.get("/stats")
async def stats():
    try:
        engine = get_face_engine()
        if engine is None:
            return {
                "success": True,
                "mode": "simulation",
                "stats": {
                    "total_faces": 0,
                    "status": "OFFLINE",
                    "message": "Engine non chargé"
                }
            }
        info = engine["get_system_info"]()
        return {
            "success": True,
            "mode": "real",
            "stats": {
                "total_faces": info.get("total_persons", 0),
                "status": "ONLINE",
                "engine": info.get("engine", "InsightFace"),
                "db_backend": info.get("db_backend", "MongoDB"),
            }
        }
    except Exception as e:
        return {
            "success": True,
            "mode": "error",
            "stats": {"total_faces": 0, "status": "ERROR", "message": str(e)}
        }
