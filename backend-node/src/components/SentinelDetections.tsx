import React, { useState, useEffect } from "react";

interface Detection {
  id: string;
  ico: string;
  type: string;
  priority: number;
  cat: string;
  color: string;
  source: string;
  wilaya: string;
  lat: number;
  lon: number;
  confidence: number;
  threatLevel: number;
  critical: boolean;
  timestamp: string;
  classification: string;
  status: string;
}

export default function SentinelDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function fetchDetections() {
    try {
      const res = await fetch("/api/sentinel/detections?n=30");
      const data = await res.json();
      if (data.success) setDetections(data.detections);
    } catch {}
    try {
      const res = await fetch("/api/sentinel/stats");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchDetections();
    if (autoRefresh) {
      const iv = setInterval(fetchDetections, 15000);
      return () => clearInterval(iv);
    }
  }, [autoRefresh]);

  const cats = ["all", "satellite", "drone", "radar", "terrorisme", "narco", "armes", "maritime", "cyber", "nrbc"];
  const filtered = filter === "all" ? detections : detections.filter(d => d.cat === filter);
  const critiques = detections.filter(d => d.critical).length;

  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", color: "#cce0cc", padding: "12px" }}>

      {/* Header Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "6px", marginBottom: "12px" }}>
          {[
            { label: "DÉTECTIONS", val: stats.total_detections, color: "#00a855" },
            { label: "CRITIQUES", val: critiques, color: "#e63a2e" },
            { label: "ZONES", val: stats.zones_monitored, color: "#00e5cc" },
            { label: "SATELLITES", val: stats.satellites_active, color: "#ffd700" },
            { label: "DRONES", val: stats.drones_active, color: "#00ff88" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(0,20,10,0.9)", border: `1px solid ${s.color}33`, padding: "10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "20px", fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: "9px", color: "rgba(200,220,200,0.5)", letterSpacing: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{
              padding: "4px 10px", fontSize: "9px", fontFamily: "'Orbitron', monospace",
              letterSpacing: "1px", cursor: "pointer", border: "1px solid",
              borderColor: filter === c ? "#00a855" : "rgba(0,98,51,0.3)",
              background: filter === c ? "rgba(0,98,51,0.3)" : "transparent",
              color: filter === c ? "#00ff88" : "rgba(200,220,200,0.5)",
              textTransform: "uppercase",
            }}>{c}</button>
          ))}
        </div>
        <button onClick={fetchDetections} style={{
          marginLeft: "auto", padding: "4px 14px", fontSize: "9px",
          fontFamily: "'Orbitron', monospace", letterSpacing: "2px",
          background: "rgba(0,98,51,0.2)", border: "1px solid #00a855",
          color: "#00ff88", cursor: "pointer",
        }}>↻ REFRESH</button>
        <button onClick={() => setAutoRefresh(a => !a)} style={{
          padding: "4px 14px", fontSize: "9px", fontFamily: "'Orbitron', monospace",
          letterSpacing: "1px", background: autoRefresh ? "rgba(0,229,204,0.1)" : "transparent",
          border: `1px solid ${autoRefresh ? "#00e5cc" : "rgba(0,98,51,0.3)"}`,
          color: autoRefresh ? "#00e5cc" : "rgba(200,220,200,0.4)", cursor: "pointer",
        }}>AUTO {autoRefresh ? "ON" : "OFF"}</button>
      </div>

      {/* Detections List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#00a855", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "3px" }}>
          SCAN EN COURS...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "6px", maxHeight: "520px", overflowY: "auto" }}>
          {filtered.map(det => (
            <div key={det.id} style={{
              background: "rgba(3,10,5,0.95)",
              border: `1px solid ${det.critical ? det.color + "88" : "rgba(0,98,51,0.2)"}`,
              padding: "10px 12px", position: "relative",
              boxShadow: det.critical ? `0 0 12px ${det.color}22` : "none",
              animation: det.critical ? "pulse 2s ease-in-out infinite" : "none",
            }}>
              {det.critical && (
                <div style={{ position: "absolute", top: "5px", right: "8px", fontSize: "7px",
                  fontFamily: "'Orbitron', monospace", color: "#ff4444", letterSpacing: "1px",
                  animation: "blink 1s infinite" }}>
                  ● CRITIQUE
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "20px" }}>{det.ico}</span>
                <div>
                  <div style={{ fontSize: "10px", fontFamily: "'Orbitron', monospace",
                    color: det.color, letterSpacing: "1px", fontWeight: 700 }}>{det.type}</div>
                  <div style={{ fontSize: "9px", color: "rgba(200,220,200,0.5)", letterSpacing: "1px" }}>{det.source}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "9px" }}>
                <div><span style={{ color: "rgba(200,220,200,0.4)" }}>ZONE: </span><span style={{ color: "#00e5cc" }}>{det.wilaya}</span></div>
                <div><span style={{ color: "rgba(200,220,200,0.4)" }}>CONF: </span><span style={{ color: "#00ff88" }}>{det.confidence}%</span></div>
                <div><span style={{ color: "rgba(200,220,200,0.4)" }}>MENACE: </span><span style={{ color: det.threatLevel >= 8 ? "#ff4444" : det.threatLevel >= 5 ? "#ff9500" : "#00a855" }}>{det.threatLevel}/10</span></div>
                <div><span style={{ color: "rgba(200,220,200,0.4)" }}>CLASS: </span><span style={{ color: "#ffd700", fontSize: "8px" }}>{det.classification}</span></div>
              </div>
              <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "8px", padding: "2px 8px",
                  background: det.status === "ALERTE ROUGE" ? "rgba(230,58,46,0.2)" : det.status === "ALERTE ORANGE" ? "rgba(255,149,0,0.2)" : "rgba(0,98,51,0.2)",
                  border: `1px solid ${det.status === "ALERTE ROUGE" ? "#e63a2e" : det.status === "ALERTE ORANGE" ? "#ff9500" : "#006233"}55`,
                  color: det.status === "ALERTE ROUGE" ? "#ff6b6b" : det.status === "ALERTE ORANGE" ? "#ffb347" : "#00a855",
                  fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
                  {det.status}
                </div>
                <div style={{ fontSize: "8px", color: "rgba(200,220,200,0.3)" }}>
                  {new Date(det.timestamp).toLocaleTimeString("fr-FR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
