import { useState } from 'react';
import { useRouter } from 'next/router';
import { Shield, Users, Truck, Lock, ChevronRight } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState('public');
  const [unitId, setUnitId] = useState('Unit_Alpha');
  const [authKey, setAuthKey] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // 🔒 AUTHENTICATION LOGIC
    if (role === 'admin') {
      if (authKey !== 'ADMIN123') { setError('Invalid Admin PIN'); return; }
      router.push('/?role=admin');
    } 
    else if (role === 'unit') {
      if (authKey !== 'UNIT99') { setError('Invalid Unit Access Code'); return; }
      router.push(`/?role=unit&unitId=${unitId}`);
    } 
    else {
      // Public needs no auth
      router.push('/?role=public');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-cyan-500/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>

      <div className="m-auto w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 border border-slate-700 rounded-2xl mb-4 shadow-2xl shadow-cyan-900/20">
            <Shield className="w-8 h-8 text-cyan-500" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            CRISIS<span className="text-cyan-500">CTRL</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Secure Command Gateway</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-8 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {['public', 'unit', 'admin'].map((r) => (
              <button 
                key={r}
                onClick={() => { setRole(r); setError(''); }}
                className={`py-3 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center gap-1
                  ${role === r ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}
                `}
              >
                {r === 'public' && <Users size={16} />}
                {r === 'unit' && <Truck size={16} />}
                {r === 'admin' && <Shield size={16} />}
                {r}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {/* Unit Selector */}
            {role === 'unit' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-slate-400 ml-1">SELECT DEPLOYMENT UNIT</label>
                <select 
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full bg-slate-950 text-white p-4 rounded-xl border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none font-bold text-sm"
                >
                  <option value="Unit_Alpha">UNIT ALPHA (FIRE/RESCUE)</option>
                  <option value="Unit_Bravo">UNIT BRAVO (MEDICAL)</option>
                  <option value="Unit_Charlie">UNIT CHARLIE (SECURITY)</option>
                </select>
              </div>
            )}

            {/* Auth Input (Hidden for Public) */}
            {role !== 'public' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-slate-400 ml-1 flex items-center gap-1">
                  <Lock size={10} /> ACCESS CODE
                </label>
                <input 
                  type="password" 
                  placeholder={role === 'admin' ? "Admin PIN" : "Unit ID Code"}
                  value={authKey}
                  onChange={(e) => setAuthKey(e.target.value)}
                  className="w-full bg-slate-950 text-white p-4 rounded-xl border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono tracking-widest text-center"
                />
              </div>
            )}

            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}

            <button 
              onClick={handleLogin}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 group
                ${role === 'public' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 
                  role === 'unit' ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' : 
                  'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'}
              `}
            >
              ENTER PORTAL <ChevronRight className="group-hover:translate-x-1 transition-transform" size={16} />
            </button>
          </div>
        </div>
        
        <p className="text-center text-slate-600 text-xs mt-8">
          Restricted Access. Unauthorized entry is monitored.
        </p>
      </div>
    </div>
  );
}