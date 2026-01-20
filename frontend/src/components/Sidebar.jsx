import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { AlertTriangle, Shield, Activity, Navigation, Check, Clock, MapPin } from 'lucide-react';

export default function Sidebar({ incidents, unitType, onResolve, onRoute, onThreatChange, role }) {
  const safeIncidents = Array.isArray(incidents) ? incidents : [];

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] border-r border-slate-800/50 shadow-2xl relative z-30">
      
      {/* 1. Stylish Header */}
      <div className="p-6 bg-slate-950/50 backdrop-blur border-b border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-2">
             <div className="w-2 h-8 bg-cyan-500 rounded-full"></div>
             CRISIS<span className="text-cyan-500">CTRL</span>
          </h1>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            V2.4 LIVE
          </span>
        </div>
        <p className="text-xs text-slate-400 pl-4 font-medium tracking-wide">
          SECTOR CONTROL DASHBOARD
        </p>
      </div>
      
      {/* 2. Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#0f172a] to-[#020617]">
        <LayoutGroup>
          <AnimatePresence>
            {safeIncidents.map((inc) => {
              const isCritical = ['Critical', 'High'].includes(inc.severity) || inc.is_critical;
              
              return (
                <motion.div
                  layout
                  key={inc.id || inc._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative group rounded-xl border transition-all duration-300 overflow-hidden
                    ${isCritical 
                      ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800'}
                  `}
                >
                  {/* Critical Stripe Indicator */}
                  {isCritical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>}

                  <div className="p-4 pl-5">
                    {/* Top Row: Type & Icon */}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`text-sm font-bold tracking-wide uppercase ${isCritical ? 'text-red-400' : 'text-cyan-400'}`}>
                        {inc.type}
                      </h4>
                      {isCritical && <AlertTriangle className="text-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" size={18} />}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed mb-4 border-l-2 border-slate-800 pl-3">
                      {inc.description}
                    </p>

                    {/* Meta Data Row */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono mb-4">
                       <span className="flex items-center gap-1"><Clock size={10} /> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       <span className="flex items-center gap-1"><MapPin size={10} /> LOC-{(inc.id || "").slice(-4)}</span>
                    </div>

                    {/* --- CONTROLS SECTION --- */}

                    {/* Unit Controls */}
                    {role === 'unit' && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/50">
                         <button 
                           onClick={() => onRoute(inc.lat || inc.location?.lat, inc.lng || inc.location?.lng)}
                           className="flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-[10px] font-bold py-2 rounded-lg transition-all"
                         >
                           <Navigation size={12} /> ROUTE
                         </button>
                         <button 
                           onClick={() => onResolve(inc.id || inc._id)}
                           className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30 text-[10px] font-bold py-2 rounded-lg transition-all"
                         >
                           <Check size={12} /> CLEAR
                         </button>
                      </div>
                    )}

                    {/* Admin Controls */}
                    {role === 'admin' && (
                      <div className="pt-3 border-t border-slate-800/50">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Threat Override</label>
                          <select 
                              value={inc.severity}
                              onChange={(e) => onThreatChange(inc.id || inc._id, e.target.value)}
                              className="w-full bg-slate-950 text-xs text-slate-300 p-2 rounded-lg border border-slate-700 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                          >
                              <option value="Low">LOW SEVERITY</option>
                              <option value="High">HIGH ALERT</option>
                              <option value="Critical">CRITICAL THREAT</option>
                          </select>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
        
        {safeIncidents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 opacity-50">
                <Shield size={40} className="mb-2" />
                <p className="text-xs font-bold tracking-widest">SECTOR SECURE</p>
            </div>
        )}
      </div>
    </div>
  );
}