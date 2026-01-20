import { Activity, CheckCircle, AlertOctagon, Radio } from 'lucide-react';

export default function AnalyticsPanel({ stats }) {
  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
      {/* Container - blurred glass effect */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl w-64 pointer-events-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
          Live Sector Analytics
        </h3>

        {/* Grid of Stats */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Active Incidents */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono">ACTIVE THREATS</span>
            <div className="flex items-center gap-2 text-cyan-400">
              <Radio size={16} className="animate-pulse" />
              <span className="text-xl font-black">{stats.active || 0}</span>
            </div>
          </div>

          {/* Critical */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono">CRITICAL</span>
            <div className="flex items-center gap-2 text-red-500">
              <AlertOctagon size={16} />
              <span className="text-xl font-black">{stats.critical || 0}</span>
            </div>
          </div>

          {/* Resolved */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono">RESOLVED</span>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle size={16} />
              <span className="text-xl font-black">{stats.resolved || 0}</span>
            </div>
          </div>

          {/* System Status */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono">SYSTEM LOAD</span>
            <div className="flex items-center gap-2 text-yellow-500">
              <Activity size={16} />
              <span className="text-xl font-black">98%</span>
            </div>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Clearance Rate</span>
            <span>{Math.round((stats.resolved / stats.total) * 100) || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-1000" 
              style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
            ></div>
          </div>
        </div>

      </div>
    </div>
  );
}