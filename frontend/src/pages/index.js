import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import { Shield, Navigation, Users, Truck } from 'lucide-react';
import CrisisAlert from '../components/CrisisAlert'; 
import { analyzeIncident } from '../utils/aiEngine'; 
import SOSButton from '../components/SOSButton'; 
import AnalyticsPanel from '../components/AnalyticsPanel'; 

const CommandMap = dynamic(() => import('../components/CommandMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-500">CONNECTING...</div>,
});

const socket = io('http://localhost:5001');

// Mock Unit Locations
const UNIT_LOCATIONS = {
    'Unit_Alpha': [13.0827, 80.2707], 
    'Unit_Bravo': [11.0168, 76.9558], 
    'Unit_Charlie': [9.9252, 78.1198] 
};

export default function Dashboard() {
  const router = useRouter();
  
  // State
  const [incidents, setIncidents] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [stats, setStats] = useState({});
  const [criticalQueue, setCriticalQueue] = useState([]);
  const [routeDest, setRouteDest] = useState(null); 
  
  // Identity State
  const [role, setRole] = useState('public');
  const [unitId, setUnitId] = useState(null);

  const alertSound = useRef(null);

  // 1. SECURITY CHECK
  useEffect(() => {
    if (router.isReady) {
      if (!router.query.role) {
        router.push('/login');
      } else {
        const { role: paramRole, unitId: paramUnit } = router.query;
        if (paramRole) setRole(paramRole);
        if (paramUnit) setUnitId(paramUnit);
      }
    }
  }, [router.isReady, router.query]);

  // Normalizer
  const normalizeIncident = (raw) => ({
    ...raw,
    id: raw.id || raw._id, 
    lat: raw.lat || raw.location?.lat,
    lng: raw.lng || raw.location?.lng,
  });

  useEffect(() => {
    alertSound.current = new Audio('/alert.mp3');
    alertSound.current.volume = 0.8;

    // Load Initial Data
    axios.get('http://localhost:5001/api/reports')
      .then(res => {
        let rawData = res.data.reports || [];
        if (!Array.isArray(rawData)) rawData = [];
        const analyzedData = rawData.map(item => analyzeIncident(normalizeIncident(item)));
        setIncidents(analyzedData);
        if (res.data.riskZones) setRiskZones(res.data.riskZones);
        if (res.data.stats) setStats(res.data.stats);
      })
      .catch(err => console.error("API Error:", err));

    // Listeners
    socket.on('new-incident', newReport => {
      const cleanReport = normalizeIncident(newReport);
      const analyzedReport = analyzeIncident(cleanReport);
      setIncidents(prev => [analyzedReport, ...prev]);
      
      if (analyzedReport.is_critical && role !== 'public') {
         setCriticalQueue(prev => [analyzedReport, ...prev]);
         if (alertSound.current) alertSound.current.play().catch(e => console.warn(e));
      }
    });

    // ✅ FIXED: Listen for global updates (like Admin Override)
    socket.on('incident-update', updatedIncident => {
      const cleanUpdate = normalizeIncident(updatedIncident);
      const analyzedUpdate = analyzeIncident(cleanUpdate);
      setIncidents(prev => prev.map(inc => inc.id === analyzedUpdate.id ? analyzedUpdate : inc));
    });

    // ✅ FIXED: Listen for resolutions (Syncs "Clear" action)
    socket.on('incident-resolved', (resolvedId) => {
        setIncidents(prev => prev.filter(i => i.id !== resolvedId));
        setCriticalQueue(prev => prev.filter(i => i.id !== resolvedId));
    });

    socket.on('stats-update', newStats => setStats(newStats));

    return () => { 
        socket.off('new-incident'); 
        socket.off('incident-update');
        socket.off('stats-update');
        socket.off('incident-resolved'); 
    };
  }, [role]);

  // ACTIONS

  const handleResolve = (id) => {
    // Emits to server so EVERYONE removes it, not just me
    socket.emit('resolve-incident', id);
    setRouteDest(null); 
  };

  const handleRoute = (lat, lng) => {
    setRouteDest([lat, lng]);
  };

  const handleThreatChange = (id, newSeverity) => {
    // ✅ FIXED: Emits to server to update database/memory
    socket.emit('update-threat', { id: id, severity: newSeverity });
  };

  const displayedIncidents = role === 'unit' 
    ? incidents.filter(i => i.assignedUnit === unitId || i.assignedUnit === 'Unassigned')
    : incidents;

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans relative">
      
      {/* Top Bar */}
      <div className="absolute top-4 left-4 z-[2000] flex bg-slate-900 rounded-lg p-2 border border-slate-700 shadow-2xl items-center gap-4">
        <div className={`px-3 py-1 rounded text-xs font-bold uppercase flex items-center gap-2 ${role === 'admin' ? 'bg-cyan-600' : role === 'unit' ? 'bg-green-600' : 'bg-indigo-600'}`}>
             {role === 'admin' ? <Shield size={14}/> : role === 'unit' ? <Truck size={14}/> : <Users size={14}/>}
             {role} {unitId ? `(${unitId})` : ''}
        </div>
        <button onClick={() => router.push('/login')} className="text-xs text-slate-400 hover:text-white">Logout</button>
      </div>

      {role !== 'public' && (
          <>
            <AnalyticsPanel stats={stats} />
            <CrisisAlert criticalIncidents={criticalQueue} onAcknowledge={(id) => setCriticalQueue(prev => prev.filter(i => i.id !== id))} />
          </>
      )}

      {role !== 'public' && (
        <div className="w-[400px] flex-shrink-0 z-20 shadow-2xl h-full flex flex-col border-r border-slate-800 pt-16">
            <Sidebar 
                incidents={displayedIncidents} 
                unitType={role === 'unit' ? unitId : null}
                onResolve={role === 'unit' ? handleResolve : null} 
                onRoute={role === 'unit' ? handleRoute : null} 
                onThreatChange={role === 'admin' ? handleThreatChange : null} 
                role={role}
            />
        </div>
      )}

      <div className="flex-1 relative bg-slate-900">
        <CommandMap 
            incidents={displayedIncidents} 
            riskZones={riskZones} 
            viewMode={role}
            unitLocation={role === 'unit' ? UNIT_LOCATIONS[unitId] : null}
            routeDestination={routeDest}
        />
        
        {role === 'public' && <SOSButton />}
        
        {role === 'unit' && routeDest && (
          <div className="absolute bottom-10 left-10 z-[1000] bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-green-500/50 shadow-2xl max-w-md animate-pulse">
            <h3 className="text-green-400 font-bold text-sm flex items-center gap-2">
                <Navigation size={14} /> NAVIGATING TO INCIDENT
            </h3>
            <p className="text-slate-400 text-xs mt-1">Shortest path calculated via Routing Machine.</p>
          </div>
        )}
      </div>
    </div>
  );
}