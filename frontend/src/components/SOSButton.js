import { useState } from 'react';
import axios from 'axios';
import { Siren, Loader2, X, MapPin } from 'lucide-react';

export default function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('initial'); // initial, form, sending, done

  // Form State
  const [formData, setFormData] = useState({
    type: 'Medical Emergency',
    severity: 'High',
    description: ''
  });

  const getLocationAndSend = () => {
    setStep('sending');
    setLoading(true);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const realLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          await axios.post('http://localhost:5001/api/sos', {
            ...formData,
            location: realLocation
          });
          setStep('done');
        } catch (err) {
            console.error(err);
            alert("Failed to send alert. Please call 100/112.");
            setStep('form');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        alert("Unable to retrieve location. Please enable GPS.");
        setLoading(false);
        setStep('form');
      },
      { enableHighAccuracy: true } // FORCE HIGH ACCURACY GPS
    );
  };

  // Close and Reset
  const handleClose = () => {
    setIsOpen(false);
    setStep('initial');
    setFormData({ type: 'Medical Emergency', severity: 'High', description: '' });
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => { setIsOpen(true); setStep('form'); }}
        className="fixed bottom-6 right-6 z-[9999] bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border-4 border-red-500 animate-pulse"
      >
        <Siren className="animate-bounce" /> SOS ALERT
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 w-full max-w-md rounded-xl p-6 shadow-2xl relative">
            
            <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>

            {step === 'form' && (
              <div className="space-y-4">
                <div className="text-center border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-black text-red-500 flex items-center justify-center gap-2">
                    <Siren /> EMERGENCY REPORT
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Your location will be shared with response units.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">INCIDENT TYPE</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-red-500 outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Medical Emergency</option>
                    <option>Fire / Explosion</option>
                    <option>Flood / Water Logging</option>
                    <option>Road Accident</option>
                    <option>Violence / Harassment</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">SEVERITY LEVEL</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Low', 'High', 'Critical'].map((level) => (
                      <button 
                        key={level}
                        onClick={() => setFormData({...formData, severity: level})}
                        className={`py-2 rounded text-sm font-bold border transition-colors ${
                          formData.severity === level 
                          ? 'bg-red-600 border-red-500 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">DETAILS (Optional)</label>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-red-500 outline-none h-24 resize-none"
                    placeholder="Describe the situation..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <button 
                  onClick={getLocationAndSend}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
                >
                  <MapPin size={18} /> SHARE GPS & REQUEST HELP
                </button>
              </div>
            )}

            {step === 'sending' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="animate-spin text-red-500" size={48} />
                <p className="text-white font-bold animate-pulse">ACQUIRING SATELLITE LOCK...</p>
                <p className="text-slate-500 text-xs">Please allow location access if prompted.</p>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500">
                  <Siren size={40} className="text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white">ALERT SENT</h3>
                <p className="text-slate-300 text-sm">Rescue units have received your coordinates.</p>
                <button onClick={handleClose} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded mt-4">Close</button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}