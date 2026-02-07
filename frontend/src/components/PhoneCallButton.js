import { useState, useEffect } from 'react';
import { Phone, Zap, X } from 'lucide-react';
import axios from 'axios';

export default function PhoneCallButton({ userEmail = 'CrisisCtrl1@gmail.com' }) {
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch CrisisCtrl emergency phone number from backend
    axios.get('http://localhost:5001/api/telephony/number')
      .then(res => {
        setPhoneNumber(res.data.phone_number);
        setLoading(false);
      })
      .catch(err => {
        console.log('Telephony not configured, using browser fallback');
        setPhoneNumber(null);
        setLoading(false);
      });
  }, []);

  const handleCall = () => {
    if (phoneNumber) {
      setShowModal(true);
    }
  };

  const formatPhoneNumber = (num) => {
    if (!num) return '';
    // Format: +1 (234) 567-890
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+${cleaned[0]} (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
    }
    return num;
  };

  if (loading) {
    return (
      <button
        className="fixed bottom-52 right-8 z-[1000] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center bg-green-600 animate-pulse"
        disabled
      >
        <Phone className="w-8 h-8 text-white animate-spin" />
      </button>
    );
  }

  // If no Twilio configured, show fallback message
  if (!phoneNumber) {
    return (
      <div className="fixed bottom-52 right-8 z-[1000] bg-yellow-900/90 backdrop-blur-xl border-2 border-yellow-500 rounded-2xl p-4 max-w-xs shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h3 className="text-white font-bold text-sm">Emergency Hotline</h3>
        </div>
        <p className="text-yellow-200 text-xs">
          Phone system not configured. Contact admin to set up Twilio for real emergency calls.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Emergency Call Button */}
      <button
        onClick={handleCall}
        className="fixed bottom-52 right-8 z-[1000] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 bg-green-600 hover:bg-green-500"
        aria-label="Emergency Hotline"
      >
        <Phone className="w-8 h-8 text-white" />
      </button>

      {/* Quick Access Number Badge */}
      {!showModal && (
        <div className="fixed bottom-44 right-28 z-[999] bg-green-900/90 backdrop-blur-sm border border-green-500 rounded-lg px-3 py-1 shadow-lg">
          <p className="text-green-100 text-xs font-mono font-bold whitespace-nowrap">
            {formatPhoneNumber(phoneNumber)}
          </p>
        </div>
      )}

      {/* Call Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
             onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border-2 border-green-500 rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95"
               onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Emergency Hotline</h2>
                  <p className="text-red-400 text-sm">24/7 AI-Assisted Response</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} 
                      className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Phone Number Display */}
            <div className="bg-slate-950 border-2 border-red-500 rounded-xl p-6 mb-6 text-center">
              <p className="text-slate-400 text-sm mb-2">Call This Number:</p>
              <a href={`tel:${phoneNumber}`}
                 className="text-4xl font-bold text-red-400 hover:text-red-300 font-mono tracking-wider block">
                {formatPhoneNumber(phoneNumber)}
              </a>
              <p className="text-slate-500 text-xs mt-2">Tap to dial on mobile</p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs">1</span>
                  What to Expect
                </h3>
                <ul className="text-slate-300 text-xs space-y-2 ml-8">
                  <li>• AI assistant will answer immediately</li>
                  <li>• 3 simple questions about the emergency</li>
                  <li>• Takes ~1 minute to complete</li>
                  <li>• Units dispatched automatically</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs">2</span>
                  Stay Calm & Listen
                </h3>
                <p className="text-slate-300 text-xs ml-8">
                  Speak clearly when prompted. The AI will guide you through the report.
                </p>
              </div>

              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-400 text-xs text-center font-semibold">
                  ✅ Your report will be broadcast to all emergency units in your area
                </p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-6 flex gap-3">
              <a href={`tel:${phoneNumber}`}
                 className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                <Phone size={20} />
                CALL NOW
              </a>
              <button onClick={() => setShowModal(false)}
                      className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all">
                Close
              </button>
            </div>

            {/* Footer */}
            <p className="text-slate-600 text-xs text-center mt-4">
              Standard call charges may apply. Your location is automatically detected.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
