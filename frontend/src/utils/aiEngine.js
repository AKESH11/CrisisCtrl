/**
 * BALANCED AI SIMULATION ENGINE
 * Adjusted to prevent "Alert Fatigue" (Too many red alerts).
 */

const THREAT_KEYWORDS = {
  // SCORE: +20 (Modifiers that make a standard incident CRITICAL)
  critical: [
    'massive', 'nuclear', 'biochemical', 'biohazard', 
    'collapse', 'mass casualty', 'active shooter', 'terrorism', 'level 5'
  ],
  // SCORE: +10 (Standard modifiers)
  high: [
    'fire', 'leak', 'riot', 'armed', 'flood', 
    'crash', 'chemical', 'emergency', 'homicide'
  ],
  // SCORE: +5
  medium: [
    'accident', 'theft', 'vandalism', 'power', 'outage', 
    'suspicious', 'fight', 'harassment'
  ],
  // SCORE: +0
  low: ['cat', 'stuck', 'noise', 'graffiti', 'lost']
};

export function analyzeIncident(incident) {
  let score = 0;
  let text = (incident.type + " " + incident.description).toLowerCase();
  
  // 1. BASELINE SCORES BY TYPE (The starting point)
  // Standard "Fire" starts at 50 (High/Orange), not Critical.
  switch (incident.type) {
    case 'Explosion': 
    case 'Biohazard': 
      score = 75; // Starts very close to critical
      break;
    case 'Fire':
    case 'Chemical Leak':
    case 'Crash':
      score = 50; // Starts as "High" (Orange)
      break;
    case 'Public Order':
    case 'Theft':
      score = 30; // Starts as "Medium" (Blue/Yellow)
      break;
    default:
      score = 10;
  }

  // 2. Keyword Analysis (Add points for severity)
  THREAT_KEYWORDS.critical.forEach(word => { if(text.includes(word)) score += 20; });
  THREAT_KEYWORDS.high.forEach(word =>     { if(text.includes(word)) score += 10; });

  // 3. Metadata Weighting
  const highDensityZones = ['Downtown', 'Sector 4', 'Manhattan'];
  if (highDensityZones.some(zone => text.includes(zone.toLowerCase()))) {
    score += 10;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // 4. Recommendation Logic
  let recommendation = "";
  if (score >= 80) recommendation = "IMMEDIATE EVACUATION & SWAT DEPLOYMENT";
  else if (score >= 50) recommendation = "DISPATCH FIRE/EMS & ESTABLISH PERIMETER";
  else recommendation = "STANDARD PATROL RESPONSE";

  return {
    ...incident,
    ai_score: score,
    ai_recommendation: recommendation,
    // THRESHOLD RAISED: Only score >= 80 is Critical (Red)
    is_critical: score >= 80 
  };
}