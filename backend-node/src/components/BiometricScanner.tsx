import React, { useState, useRef, useEffect } from "react";

interface BiometricResult {
  success: boolean; mode: string; name?: string;
  confidence?: number; status?: string; message?: string;
}

export default function BiometricScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<BiometricResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"identify"|"register">("identify");
  const [registerName, setRegisterName] = useState("");
  const [history, setHistory] = useState<BiometricResult[]>([]);
  const [stats, setStats] = useState<any>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [brightness, setBrightness] = useState(1.4);

  useEffect(() => {
    fetch("/api/biometric/stats").then(r=>r.json()).then(d=>{ if(d.success) setStats(d.stats); }).catch(()=>{});
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ideal:1280}, height:{ideal:720} }, audio:false
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStreaming(true);
    } catch(e) { alert("Caméra non accessible"); }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    setStreaming(false); setResult(null);
  }

  function captureFrame(): string|null {
    if (!videoRef.current || !canvasRef.current) return null;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    // Amélioration luminosité pour pièces sombres
    ctx.filter = `brightness(${brightness}) contrast(1.3) saturate(1.1)`;
    ctx.drawImage(v, 0, 0);
    ctx.filter = "none";
    return c.toDataURL("image/jpeg", 0.92).split(",")[1];
  }

  async function doScan() {
    setScanning(true); setResult(null);
    try {
      const imageB64 = captureFrame();
      if (!imageB64) throw new Error("Capture échouée");
      const endpoint = mode==="identify" ? "/api/biometric/identify" : "/api/biometric/register";
      const body: any = { image: imageB64 };
      if (mode==="register" && registerName.trim()) body.name = registerName.trim();
      const res = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const data = await res.json();
      setResult(data);
      setHistory(h=>[data,...h.slice(0,9)]);
      if (data.success && mode==="register") setRegisterName("");
    } catch(err:any) {
      setResult({ success:false, mode:"error", message:"Erreur: "+err.message });
    }
    setScanning(false);
  }

  return (
    <div style={{fontFamily:"'Rajdhani',sans-serif", color:"#cce0cc", padding:"14px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px",borderBottom:"1px solid rgba(0,98,51,0.3)",paddingBottom:"10px"}}>
        <span style={{fontSize:"26px"}}>👁️</span>
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:700,color:"#00a855",letterSpacing:"3px"}}>MODULE BIOMÉTRIE</div>
          <div style={{fontSize:"9px",color:"rgba(0,168,85,0.5)",letterSpacing:"2px"}}>IDENTIFICATION FACIALE — KHEDIM IA v8.0</div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:"9px",color:"#00e5cc"}}>{stats?.total_faces||0} VISAGES DB</div>
          <div style={{fontSize:"8px",color:stats?.status==="SIMULATION"?"#ff9500":"#00a855"}}>
            ● {stats?.status||"ONLINE"}
          </div>
        </div>
      </div>

      {/* Mode */}
      <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
        {(["identify","register"] as const).map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            padding:"6px 18px",fontFamily:"'Orbitron',monospace",fontSize:"9px",letterSpacing:"2px",
            textTransform:"uppercase",cursor:"pointer",border:"1px solid",
            borderColor:mode===m?"#00a855":"rgba(0,98,51,0.3)",
            background:mode===m?"rgba(0,98,51,0.3)":"transparent",
            color:mode===m?"#00ff88":"rgba(200,220,200,0.5)"
          }}>{m==="identify"?"🔍 IDENTIFIER":"📝 ENREGISTRER"}</button>
        ))}
      </div>

      {/* Register name */}
      {mode==="register" && (
        <input value={registerName} onChange={e=>setRegisterName(e.target.value)}
          placeholder="NOM COMPLET DE L'AGENT..."
          style={{width:"100%",padding:"8px 12px",marginBottom:"10px",
            background:"rgba(0,20,10,0.9)",border:"1px solid rgba(0,98,51,0.4)",
            color:"#cce0cc",fontFamily:"'Rajdhani',sans-serif",fontSize:"12px",
            outline:"none",boxSizing:"border-box"}} />
      )}

      {/* Brightness control */}
      {streaming && (
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",fontSize:"9px",color:"rgba(200,220,200,0.5)"}}>
          <span style={{fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>LUMINOSITÉ:</span>
          <input type="range" min="0.8" max="3.0" step="0.1" value={brightness}
            onChange={e=>setBrightness(parseFloat(e.target.value))}
            style={{flex:1,accentColor:"#00a855"}} />
          <span style={{color:"#00ff88",minWidth:"30px"}}>{brightness.toFixed(1)}x</span>
        </div>
      )}

      {/* Camera */}
      <div style={{position:"relative",background:"#000",marginBottom:"10px",
        border:"1px solid rgba(0,98,51,0.3)",overflow:"hidden",maxWidth:"520px"}}>
        <video ref={videoRef} style={{width:"100%",display:streaming?"block":"none",
          filter:`brightness(${brightness})`}} playsInline muted />
        <canvas ref={canvasRef} style={{display:"none"}} />

        {!streaming && (
          <div style={{height:"220px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px"}}>
            <span style={{fontSize:"42px"}}>📷</span>
            <div style={{fontSize:"10px",color:"rgba(0,168,85,0.5)",fontFamily:"'Orbitron',monospace",letterSpacing:"2px"}}>CAMÉRA INACTIVE</div>
          </div>
        )}

        {scanning && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",background:"rgba(0,20,10,0.75)"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#00ff88",letterSpacing:"3px",animation:"blink 0.5s infinite"}}>
              ANALYSE EN COURS...
            </div>
            <div style={{width:"50px",height:"50px",border:"2px solid #00a855",borderTop:"2px solid transparent",
              borderRadius:"50%",animation:"spin 0.8s linear infinite",marginTop:"12px"}} />
          </div>
        )}

        {/* Scan frame corners */}
        {streaming && !scanning && (
          <>
            <div style={{position:"absolute",top:"12px",left:"12px",width:"24px",height:"24px",borderTop:"2px solid #00a855",borderLeft:"2px solid #00a855"}} />
            <div style={{position:"absolute",top:"12px",right:"12px",width:"24px",height:"24px",borderTop:"2px solid #00a855",borderRight:"2px solid #00a855"}} />
            <div style={{position:"absolute",bottom:"12px",left:"12px",width:"24px",height:"24px",borderBottom:"2px solid #00a855",borderLeft:"2px solid #00a855"}} />
            <div style={{position:"absolute",bottom:"12px",right:"12px",width:"24px",height:"24px",borderBottom:"2px solid #00a855",borderRight:"2px solid #00a855"}} />
            <div style={{position:"absolute",top:"50%",left:"12px",right:"12px",height:"1px",background:"rgba(0,168,85,0.2)",transform:"translateY(-50%)"}} />
          </>
        )}
      </div>

      {/* Buttons */}
      <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
        {!streaming ? (
          <button onClick={startCamera} style={{
            padding:"8px 22px",fontFamily:"'Orbitron',monospace",fontSize:"10px",letterSpacing:"2px",
            background:"rgba(0,98,51,0.3)",border:"1px solid #00a855",color:"#00ff88",cursor:"pointer"
          }}>▶ ACTIVER CAMÉRA</button>
        ) : (
          <>
            <button onClick={doScan} disabled={scanning} style={{
              padding:"8px 22px",fontFamily:"'Orbitron',monospace",fontSize:"10px",letterSpacing:"2px",
              background:scanning?"rgba(0,50,25,0.3)":"rgba(0,168,85,0.3)",
              border:"1px solid #00a855",color:"#00ff88",cursor:scanning?"not-allowed":"pointer"
            }}>🔍 {mode==="identify"?"IDENTIFIER":"ENREGISTRER"}</button>
            <button onClick={stopCamera} style={{
              padding:"8px 16px",fontFamily:"'Orbitron',monospace",fontSize:"10px",letterSpacing:"2px",
              background:"rgba(210,16,52,0.2)",border:"1px solid #d21034",color:"#ff6b6b",cursor:"pointer"
            }}>■ STOP</button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{padding:"12px",marginBottom:"12px",
          background:result.success?"rgba(0,98,51,0.1)":"rgba(210,16,52,0.1)",
          border:`1px solid ${result.success?"rgba(0,168,85,0.4)":"rgba(210,16,52,0.4)"}`}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"2px",marginBottom:"6px",
            color:result.success?"#00ff88":"#ff6b6b"}}>
            {result.success?"✅ RÉSULTAT":"❌ ÉCHEC"}
            <span style={{fontSize:"8px",marginLeft:"10px",color:"#00e5cc"}}>[{result.mode?.toUpperCase()}]</span>
          </div>
          {result.name && <div style={{fontSize:"15px",fontWeight:700,color:"#00e5cc",marginBottom:"4px"}}>ID: {result.name}</div>}
          {result.confidence !== undefined && (
            <div style={{fontSize:"10px",color:"#ffd700",marginBottom:"4px"}}>
              CONFIANCE: {result.confidence}%
              <div style={{marginTop:"4px",height:"4px",background:"rgba(0,98,51,0.2)",borderRadius:"2px"}}>
                <div style={{height:"100%",width:`${result.confidence}%`,background:result.confidence>80?"#00a855":result.confidence>60?"#ff9500":"#e63a2e",borderRadius:"2px",transition:"width .5s"}} />
              </div>
            </div>
          )}
          {result.message && <div style={{fontSize:"10px",color:"rgba(200,220,200,0.6)",marginTop:"4px"}}>{result.message}</div>}
          {!result.success && result.mode==="real" && (
            <div style={{fontSize:"9px",color:"#ff9500",marginTop:"6px",fontFamily:"'Orbitron',monospace"}}>
              💡 CONSEIL: Augmentez la luminosité ou rapprochez-vous de la caméra
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{fontSize:"9px",fontFamily:"'Orbitron',monospace",color:"rgba(0,168,85,0.5)",letterSpacing:"3px",marginBottom:"6px"}}>
            HISTORIQUE SESSION ({history.length})
          </div>
          <div style={{maxHeight:"180px",overflowY:"auto",border:"1px solid rgba(0,98,51,0.2)"}}>
            {history.map((h,i)=>(
              <div key={i} style={{padding:"6px 10px",borderBottom:"1px solid rgba(0,98,51,0.1)",
                display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"10px"}}>
                <span style={{color:h.success?"#00a855":"#ff6b6b"}}>
                  {h.success?"✅":"❌"} {h.name||h.message||"—"}
                </span>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  {h.confidence!==undefined && <span style={{color:"#ffd700",fontSize:"9px"}}>{h.confidence}%</span>}
                  <span style={{fontSize:"7px",color:"rgba(200,220,200,0.3)",fontFamily:"'Orbitron',monospace"}}>[{h.mode}]</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      `}</style>
    </div>
  );
}
