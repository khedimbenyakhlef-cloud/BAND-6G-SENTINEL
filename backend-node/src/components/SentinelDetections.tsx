import React, { useState, useEffect, useCallback, useRef } from "react";

interface Detection {
  id: string; ico: string; type: string; priority: number;
  cat: string; color: string; source: string; wilaya: string;
  lat: number; lon: number; confidence: number; threatLevel: number;
  critical: boolean; timestamp: string; classification: string; status: string;
}

declare const L: any;

export default function SentinelDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"carte" | "liste">("carte");
  const [selected, setSelected] = useState<Detection | null>(null);
  const [userPos, setUserPos] = useState<{lat:number,lon:number}|null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const leafletLoadedRef = useRef(false);

  // Load Leaflet CSS + JS
  useEffect(() => {
    if (leafletLoadedRef.current) return;
    leafletLoadedRef.current = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => initMap();
    document.head.appendChild(js);
  }, []);

  function initMap() {
    if (mapRef.current || !mapDivRef.current) return;
    const map = (window as any).L.map(mapDivRef.current, {
      center: [28.0, 3.0],
      zoom: 5,
      zoomControl: true,
    });
    (window as any).L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OSM",
      opacity: 0.3,
    }).addTo(map);
    // Dark overlay style
    mapDivRef.current.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) saturate(1.5)";
    mapRef.current = map;
    // Géolocalisation
    navigator.geolocation?.getCurrentPosition(pos => {
      const {latitude: lat, longitude: lon} = pos.coords;
      setUserPos({lat, lon});
      const icon = (window as any).L.divIcon({
        html: `<div style="width:14px;height:14px;background:#00ff88;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #00ff88"></div>`,
        className: "", iconAnchor: [7,7]
      });
      (window as any).L.marker([lat, lon], {icon}).addTo(map)
        .bindPopup("<b>📍 VOTRE POSITION</b>").openPopup();
    });
  }

  const updateMapMarkers = useCallback((dets: Detection[]) => {
    if (!mapRef.current || !(window as any).L) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const filtered = filter === "all" ? dets : dets.filter(d => d.cat === filter);
    filtered.forEach(det => {
      const color = det.critical ? "#ff4444" : det.threatLevel >= 5 ? "#ff9500" : det.color;
      const size = det.critical ? 16 : 12;
      const icon = (window as any).L.divIcon({
        html: `<div title="${det.type}" style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50%;
          border:2px solid rgba(255,255,255,0.6);
          box-shadow:0 0 ${det.critical?'12px':'6px'} ${color};
          cursor:pointer;
          ${det.critical ? 'animation:pulse 1s infinite;' : ''}
        "></div>`,
        className: "", iconAnchor: [size/2, size/2]
      });
      const marker = (window as any).L.marker([det.lat, det.lon], {icon}).addTo(mapRef.current);
      marker.bindPopup(`
        <div style="font-family:monospace;font-size:11px;min-width:180px;">
          <div style="font-weight:700;color:${color}">${det.ico} ${det.type}</div>
          <div>Zone: <b>${det.wilaya}</b></div>
          <div>Source: ${det.source}</div>
          <div>Menace: <b>${det.threatLevel}/10</b></div>
          <div>Confiance: ${det.confidence}%</div>
          <div style="color:${det.critical?'#ff4444':'#ff9500'}">${det.status}</div>
          <div style="color:#999;font-size:9px;">${new Date(det.timestamp).toLocaleTimeString('fr-FR')}</div>
        </div>
      `);
      marker.on("click", () => setSelected(det));
      markersRef.current.push(marker);
    });
  }, [filter]);

  const fetchDetections = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/sentinel/detections?n=40"),
        fetch("/api/sentinel/stats")
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.success) {
        setDetections(d1.detections || []);
        setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
        updateMapMarkers(d1.detections || []);
      }
      if (d2.success) setStats(d2.stats);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [updateMapMarkers]);

  useEffect(() => {
    const timer = setTimeout(fetchDetections, 800);
    const iv = setInterval(fetchDetections, 20000);
    return () => { clearTimeout(timer); clearInterval(iv); };
  }, [fetchDetections]);

  useEffect(() => {
    if (detections.length > 0) updateMapMarkers(detections);
  }, [filter, detections, updateMapMarkers]);

  const cats = ["all","satellite","drone","radar","terrorisme","narco","armes","maritime","cyber","nrbc","incendie","espionnage"];
  const filtered = filter === "all" ? detections : detections.filter(d => d.cat === filter);
  const critiques = detections.filter(d => d.critical).length;

  return (
    <div style={{fontFamily:"'Rajdhani',sans-serif", color:"#cce0cc", padding:"12px"}}>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:"5px", marginBottom:"10px"}}>
        {[
          {label:"DÉTECTIONS", val:detections.length, color:"#00a855"},
          {label:"CRITIQUES", val:critiques, color:"#e63a2e"},
          {label:"EN ALERTE", val:detections.filter(d=>d.status==="ALERTE ORANGE").length, color:"#ff9500"},
          {label:"ZONES", val:stats?.zones_monitored||20, color:"#00e5cc"},
          {label:"SATELLITES", val:stats?.satellites_active||3, color:"#ffd700"},
        ].map(s=>(
          <div key={s.label} style={{background:"rgba(0,15,8,0.97)",border:`1px solid ${s.color}33`,padding:"8px",textAlign:"center"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:"7px",color:"rgba(200,220,200,0.45)",letterSpacing:"1px"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"8px",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setFilter(c)} style={{
              padding:"3px 8px",fontSize:"7px",fontFamily:"'Orbitron',monospace",letterSpacing:"1px",
              cursor:"pointer",border:"1px solid",textTransform:"uppercase",
              borderColor:filter===c?"#00a855":"rgba(0,98,51,0.3)",
              background:filter===c?"rgba(0,98,51,0.3)":"transparent",
              color:filter===c?"#00ff88":"rgba(200,220,200,0.4)"
            }}>{c}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"5px",alignItems:"center"}}>
          {lastUpdate && <span style={{fontSize:"7px",color:"rgba(0,229,204,0.5)",fontFamily:"'Orbitron',monospace"}}>MAJ {lastUpdate}</span>}
          <button onClick={()=>setView(v=>v==="carte"?"liste":"carte")} style={{
            padding:"4px 12px",fontSize:"8px",fontFamily:"'Orbitron',monospace",letterSpacing:"1px",
            background:"rgba(0,100,150,0.2)",border:"1px solid #00e5cc",color:"#00e5cc",cursor:"pointer"
          }}>{view==="carte"?"📋 LISTE":"🗺️ CARTE"}</button>
          <button onClick={fetchDetections} style={{
            padding:"4px 12px",fontSize:"8px",fontFamily:"'Orbitron',monospace",letterSpacing:"2px",
            background:"rgba(0,98,51,0.2)",border:"1px solid #00a855",color:"#00ff88",cursor:"pointer"
          }}>↻ REFRESH</button>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"80px",color:"#00a855",fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"4px"}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>🛡️</div>
          SCAN NATIONAL EN COURS...
        </div>
      ) : (
        <>
          {/* MAP VIEW */}
          {view==="carte" && (
            <div style={{position:"relative"}}>
              <div ref={mapDivRef} style={{
                width:"100%",height:"500px",border:"1px solid rgba(0,98,51,0.4)",
                borderRadius:"4px",overflow:"hidden",background:"#0a1a0e"
              }} />
              {/* Overlay info */}
              <div style={{position:"absolute",top:"8px",left:"8px",zIndex:1000,
                background:"rgba(2,8,3,0.92)",border:"1px solid rgba(0,98,51,0.4)",
                padding:"8px 12px",fontSize:"9px",fontFamily:"'Orbitron',monospace"}}>
                <div style={{color:"#00a855",marginBottom:"4px"}}>🇩🇿 ALGÉRIE SENTINEL</div>
                <div style={{color:"rgba(200,220,200,0.5)"}}>
                  {filtered.length} détections actives
                </div>
                {userPos && <div style={{color:"#00ff88",marginTop:"2px"}}>📍 GPS ACTIF</div>}
              </div>
              {/* Legend */}
              <div style={{position:"absolute",bottom:"8px",right:"8px",zIndex:1000,
                background:"rgba(2,8,3,0.92)",border:"1px solid rgba(0,98,51,0.3)",padding:"8px 10px"}}>
                {[{c:"#ff4444",l:"CRITIQUE"},{c:"#ff9500",l:"ALERTE"},{c:"#00a855",l:"SURVEILLANCE"}].map(item=>(
                  <div key={item.l} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:item.c}} />
                    <span style={{fontSize:"7px",color:"rgba(200,220,200,0.5)",fontFamily:"'Orbitron',monospace"}}>{item.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {view==="liste" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"5px",maxHeight:"520px",overflowY:"auto"}}>
              {filtered.length===0 ? (
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px",
                  color:"rgba(0,168,85,0.4)",fontFamily:"'Orbitron',monospace",fontSize:"10px"}}>
                  AUCUNE DÉTECTION — SECTEUR CALME
                </div>
              ) : filtered.map(det=>(
                <div key={det.id} onClick={()=>setSelected(det)} style={{
                  background:"rgba(3,10,5,0.97)",
                  border:`1px solid ${det.critical?det.color+"99":"rgba(0,98,51,0.2)"}`,
                  padding:"9px 11px",cursor:"pointer",
                  boxShadow:det.critical?`0 0 12px ${det.color}22`:"none",
                  transition:"all .15s"
                }}>
                  {det.critical && (
                    <div style={{float:"right",fontSize:"6px",fontFamily:"'Orbitron',monospace",
                      color:"#ff4444",animation:"blink 1s infinite"}}>● CRITIQUE</div>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px"}}>
                    <span style={{fontSize:"18px"}}>{det.ico}</span>
                    <div>
                      <div style={{fontSize:"9px",fontFamily:"'Orbitron',monospace",color:det.color,fontWeight:700}}>{det.type}</div>
                      <div style={{fontSize:"7px",color:"rgba(200,220,200,0.4)"}}>{det.source}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",fontSize:"8px",marginBottom:"5px"}}>
                    <div><span style={{color:"rgba(200,220,200,0.3)"}}>ZONE: </span><span style={{color:"#00e5cc"}}>{det.wilaya}</span></div>
                    <div><span style={{color:"rgba(200,220,200,0.3)"}}>CONF: </span><span style={{color:"#00ff88"}}>{det.confidence}%</span></div>
                    <div><span style={{color:"rgba(200,220,200,0.3)"}}>MENACE: </span>
                      <span style={{color:det.threatLevel>=8?"#ff4444":det.threatLevel>=5?"#ff9500":"#00a855",fontWeight:700}}>{det.threatLevel}/10</span>
                    </div>
                    <div style={{fontSize:"7px",color:"rgba(200,220,200,0.3)"}}>{new Date(det.timestamp).toLocaleTimeString("fr-FR")}</div>
                  </div>
                  <div style={{fontSize:"7px",padding:"2px 7px",display:"inline-block",
                    background:det.status==="ALERTE ROUGE"?"rgba(230,58,46,0.2)":det.status==="ALERTE ORANGE"?"rgba(255,149,0,0.15)":"rgba(0,98,51,0.15)",
                    border:`1px solid ${det.status==="ALERTE ROUGE"?"#e63a2e55":det.status==="ALERTE ORANGE"?"#ff950055":"#00623355"}`,
                    color:det.status==="ALERTE ROUGE"?"#ff6b6b":det.status==="ALERTE ORANGE"?"#ffb347":"#00a855",
                    fontFamily:"'Orbitron',monospace"
                  }}>{det.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Detail Panel */}
          {selected && (
            <div style={{marginTop:"10px",padding:"12px",
              background:"rgba(0,15,8,0.98)",border:`1px solid ${selected.color}66`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",color:selected.color,fontWeight:700}}>
                  {selected.ico} {selected.type}
                </div>
                <button onClick={()=>setSelected(null)} style={{
                  background:"transparent",border:"none",color:"rgba(200,220,200,0.4)",
                  fontSize:"16px",cursor:"pointer"
                }}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"8px",fontSize:"10px"}}>
                {[
                  {l:"WILAYA",v:selected.wilaya,c:"#00e5cc"},
                  {l:"SOURCE",v:selected.source,c:"#cce0cc"},
                  {l:"COORDONNÉES",v:`${selected.lat.toFixed(3)}°N ${selected.lon.toFixed(3)}°E`,c:"#00ff88"},
                  {l:"CONFIANCE",v:`${selected.confidence}%`,c:"#00ff88"},
                  {l:"NIVEAU MENACE",v:`${selected.threatLevel}/10`,c:selected.threatLevel>=8?"#ff4444":selected.threatLevel>=5?"#ff9500":"#00a855"},
                  {l:"CLASSIFICATION",v:selected.classification,c:"#ffd700"},
                  {l:"STATUT",v:selected.status,c:selected.critical?"#ff4444":"#ff9500"},
                  {l:"HORODATAGE",v:new Date(selected.timestamp).toLocaleString("fr-FR"),c:"rgba(200,220,200,0.5)"},
                ].map(item=>(
                  <div key={item.l}>
                    <div style={{fontSize:"7px",color:"rgba(200,220,200,0.3)",letterSpacing:"1px",marginBottom:"2px"}}>{item.l}</div>
                    <div style={{color:item.c,fontWeight:600}}>{item.v}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>{
                if(mapRef.current){
                  setView("carte");
                  setTimeout(()=>mapRef.current.setView([selected.lat,selected.lon],10),100);
                }
              }} style={{
                marginTop:"10px",padding:"5px 14px",fontSize:"8px",
                fontFamily:"'Orbitron',monospace",letterSpacing:"2px",
                background:"rgba(0,98,51,0.2)",border:"1px solid #00a855",
                color:"#00ff88",cursor:"pointer"
              }}>🗺️ VOIR SUR CARTE</button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
      `}</style>
    </div>
  );
}
