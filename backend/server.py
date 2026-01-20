import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import requests
import time
import threading
import random

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

API_KEY = "YOUR_OPENWEATHER_API_KEY" # ⚠️ REPLACE THIS

# --- UNIT CONFIGURATION ---
UNITS = {
    "Unit_Alpha": {"type": "Fire & Rescue", "base": {"lat": 13.0827, "lng": 80.2707}, "specialty": ["Fire", "Explosion", "Heatwave"]},
    "Unit_Bravo": {"type": "Medical & Flood", "base": {"lat": 11.0168, "lng": 76.9558}, "specialty": ["Flood", "Flash Flood Alert", "Medical Emergency", "Cyclone Warning"]},
    "Unit_Charlie": {"type": "Security Ops", "base": {"lat": 9.9252, "lng": 78.1198}, "specialty": ["Terrorism", "Public Order", "Violence", "SOS REPORT", "Security Threat"]}
}

TN_CITIES = [
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    {"name": "Madurai", "lat": 9.9252, "lon": 78.1198},
    {"name": "Trichy", "lat": 10.7905, "lon": 78.7047},
    {"name": "Salem", "lat": 11.6643, "lon": 78.1460},
    {"name": "Tirunelveli", "lat": 8.7139, "lon": 77.7567}
]

active_incidents = []
stats = {"total": 0, "active": 0, "resolved": 0, "critical": 0}

# --- HELPERS ---
def assign_unit(incident_type):
    for unit_id, data in UNITS.items():
        if any(keyword in incident_type for keyword in data['specialty']):
            return unit_id
    return "Unit_Charlie" 

def predict_weather_disaster(city_name, weather_data):
    alerts = []
    wind_speed = weather_data.get('wind', {}).get('speed', 0) * 3.6 
    rain_1h = weather_data.get('rain', {}).get('1h', 0)
    
    if wind_speed > 60:
        alerts.append({"type": "Cyclone Warning", "sev": "Critical", "desc": f"Hurricane force winds ({int(wind_speed)} km/h) in {city_name}."})
    elif rain_1h > 40:
        alerts.append({"type": "Flash Flood Alert", "sev": "Critical", "desc": f"Critical rainfall ({rain_1h} mm/hr) in {city_name}."})
    return alerts

def predict_security_threat(city_name):
    if random.random() > 0.98: 
        return {
            "type": "Security Threat",
            "sev": "Critical",
            "desc": f"Intel chatter indicates potential unrest in {city_name} sector.",
            "rec": "Increase patrol and setup checkpoints."
        }
    return None

def tn_monitor():
    print("📡 Monitoring Tamil Nadu Grid...")
    while True:
        for city in TN_CITIES:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={city['lat']}&lon={city['lon']}&appid={API_KEY}"
                response = requests.get(url).json()
                
                if response.get("cod") == 200:
                    threats = predict_weather_disaster(city['name'], response)
                    sec_threat = predict_security_threat(city['name'])
                    if sec_threat: threats.append(sec_threat)

                    for threat in threats:
                        new_id = f"pred-{city['name']}-{int(time.time())}"
                        if not any(i['id'] == new_id for i in active_incidents):
                            assigned = assign_unit(threat['type'])
                            new_incident = {
                                "id": new_id,
                                "type": threat['type'],
                                "description": threat['desc'],
                                "location": {"lat": city['lat'], "lng": city['lon']},
                                "severity": threat['sev'],
                                "timestamp": time.time(),
                                "assignedUnit": assigned,
                                "is_critical": True,
                                "ai_recommendation": threat.get('rec', "Deploy Standard Response Protocols")
                            }
                            
                            active_incidents.insert(0, new_incident)
                            stats['critical'] += 1; stats['active'] += 1; stats['total'] += 1
                            socketio.emit('new-incident', new_incident)
                            socketio.emit('stats-update', stats)
            except Exception as e:
                print(f"Monitor Error: {e}")
            time.sleep(2) 
        time.sleep(30)

# --- ROUTES ---

@app.route('/api/reports', methods=['GET'])
def get_reports():
    return jsonify({
        "reports": active_incidents, 
        "stats": stats, 
        "units": UNITS,
        "riskZones": [{"lat": c["lat"], "lng": c["lon"], "radius": 5000} for c in TN_CITIES]
    })

@app.route('/api/sos', methods=['POST'])
def handle_sos():
    data = request.json
    assigned = assign_unit(data.get("type", "SOS"))
    
    sos_incident = {
        "id": f"sos-{int(time.time())}",
        "type": data.get("type", "SOS REPORT"),
        "description": data.get("description", "Emergency reported."),
        "location": data.get("location"),
        "severity": data.get("severity", "Critical"),
        "timestamp": time.time(),
        "assignedUnit": assigned,
        "is_critical": True,
        "ai_recommendation": f"DISPATCH {assigned.upper()} IMMEDIATELY"
    }
    
    active_incidents.insert(0, sos_incident)
    stats['active'] += 1; stats['total'] += 1; stats['critical'] += 1
    
    socketio.emit('new-incident', sos_incident)
    socketio.emit('stats-update', stats)
    return jsonify({"status": "Alert Received"}), 200

# --- SOCKET EVENTS (THE FIXES) ---

@socketio.on('resolve-incident')
def handle_resolve(incident_id):
    global active_incidents, stats
    
    # Remove from active list
    incident_to_remove = next((i for i in active_incidents if i['id'] == incident_id), None)
    
    if incident_to_remove:
        # Update Stats
        stats['active'] = max(0, stats['active'] - 1)
        stats['resolved'] += 1
        if incident_to_remove.get('is_critical'):
            stats['critical'] = max(0, stats['critical'] - 1)

        # Delete
        active_incidents = [i for i in active_incidents if i['id'] != incident_id]

        print(f"✅ Resolved: {incident_id}")
        emit('incident-resolved', incident_id, broadcast=True)
        emit('stats-update', stats, broadcast=True)

# ✅ NEW: PERSIST THREAT UPDATES
@socketio.on('update-threat')
def handle_threat_update(data):
    target_id = data.get('id')
    new_severity = data.get('severity')
    
    for inc in active_incidents:
        if inc['id'] == target_id:
            # Update the actual data in memory
            inc['severity'] = new_severity
            inc['is_critical'] = (new_severity == 'Critical' or new_severity == 'High')
            
            # Broadcast the change to all connected clients (Admin & Units)
            print(f"🔄 Threat Level Changed: {target_id} -> {new_severity}")
            emit('incident-update', inc, broadcast=True)
            break

threading.Thread(target=tn_monitor, daemon=True).start()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001)