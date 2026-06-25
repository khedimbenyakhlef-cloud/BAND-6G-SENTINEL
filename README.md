# 🛡️ BAND-6G SENTINEL

**Plateforme de Commandement Tactique Intégrée — Nouvelle Génération**

Fondée par **Khedim Benyakhlef (Beny-Joe)** 🇩🇿

---

## 🚀 Architecture

```
BAND-6G SENTINEL/
├── backend-node/          ← Node.js + Express + React (TALKY WALKY)
│   ├── src/
│   │   ├── components/    ← Tous les composants React
│   │   │   ├── ManualTransceiver.tsx    (Radio SAT)
│   │   │   ├── SateliteRadar.tsx        (Radar orbital)
│   │   │   ├── NetworkTacticalMap.tsx   (Carte tactique)
│   │   │   ├── SentinelDetections.tsx   (Détections nationales) ← NOUVEAU
│   │   │   └── BiometricScanner.tsx     (Scan facial terrain)  ← NOUVEAU
│   │   └── App.tsx        ← 7 onglets intégrés
│   └── server.ts          ← Express + Socket.IO + APIs
└── backend-python/        ← FastAPI (KHEDIM IA)
    ├── main.py            ← API biométrie REST
    └── backend/           ← Moteurs InsightFace + Groq
```

---

## 🎯 Fonctionnalités

| Module | Description |
|--------|-------------|
| 🛰️ **Radio SAT** | Transmission Thuraya/Iridium, WebRTC, TTS Gemini |
| 📡 **Radar Orbital** | Tracking satellites live (CelesTrak) |
| 🗺️ **Carte Tactique** | Carte Leaflet avec positions agents |
| 🛡️ **SENTINEL DZ** | Détections: drones, terrorisme, narco, cyber... |
| 👁️ **Biométrie** | Scan facial terrain (InsightFace + MongoDB) |
| 📞 **VoIP** | Asterisk Cloud PBX intégré |
| 🌍 **Comms DZ & INT** | Hub international Algérie |

---

## ⚙️ Déploiement Render

### Service 1 — Backend Node (Talky Walky + Sentinel)
- **Runtime:** Node
- **Root Directory:** `backend-node`
- **Build:** `npm install && npm run build`
- **Start:** `npm start`

### Service 2 — Backend Python (Biométrie)
- **Runtime:** Python 3
- **Root Directory:** `backend-python`
- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 🔑 Variables d'environnement

Voir `.env.example` — à configurer dans **Render → Environment**

Après déploiement du service Python, copier son URL dans:
```
BIOMETRIC_API_URL = https://band6g-biometric-xxxx.onrender.com
```

---

## 📱 PWA Smartphone

Installez l'app sur votre smartphone depuis le navigateur:
- Chrome: Menu → "Installer l'application"
- Safari: Partager → "Sur l'écran d'accueil"

---

*© 2026 Khedim Benyakhlef — Entreprise Individuelle KHEDIM BENYAKHLEF — Mohammadia, Mascara, Algérie*
