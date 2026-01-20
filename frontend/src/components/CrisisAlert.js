import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Activity } from 'lucide-react';

export default function CrisisAlert({ criticalIncidents, onAcknowledge }) {
  const [currentAlert, setCurrentAlert] = useState(null);

  useEffect(() => {
    // Only show the top alert in the queue
    if (criticalIncidents.length > 0) {
      setCurrentAlert(criticalIncidents[0]);
    } else {
      setCurrentAlert(null);
    }
  }, [criticalIncidents]);

  if (!currentAlert) return null;

  // Safe ID retrieval
  const alertId = currentAlert.id || currentAlert._id;

  return (
    <AnimatePresence>
      <motion.div
        key={alertId} // Key ensures React remounts it properly
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-2xl"
      >
        <div className="mx-4 bg-slate-900/95 backdrop-blur-xl border-l-4 border-red-500 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden">
          
          <div className="bg-red-500/10 p-4 flex items-center justify-between border-b border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-full animate-pulse">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-red-400 font-black tracking-widest text-lg">CRITICAL THREAT DETECTED</h2>
                <p className="text-red-300/70 text-xs font-mono">AI-ANALYSIS: SEVERITY {currentAlert.ai_score}%</p>
              </div>
            </div>
            <button 
              onClick={() => onAcknowledge(alertId)}
              className="p-2 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="text-red-400" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-4 gap-6">
            <div className="col-span-3">
              <h3 className="text-2xl text-white font-bold mb-1">{currentAlert.type}</h3>
              <p className="text-slate-400 text-sm mb-4">{currentAlert.description}</p>
              
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-cyan-500 font-mono text-xs block mb-1">RECOMMENDED ACTION:</span>
                <span className="text-cyan-100 font-bold text-sm tracking-wide">
                  {currentAlert.ai_recommendation}
                </span>
              </div>
            </div>

            <div className="col-span-1 flex flex-col items-center justify-center border-l border-slate-800 pl-6">
              <Activity className="text-red-500 mb-2 animate-bounce" size={32} />
              <span className="text-4xl font-black text-white">{currentAlert.ai_score}</span>
              <span className="text-xs text-slate-500 uppercase">Risk Level</span>
            </div>
          </div>
          
          <div className="h-1 w-full bg-slate-800">
            <div className="h-full bg-red-500 w-[90%] shadow-[0_0_10px_#ef4444]"></div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}