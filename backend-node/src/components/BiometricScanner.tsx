import React, { useState, useRef, useCallback } from "react";

interface BiometricResult {
  success: boolean;
  mode: string;
  name?: string;
  confidence?: number;
  status?: string;
  message?: string;
}

export default function BiometricScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<BiometricResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"identify" | "register">("identify");
  const [registerName, setRegisterName] = useState("");
  const [history, setHistory] = useState<BiometricResult[]>([]);
  const [stats, setStats] = useState<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch (e) {
      alert("Caméra non accessible — vérifiez les permissions");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
    setResult(null);
  }

  function captureFrame(): string | null {
    if (!videoRef.current || !canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvasRef.current.toDataURL("image/jpeg", 0.85).split(",")[1];
  }

  async function doScan() {
    setScanning(true);
    setResult(null);
    try {
      const imageB64 = captureFrame();
      if (!imageB64) throw new Error("Capture échouée");

      const endpoint = mode === "identify" ? "/api/biometric/identify" : "/api/biometric/register";
      const body: any = { image: imageB64 };
      if (mode === "register" && registerName.trim()) {
        body.name = registerName.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
      setHistory(h => [data, ...h.slice(0, 9)]);
    } catch (err: any) {
      const fallback: BiometricResult = {
        success: false,
        mode: "simulation",
        message: "Erreur scan: " + err.message,
        status: "ERREUR",
      };
      setResult(fallback);
    }
    setScanning(false);
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/biometric/stats");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  }

  React.useEffect(() => { fetchStats(); }, []);

  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", color: "#cce0cc", padding: "12px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        borderBottom: "1px solid rgba(0,98,51,0.3)", paddingBottom: "10px" }}>
        <div style={{ fontSize: "28px" }}>👁️</div>
        <div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: 700,
            color: "#00a855", letterSpacing: "3px" }}>MODULE BIOMÉTRIE</div>
          <div style={{ fontSize: "9px", color: "rgba(0,168,85,0.5)", letterSpacing: "2px" }}>
            IDENTIFICATION FACIALE — KHEDIM IA v8.0
          </div>
        </div>
        {stats && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "#00e5cc" }}>{stats.total_faces || 0} VISAGES DB</div>
            <div style={{ fontSize: "8px", color: stats.status === "OFFLINE" ? "#ff6b6b" : "#00a855" }}>
              ● {stats.status || "ONLINE"}
            </div>
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {(["identify", "register"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "6px 18px", fontFamily: "'Orbitron', monospace", fontSize: "9px",
            letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer",
            border: "1px solid",
            borderColor: mode === m ? "#00a855" : "rgba(0,98,51,0.3)",
            background: mode === m ? "rgba(0,98,51,0.3)" : "transparent",
            color: mode === m ? "#00ff88" : "rgba(200,220,200,0.5)",
          }}>{m === "identify" ? "🔍 IDENTIFIER" : "📝 ENREGISTRER"}</button>
        ))}
      </div>

      {/* Register Name Input */}
      {mode === "register" && (
        <input
          value={registerName}
          onChange={e => setRegisterName(e.target.value)}
          placeholder="NOM COMPLET DE L'AGENT..."
          style={{
            width: "100%", padding: "8px 12px", marginBottom: "10px",
            background: "rgba(0,20,10,0.9)", border: "1px solid rgba(0,98,51,0.4)",
            color: "#cce0cc", fontFamily: "'Rajdhani', sans-serif", fontSize: "12px",
            outline: "none", boxSizing: "border-box",
          }}
        />
      )}

      {/* Camera Feed */}
      <div style={{ position: "relative", background: "#000", marginBottom: "10px",
        border: "1px solid rgba(0,98,51,0.3)", overflow: "hidden", maxWidth: "480px" }}>
        <video ref={videoRef} style={{ width: "100%", display: streaming ? "block" : "none" }}
          playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!streaming && (
          <div style={{ height: "200px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <div style={{ fontSize: "40px" }}>📷</div>
            <div style={{ fontSize: "10px", color: "rgba(0,168,85,0.5)", fontFamily: "'Orbitron', monospace",
              letterSpacing: "2px" }}>CAMÉRA INACTIVE</div>
          </div>
        )}

        {/* Scan overlay */}
        {scanning && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", background: "rgba(0,20,10,0.7)" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#00ff88",
              letterSpacing: "3px", animation: "blink 0.5s infinite" }}>SCAN EN COURS...</div>
            <div style={{ width: "60px", height: "60px", border: "2px solid #00a855",
              borderTop: "2px solid transparent", borderRadius: "50%",
              animation: "spin 1s linear infinite", marginTop: "10px" }} />
          </div>
        )}

        {/* Corner brackets */}
        {streaming && (
          <>
            {[{t:"4px",l:"4px",bt:"none",bl:"none"},{t:"4px",r:"4px",bt:"none",br:"none"},
              {b:"4px",l:"4px",bb:"none",bl:"none"},{b:"4px",r:"4px",bb:"none",br:"none"}].map((s,i) => (
              <div key={i} style={{ position:"absolute", width:"20px", height:"20px",
                ...Object.fromEntries(Object.entries(s).map(([k,v]) => [k,v])),
                borderTop: s.bt !== "none" ? "2px solid #00a855" : "none",
                borderBottom: s.bb !== "none" ? "2px solid #00a855" : (s.bt === "none" && !s.bt ? "2px solid #00a855" : "none"),
                borderLeft: s.bl !== "none" ? "2px solid #00a855" : "none",
                borderRight: s.br !== "none" ? "2px solid #00a855" : (s.bl === "none" && !s.bl ? "2px solid #00a855" : "none"),
              }} />
            ))}
          </>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {!streaming ? (
          <button onClick={startCamera} style={{
            padding: "8px 20px", fontFamily: "'Orbitron', monospace", fontSize: "10px",
            letterSpacing: "2px", background: "rgba(0,98,51,0.3)", border: "1px solid #00a855",
            color: "#00ff88", cursor: "pointer",
          }}>▶ ACTIVER CAMÉRA</button>
        ) : (
          <>
            <button onClick={doScan} disabled={scanning} style={{
              padding: "8px 20px", fontFamily: "'Orbitron', monospace", fontSize: "10px",
              letterSpacing: "2px", background: scanning ? "rgba(0,50,25,0.3)" : "rgba(0,168,85,0.3)",
              border: "1px solid #00a855", color: "#00ff88", cursor: scanning ? "not-allowed" : "pointer",
            }}>🔍 {mode === "identify" ? "IDENTIFIER" : "ENREGISTRER"}</button>
            <button onClick={stopCamera} style={{
              padding: "8px 16px", fontFamily: "'Orbitron', monospace", fontSize: "10px",
              letterSpacing: "2px", background: "rgba(210,16,52,0.2)", border: "1px solid #d21034",
              color: "#ff6b6b", cursor: "pointer",
            }}>■ STOP</button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{
          padding: "12px", marginBottom: "12px",
          background: result.success ? "rgba(0,98,51,0.1)" : "rgba(210,16,52,0.1)",
          border: `1px solid ${result.success ? "rgba(0,168,85,0.4)" : "rgba(210,16,52,0.4)"}`,
        }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px",
            color: result.success ? "#00ff88" : "#ff6b6b", letterSpacing: "2px", marginBottom: "6px" }}>
            {result.success ? "✅ RÉSULTAT" : "❌ ÉCHEC"}
            <span style={{ fontSize: "8px", marginLeft: "10px", color: "#00e5cc" }}>
              [{result.mode?.toUpperCase()}]
            </span>
          </div>
          {result.name && <div style={{ fontSize: "14px", fontWeight: 700, color: "#00e5cc" }}>ID: {result.name}</div>}
          {result.confidence && <div style={{ fontSize: "10px", color: "#ffd700" }}>CONFIANCE: {result.confidence}%</div>}
          {result.message && <div style={{ fontSize: "10px", color: "rgba(200,220,200,0.6)", marginTop: "4px" }}>{result.message}</div>}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: "9px", fontFamily: "'Orbitron', monospace", color: "rgba(0,168,85,0.5)",
            letterSpacing: "3px", marginBottom: "6px" }}>HISTORIQUE SESSION</div>
          <div style={{ maxHeight: "180px", overflowY: "auto" }}>
            {history.map((h, i) => (
              <div key={i} style={{ padding: "5px 8px", borderBottom: "1px solid rgba(0,98,51,0.15)",
                display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span style={{ color: h.success ? "#00a855" : "#ff6b6b" }}>
                  {h.success ? "✅" : "❌"} {h.name || h.message || "—"}
                </span>
                {h.confidence && <span style={{ color: "#ffd700" }}>{h.confidence}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  );
}
