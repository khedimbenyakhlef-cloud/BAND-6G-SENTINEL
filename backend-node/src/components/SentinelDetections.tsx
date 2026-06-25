import React, { useState, useEffect, useCallback } from "react";

interface Detection {
  id: string; ico: string; type: string; priority: number;
  cat: string; color: string; source: string; wilaya: string;
  lat: number; lon: number; confidence: number; threatLevel: number;
  critical: boolean; timestamp: string; classification: string; status: string;
}

export default function SentinelDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchDetections = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/sentinel/detections?n=30"),
        fetch("/api/sentinel/stats")
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.success && d1.detections?.length > 0) {
        setDetections(d1.detections);
        setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
      }
      if (d2.success) setStats(d2.stats);
    } catch (e) {
      console.error("Sentinel fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetections();
    const iv = setInterval(fetchDetections, 15000);
    return () => clearInterval(iv);
  }, [fetchDetections]);

  const cats = ["all","satellite","drone","radar","terrorisme","narco","armes","maritime","cyber","nrbc","incendie","espionnage"];
  const filtered = filter === "all" ? detections : detections.filter(d => d.cat === filter);
  const critiques = detections.filter(d => d.critical).length;

  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", color: "#cce0cc", padding: "16px" }}>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "6px", marginBottom: "14px" }}>
        {[
          { label: "DÉTECTIONS", val: detections.length || 0, color: "#00a855" },
          { label: "CRITIQUES", val: critiques, color: "#e63a2e" },
          { label: "ZONES", val: stats?.zones_monitored || 20, color: "#00e5cc" },
          { label: "SATELLITES", val: stats?.satellites_active || 3, color: "#ffd700" },
          { label: "DRONES ACTIFS", val: stats?.drones_active || 0, color: "#00ff88" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(0,20,10,0.95)", border:`1px solid ${s.color}44`, padding:"10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"22px", fontWeight:700, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:"8px", color:"rgba(200,220,200,0.5)", letterSpacing:"2px", marginTop:"2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:"6px", alignItems:"center", marginBottom:"12px", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{
              padding:"3px 9px", fontSize:"8px", fontFamily:"'Orbitron',monospace",
              letterSpacing:"1px", cursor:"pointer", border:"1px solid",
              borderColor: filter===c ? "#00a855" : "rgba(0,98,51,0.3)",
              background: filter===c ? "rgba(0,98,51,0.3)" : "transparent",
              color: filter===c ? "#00ff88" : "rgba(200,220,200,0.4)",
              textTransform:"uppercase", transition:"all .2s"
            }}>{c}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center" }}>
          {lastUpdate && <span style={{ fontSize:"8px", color:"rgba(0,229,204,0.5)", fontFamily:"'Orbitron',monospace" }}>MAJ {lastUpdate}</span>}
          <button onClick={fetchDetections} style={{
            padding:"4px 14px", fontSize:"9px", fontFamily:"'Orbitron',monospace", letterSpacing:"2px",
            background:"rgba(0,98,51,0.2)", border:"1px solid #00a855", color:"#00ff88", cursor:"pointer"
          }}>↻ REFRESH</button>
          <button onClick={() => setAutoRefresh(a => !a)} style={{
            padding:"4px 10px", fontSize:"8px", fontFamily:"'Orbitron',monospace",
            background: autoRefresh ? "rgba(0,229,204,0.1)" : "transparent",
            border:`1px solid ${autoRefresh ? "#00e5cc" : "rgba(0,98,51,0.3)"}`,
            color: autoRefresh ? "#00e5cc" : "rgba(200,220,200,0.4)", cursor:"pointer"
          }}>AUTO {autoRefresh ? "ON" : "OFF"}</button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px", color:"#00a855",
          fontFamily:"'Orbitron',monospace", fontSize:"12px", letterSpacing:"4px" }}>
          <div style={{ marginBottom:"16px", fontSize:"30px" }}>🛡️</div>
          SCAN SENTINEL EN COURS...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px", color:"rgba(0,168,85,0.4)",
          fontFamily:"'Orbitron',monospace", fontSize:"10px", letterSpacing:"2px" }}>
          AUCUNE DÉTECTION — SECTEUR CALME
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:"6px", maxHeight:"560px", overflowY:"auto" }}>
          {filtered.map(det => (
            <div key={det.id} style={{
              background:"rgba(3,10,5,0.97)",
              border:`1px solid ${det.critical ? det.color+"99" : "rgba(0,98,51,0.2)"}`,
              padding:"10px 12px", position:"relative",
              boxShadow: det.critical ? `0 0 16px ${det.color}33` : "none",
              transition:"all .2s"
            }}>
              {det.critical && (
                <div style={{ position:"absolute", top:"5px", right:"8px", fontSize:"7px",
                  fontFamily:"'Orbitron',monospace", color:"#ff4444", letterSpacing:"1px",
                  animation:"blink 1s infinite" }}>● CRITIQUE</div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"7px" }}>
                <span style={{ fontSize:"22px" }}>{det.ico}</span>
                <div>
                  <div style={{ fontSize:"10px", fontFamily:"'Orbitron',monospace",
                    color:det.color, letterSpacing:"1px", fontWeight:700 }}>{det.type}</div>
                  <div style={{ fontSize:"8px", color:"rgba(200,220,200,0.45)", letterSpacing:"1px" }}>{det.source}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px", fontSize:"9px", marginBottom:"7px" }}>
                <div><span style={{ color:"rgba(200,220,200,0.35)" }}>ZONE: </span><span style={{ color:"#00e5cc" }}>{det.wilaya}</span></div>
                <div><span style={{ color:"rgba(200,220,200,0.35)" }}>CONF: </span><span style={{ color:"#00ff88" }}>{det.confidence}%</span></div>
                <div><span style={{ color:"rgba(200,220,200,0.35)" }}>MENACE: </span>
                  <span style={{ color: det.threatLevel>=8?"#ff4444":det.threatLevel>=5?"#ff9500":"#00a855", fontWeight:700 }}>
                    {det.threatLevel}/10
                  </span>
                </div>
                <div><span style={{ color:"rgba(200,220,200,0.35)" }}>CLASS: </span>
                  <span style={{ color:"#ffd700", fontSize:"7px" }}>{det.classification}</span>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:"8px", padding:"2px 8px",
                  background: det.status==="ALERTE ROUGE"?"rgba(230,58,46,0.2)":det.status==="ALERTE ORANGE"?"rgba(255,149,0,0.2)":"rgba(0,98,51,0.15)",
                  border:`1px solid ${det.status==="ALERTE ROUGE"?"#e63a2e55":det.status==="ALERTE ORANGE"?"#ff950055":"#00623355"}`,
                  color: det.status==="ALERTE ROUGE"?"#ff6b6b":det.status==="ALERTE ORANGE"?"#ffb347":"#00a855",
                  fontFamily:"'Orbitron',monospace", letterSpacing:"1px"
                }}>{det.status}</div>
                <div style={{ fontSize:"8px", color:"rgba(200,220,200,0.25)" }}>
                  {new Date(det.timestamp).toLocaleTimeString("fr-FR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
}
