import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import requests
import time
import threading
import random
import os
import math
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# --- ENVIRONMENT VARIABLES ---
API_KEY = os.getenv("OPENWEATHER_API_KEY", "YOUR_OPENWEATHER_API_KEY")
GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "crisisctrl1@gmail.com")

# Initialize Gmail SMTP
gmail_configured = GMAIL_EMAIL is not None and GMAIL_PASSWORD is not None
if gmail_configured:
    print("✅ Gmail SMTP configured")
    print(f"📧 Sender: {GMAIL_EMAIL}")
else:
    print("⚠️ Gmail SMTP not configured - Email alerts disabled")

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
active_users = {}  # {socketId: {email, lat, lng, timestamp}}

# --- HELPERS ---
def assign_unit(incident_type):
    for unit_id, data in UNITS.items():
        if any(keyword in incident_type for keyword in data['specialty']):
            return unit_id
    return "Unit_Charlie"

def get_distance_meters(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in meters using Haversine formula"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def send_email(email_address, subject, incident_type, distance, location_name):
    """Send email alert using Brevo API"""
    if not brevo_configured:
        print(f"⚠️ SendGrid not configured. Would send to {email_address}: {subject}")
        return False
    
def send_email(email_address, subject, incident_type, distance, location_name):
    """Send email alert using Gmail SMTP"""
    if not gmail_configured:
        print(f"⚠️ Gmail SMTP not configured. Would send to {email_address}: {subject}")
        return False
    
    try:
        # Create email content
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #d32f2f; margin-bottom: 20px;">🚨 EMERGENCY ALERT</h2>
                    
                    <div style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <p style="margin: 0; color: #333;">
                            <strong>{incident_type}</strong> reported <strong>{distance}</strong> away from your location.
                        </p>
                    </div>
                    
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> {location_name}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Alert Time:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
                    </div>
                    
                    <p style="color: #666; margin-bottom: 20px;">
                        ⚠️ Please stay alert and take necessary precautions. Contact emergency services if needed.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">CrisisCtrl Emergency Alert System</p>
                </div>
            </body>
        </html>
        """
        
        # Create Gmail message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = GMAIL_EMAIL
        msg['To'] = email_address
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send via Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
            server.sendmail(GMAIL_EMAIL, email_address, msg.as_string())
        
        print(f"✅ Email sent to {email_address}")
        return True
            
    except Exception as e:
        print(f"❌ Email Error to {email_address}: {e}")
        return False

def notify_nearby_users(incident):
    """Send email to all users within 1km of incident"""
    # Check if location exists
    if not incident.get('location') or not incident['location'].get('lat') or not incident['location'].get('lng'):
        print(f"⚠️ Cannot notify users - incident location is missing")
        return
    
    incident_lat = incident['location']['lat']
    incident_lng = incident['location']['lng']
    
    print(f"\n📍 Incident at ({incident_lat}, {incident_lng})")
    print(f"👥 Active users: {len(active_users)}")
    
    notified_count = 0
    for socket_id, user_data in active_users.items():
        print(f"  - Checking user {user_data['email']} at ({user_data['lat']}, {user_data['lng']})")
        distance = get_distance_meters(
            incident_lat, incident_lng,
            user_data['lat'], user_data['lng']
        )
        print(f"    Distance: {distance}m")
        
        if distance <= 1000:  # 1km radius
            distance_str = f"{int(distance)}m" if distance < 1000 else f"{distance/1000:.1f}km"
            subject = f"🚨 EMERGENCY ALERT: {incident['type']}"
            location_name = f"Your area ({distance_str} away)"
            print(f"    ✅ Within 1km radius - Sending email...")
            
            if send_email(user_data['email'], subject, incident['type'], distance_str, location_name):
                notified_count += 1
        else:
            print(f"    ❌ Too far ({distance}m > 1000m)")
    
    print(f"📧 Email alerts sent to {notified_count} nearby users\n")
    return notified_count 

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
    print(f"\n🆘 SOS RECEIVED: {data}")
    
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
    
    # ✅ SEND EMAIL TO NEARBY USERS
    print(f"🚨 Calling notify_nearby_users for incident at ({data.get('location', {}).get('lat')}, {data.get('location', {}).get('lng')})")
    notify_nearby_users(sos_incident)
    
    socketio.emit('new-incident', sos_incident)
    socketio.emit('stats-update', stats)
    return jsonify({"status": "Alert Received"}), 200

# --- SOCKET EVENTS (THE FIXES) ---

@socketio.on('register-user')
def handle_register_user(data):
    """Register user with email + location"""
    email = data.get('email')
    lat = data.get('lat')
    lng = data.get('lng')
    
    print(f"\n🔔 Register request - Email: {email}, Lat: {lat}, Lng: {lng}")
    
    if not email or lat is None or lng is None:
        print(f"❌ Missing data: email={email}, lat={lat}, lng={lng}")
        emit('error', {'message': 'Missing email or location'})
        return
    
    # Store user
    active_users[request.sid] = {
        'email': email,
        'lat': lat,
        'lng': lng,
        'timestamp': time.time()
    }
    
    print(f"✅ User registered: {email} at ({lat}, {lng})")
    print(f"📊 Total active users: {len(active_users)}")
    emit('user-registered', {'status': 'success'})

@socketio.on('update-location')
def handle_location_update(data):
    """Update user location"""
    if request.sid in active_users:
        active_users[request.sid]['lat'] = data.get('lat')
        active_users[request.sid]['lng'] = data.get('lng')
        active_users[request.sid]['timestamp'] = time.time()

@socketio.on('disconnect')
def handle_disconnect():
    """Remove user on disconnect"""
    if request.sid in active_users:
        email = active_users[request.sid].get('email')
        del active_users[request.sid]
        print(f"❌ User disconnected: {email}")

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

# --- TEST ENDPOINT ---
@app.route('/api/test-email', methods=['POST'])
def test_email():
    """Test endpoint to send email alert"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email address required"}), 400
    
    # Send test email
    subject = "🚨 EMERGENCY ALERT: Test Message from CrisisCtrl"
    success = send_email(email, subject, "Test Incident", "100m", "Test Location")
    
    return jsonify({
        "status": "sent" if success else "failed",
        "email": email,
        "message": subject
    }), 200 if success else 500

@app.route('/api/active-users', methods=['GET'])
def get_active_users():
    """Get list of registered users (for testing)"""
    users_list = [
        {
            'email': user['email'],
            'lat': user['lat'],
            'lng': user['lng'],
            'timestamp': user['timestamp']
        }
        for user in active_users.values()
    ]
    return jsonify({"active_users": users_list, "count": len(users_list)})

# --- TELEPHONY ROUTES (REAL PHONE CALLS) ---
try:
    from telephony import (
        handle_incoming_call,
        process_answer,
        get_call_status,
        TWILIO_PHONE_NUMBER
    )
    
    @app.route('/telephony/incoming', methods=['POST'])
    def telephony_incoming():
        """Twilio webhook for incoming calls"""
        return handle_incoming_call()
    
    @app.route('/telephony/process_answer', methods=['POST'])
    def telephony_process():
        """Process user's spoken answer"""
        return process_answer()
    
    @app.route('/api/telephony/number', methods=['GET'])
    def get_phone_number():
        """Get CrisisCtrl emergency phone number"""
        return jsonify({"phone_number": TWILIO_PHONE_NUMBER})
    
    print("📞 Telephony routes registered")
    
except ImportError as e:
    print(f"⚠️ Telephony module not available: {e}")
    TWILIO_PHONE_NUMBER = None

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001)