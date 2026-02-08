import { useState, useEffect } from 'react';
import { Zap, X, Mic } from 'lucide-react';
import axios from 'axios';

const GlobalCallState = {
  isActive: false,
  currentQuestion: '',
  isListening: false,
  transcript: '',
  questionIndex: 0,
  answers: ['', '', ''],
  listeners: new Set(),
  notify() { this.listeners.forEach(fn => fn()); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
};

let wakeWordListener = null;
let recognitionInstance = null;
const questions = [
  "What type of incident? Say fire, medical, security, or other.",
  "How severe is it? Say low, medium, or high.",
  "Any additional information?"
];

export default function VoiceCallButton({ userEmail = 'CrisisCtrl1@gmail.com', onCallComplete = null }) {
  const [, forceUpdate] = useState({});
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [micPermission, setMicPermission] = useState(null);
  
  useEffect(() => GlobalCallState.subscribe(() => forceUpdate({})), []);

  // Request microphone permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices) return; // Skip if not available
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('✅ Microphone permission granted');
        setMicPermission(true);
      })
      .catch((err) => {
        console.error('❌ Microphone permission denied:', err);
        setMicPermission(false);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window) || micPermission !== true) {
      if (micPermission === false) {
        console.log('❌ Cannot start wake word - no mic permission');
      }
      return;
    }
    
    if (!GlobalCallState.isActive && !wakeWordListener) {
      console.log('🎤 Initializing wake word listener...');
      wakeWordListener = new window.webkitSpeechRecognition();
      wakeWordListener.lang = 'en-US';
      wakeWordListener.continuous = true;
      wakeWordListener.interimResults = true;
      
      wakeWordListener.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const said = event.results[i][0].transcript.toLowerCase();
          console.log('🎤 Heard:', said);
          if ((said.includes('crisis') || said.includes('chris') || said.includes('chrysis')) && 
              (said.includes('control') || said.includes('ctrl')) && said.includes('help')) {
            console.log('✅ WAKE WORD DETECTED!');
            if (wakeWordListener) {
              try {
                wakeWordListener.stop();
              } catch(e) {}
              wakeWordListener = null;
            }
            startCall();
            break;
          }
        }
      };
      
      wakeWordListener.onerror = (e) => { 
        console.log('Wake error:', e.error); 
        if (e.error === 'not-allowed') {
          setMicPermission(false);
        }
      };
      
      wakeWordListener.onend = () => {
        if (!GlobalCallState.isActive && wakeWordListener && micPermission === true) {
          console.log('🔄 Restarting wake word listener...');
          setTimeout(() => { 
            try { 
              wakeWordListener.start(); 
            } catch(e) { 
              console.log('Wake restart failed:', e); 
              wakeWordListener = null; 
            } 
          }, 500);
        }
      };
      
      try {
        wakeWordListener.start();
        setIsWakeWordActive(true);
        console.log('✅ WAKE WORD ACTIVE - Say "crisis control help"');
      } catch(e) { 
        console.log('Wake word start failed:', e);
        wakeWordListener = null; 
      }
    }
    
    return () => { 
      if (wakeWordListener) { 
        try { 
          console.log('🛑 Cleaning up wake word listener');
          wakeWordListener.stop(); 
          wakeWordListener = null; 
          setIsWakeWordActive(false);
        } catch(e) {} 
      } 
    };
  }, [micPermission]);

  const startCall = () => {
    if (GlobalCallState.isActive) { console.log('⚠️ Call already active'); return; }
    console.log('🚀 STARTING CALL');
    GlobalCallState.isActive = true;
    GlobalCallState.questionIndex = 0;
    GlobalCallState.answers = ['', '', ''];
    GlobalCallState.currentQuestion = '';
    GlobalCallState.transcript = '';
    GlobalCallState.isListening = false;
    GlobalCallState.notify();
    if (wakeWordListener) { try { wakeWordListener.stop(); wakeWordListener = null; } catch(e) {} }
    
    // Test speech to enable browser audio (autoplay policy workaround)
    const testUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(testUtterance);
    
    setTimeout(() => speak(questions[0], 0), 1000);
  };

  const speak = (text, qIndex) => {
    console.log('🗣️ AI SPEAKING Q', qIndex + 1, ':', text);
    GlobalCallState.currentQuestion = text;
    GlobalCallState.questionIndex = qIndex;
    GlobalCallState.notify();
    
    // Force cancel all existing speech
    window.speechSynthesis.cancel();
    
    // Wait longer to ensure cancellation completes
    setTimeout(() => {
      window.speechSynthesis.cancel(); // Double check
      
      let speechStarted = false;
      let speechCompleted = false;
      let fallbackTimeout = setTimeout(() => {
        if (!speechStarted && !speechCompleted) {
          console.log('⚠️ Speech timeout after 5s - proceeding to listen');
          listen(qIndex);
        }
      }, 5000); // Increased to 5 seconds
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      
      const speakNow = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google') || v.name.includes('Microsoft'));
          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log('🎤 Using voice:', femaleVoice.name);
          }
        }
        
        utterance.onstart = () => { 
          console.log('✅ Speech started for Q', qIndex + 1); 
          speechStarted = true;
          clearTimeout(fallbackTimeout);
        };
        
        utterance.onend = () => { 
          console.log('✅ Speech completed for Q', qIndex + 1);
          speechCompleted = true;
          clearTimeout(fallbackTimeout);
          setTimeout(() => {
            console.log('🎧 Now starting to listen for Q', qIndex + 1);
            listen(qIndex);
          }, 800); 
        };
        
        utterance.onerror = (e) => { 
          console.error('❌ Speech error for Q', qIndex + 1, ':', e.error);
          clearTimeout(fallbackTimeout);
          if (!speechCompleted) {
            console.log('⚠️ Proceeding to listen despite error');
            setTimeout(() => listen(qIndex), 500); 
          }
        };
        
        console.log('🔊 Attempting to speak Q', qIndex + 1, '...');
        try {
          window.speechSynthesis.speak(utterance);
          // Log queue status
          setTimeout(() => {
            console.log('📊 Speech queue - speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending);
          }, 100);
        } catch(e) {
          console.error('💥 Speech exception:', e);
          clearTimeout(fallbackTimeout);
          listen(qIndex);
        }
      };
      
      // Check if voices are loaded
      if (window.speechSynthesis.getVoices().length > 0) {
        speakNow();
      } else {
        console.log('⏳ Waiting for voices to load...');
        window.speechSynthesis.onvoiceschanged = speakNow;
      }
    }, 300); // Wait for cancel to complete
  };

  const listen = (currentQIndex) => {
    console.log('🎧 LISTENING for Q', currentQIndex + 1);
    GlobalCallState.isListening = true;
    GlobalCallState.transcript = '';
    GlobalCallState.notify();
    
    if (recognitionInstance) { 
      try { 
        recognitionInstance.stop(); 
      } catch(e) { 
        console.log('Error stopping old recognition:', e);
      } 
    }
    
    recognitionInstance = new window.webkitSpeechRecognition();
    recognitionInstance.lang = 'en-US';
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    
    let silenceTimer = null;
    let finalTranscript = '';
    let hasStarted = false;
    
    recognitionInstance.onstart = () => {
      hasStarted = true;
      console.log('✅ Recognition started for Q', currentQIndex + 1);
    };
    
    recognitionInstance.onresult = (event) => {
      clearTimeout(silenceTimer);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log('📝 Heard:', transcript, '(isFinal:', event.results[i].isFinal, ')');
        if (event.results[i].isFinal) {
          finalTranscript = transcript;
        } else {
          interim = transcript;
        }
      }
      GlobalCallState.transcript = finalTranscript || interim;
      GlobalCallState.notify();
      
      // Wait 2 seconds of silence before moving on
      silenceTimer = setTimeout(() => {
        if (finalTranscript || interim) {
          const answer = finalTranscript || interim;
          console.log('✅ Got answer:', answer);
          try {
            recognitionInstance.stop();
          } catch(e) {}
          GlobalCallState.isListening = false;
          GlobalCallState.answers[currentQIndex] = answer;
          GlobalCallState.notify();
          setTimeout(() => {
            const nextIndex = currentQIndex + 1;
            if (nextIndex < questions.length) {
              speak(questions[nextIndex], nextIndex);
            } else {
              submitReport(GlobalCallState.answers);
            }
          }, 1000);
        }
      }, 2000);
    };
    
    recognitionInstance.onerror = (e) => { 
      console.error('❌ Recognition error:', e.error); 
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        alert('Microphone permission denied. Please enable microphone access and try again.');
        GlobalCallState.isListening = false;
        GlobalCallState.notify();
        endCall();
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.log('Non-critical error, continuing...');
      }
    };
    
    recognitionInstance.onend = () => { 
      clearTimeout(silenceTimer); 
      console.log('🛑 Recognition ended', hasStarted ? '(was started)' : '(never started)');
      if (!hasStarted) {
        console.log('⚠️ Recognition never started - retrying...');
        setTimeout(() => listen(currentQIndex), 500);
      }
    };
    try { recognitionInstance.start(); } catch(e) { console.error('Failed to start recognition:', e); GlobalCallState.isListening = false; GlobalCallState.notify(); }
  };

  const submitReport = (finalAnswers) => {
    console.log('📤 SUBMITTING REPORT:', finalAnswers);
    console.log('Answer 0 (type):', finalAnswers[0]);
    console.log('Answer 1 (severity):', finalAnswers[1]);
    console.log('Answer 2 (description):', finalAnswers[2]);
    
    GlobalCallState.currentQuestion = 'Submitting your report...';
    GlobalCallState.isListening = false;
    GlobalCallState.notify();
    
    // Robust severity detection - EXACT MAPPING
    const detectSeverity = (text) => {
      if (!text) {
        console.log('⚠️ No severity text, defaulting to Medium');
        return 'Medium';
      }
      const lower = text.toLowerCase().trim();
      console.log('🔍 Detecting severity from:', `"${lower}"`);
      
      // Remove common filler words that might interfere
      const cleaned = lower.replace(/\b(it's|its|is|very|really|quite|pretty|somewhat)\b/g, '').trim();
      console.log('🧹 After cleaning:', `"${cleaned}"`);
      
      // EXACT MAPPING: low=Low, medium=Medium, high/hi=Critical
      if (cleaned.includes('low') || cleaned.includes('minor') || cleaned.includes('small')) {
        console.log('✅ Detected: Low');
        return 'Low';
      }
      if (cleaned.includes('medium') || cleaned.includes('moderate') || cleaned.includes('med') || cleaned.includes('mid')) {
        console.log('✅ Detected: Medium');
        return 'Medium';
      }
      if (cleaned.includes('high') || cleaned.includes('hi') || cleaned.includes('critical') || cleaned.includes('severe')) {
        console.log('✅ Detected: Critical');
        return 'Critical';
      }
      console.log('⚠️ No match, defaulting to Medium');
      return 'Medium'; // Default
    };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const reportData = {
            type: finalAnswers[0] || 'Unknown',
            severity: detectSeverity(finalAnswers[1]),
            description: finalAnswers[2] || 'No additional info',
            email: userEmail,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          };
          sendReport(reportData);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          const reportData = {
            type: finalAnswers[0] || 'Unknown',
            severity: detectSeverity(finalAnswers[1]),
            description: finalAnswers[2] || 'No additional info',
            email: userEmail,
            location: { lat: 13.0827, lng: 80.2707 }
          };
          sendReport(reportData);
        }
      );
    } else {
      const reportData = {
        type: finalAnswers[0] || 'Unknown',
        severity: detectSeverity(finalAnswers[1]),
        description: finalAnswers[2] || 'No additional info',
        email: userEmail,
        location: { lat: 13.0827, lng: 80.2707 }
      };
      sendReport(reportData);
    }
  };

  const sendReport = (data) => {
    console.log('📡 SENDING TO BACKEND:', JSON.stringify(data, null, 2));
    axios.post('http://localhost:5001/api/sos', data)
      .then(() => {
        console.log('✅ Report submitted successfully');
        GlobalCallState.currentQuestion = '✅ Report submitted! Thank you.';
        GlobalCallState.notify();
        setTimeout(() => { endCall(); if (onCallComplete) onCallComplete(); }, 2000);
      })
      .catch((error) => {
        console.error('❌ Failed to submit:', error);
        GlobalCallState.currentQuestion = '❌ Failed. Please try again.';
        GlobalCallState.notify();
        setTimeout(endCall, 3000);
      });
  };

  const endCall = () => {
    console.log('Ending call');
    if (recognitionInstance) { try { recognitionInstance.stop(); } catch(e) {} recognitionInstance = null; }
    window.speechSynthesis.cancel();
    GlobalCallState.isActive = false;
    GlobalCallState.currentQuestion = '';
    GlobalCallState.transcript = '';
    GlobalCallState.questionIndex = 0;
    GlobalCallState.isListening = false;
    GlobalCallState.notify();
  };

  return (
    <>
      {/* Wake Word Status Badge */}
      {!GlobalCallState.isActive && isWakeWordActive && (
        <div className="fixed bottom-24 right-28 z-[999] bg-blue-900/90 backdrop-blur-sm border border-blue-500 rounded-lg px-3 py-1 shadow-lg">
          <p className="text-blue-100 text-xs font-bold whitespace-nowrap flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Wake word active
          </p>
        </div>
      )}
      
      {/* Microphone Permission Denied Warning */}
      {micPermission === false && !GlobalCallState.isActive && (
        <div className="fixed bottom-24 right-28 z-[999] bg-red-900/90 backdrop-blur-sm border border-red-500 rounded-lg px-3 py-1 shadow-lg">
          <p className="text-red-100 text-xs font-bold whitespace-nowrap">
            🎤 Mic access denied
          </p>
        </div>
      )}
      
      <button
        onClick={GlobalCallState.isActive ? endCall : startCall}
        className={`fixed bottom-32 right-8 z-[1000] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${
          GlobalCallState.isActive ? 'bg-red-600 animate-pulse' : 
          micPermission === false ? 'bg-gray-600' : 
          'bg-blue-600 animate-pulse'
        }`}
        disabled={micPermission === false && !GlobalCallState.isActive}
        title={micPermission === false ? 'Microphone access denied' : 'Start emergency voice call'}
      >
        {GlobalCallState.isActive ? <X className="w-8 h-8 text-white" /> : <Zap className="w-8 h-8 text-white" />}
      </button>

      {GlobalCallState.isActive && (
        <div className="fixed bottom-56 right-8 z-[9999] bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-500 rounded-2xl p-6 max-w-sm shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg"> Emergency Call</h3>
            <button onClick={endCall} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-2">AI:</p>
              <p className="text-white text-sm font-semibold">{GlobalCallState.currentQuestion}</p>
            </div>
            {GlobalCallState.isListening && (
              <div className="bg-red-600 rounded-lg p-6 text-center">
                <Mic className="w-12 h-12 text-white mx-auto mb-3 animate-pulse" />
                <p className="text-white font-bold text-2xl mb-2">🎧 LISTENING</p>
                <p className="text-red-100 text-sm mb-3">Speak your answer now!</p>
                {GlobalCallState.transcript && (
                  <div className="bg-red-900/50 border border-red-300 rounded-lg p-3 mt-3">
                    <p className="text-red-200 text-xs mb-1">Hearing:</p>
                    <p className="text-white font-semibold text-lg">{GlobalCallState.transcript}</p>
                  </div>
                )}
              </div>
            )}
            {GlobalCallState.transcript && !GlobalCallState.isListening && (
              <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-4">
                <p className="text-green-400 text-xs mb-1">You said:</p>
                <p className="text-white font-semibold">{GlobalCallState.transcript}</p>
              </div>
            )}
            <div className="text-center text-slate-400 text-xs">Question {GlobalCallState.questionIndex + 1} of 3</div>
          </div>
        </div>
      )}
    </>
  );
}
