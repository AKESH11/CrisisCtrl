"""
CrisisCtrl Telephony Integration
Real phone calls using Twilio + AI call handling
"""

from flask import request, jsonify
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.rest import Client
import openai
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '+1234567890')  # Your CrisisCtrl number

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    print(f"📞 Twilio configured - CrisisCtrl Number: {TWILIO_PHONE_NUMBER}")
else:
    print("⚠️ Twilio not configured - Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env")

# OpenAI for better AI responses (optional)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Call state storage (in-memory, move to Redis for production)
active_calls = {}

class CallSession:
    """Manages a single emergency call session"""
    def __init__(self, call_sid, caller_number):
        self.call_sid = call_sid
        self.caller_number = caller_number
        self.question_index = 0
        self.answers = {
            'incident_type': None,
            'severity': None,
            'description': None,
            'location': None
        }
        self.questions = [
            {
                'key': 'incident_type',
                'text': 'What type of incident are you reporting? Say fire, medical, security, or other.',
                'hints': 'fire medical security other flood earthquake'
            },
            {
                'key': 'severity',
                'text': 'How severe is it? Say low, medium, or high.',
                'hints': 'low medium high critical'
            },
            {
                'key': 'description',
                'text': 'Please provide any additional details about the emergency.',
                'hints': ''
            }
        ]
    
    def get_current_question(self):
        if self.question_index < len(self.questions):
            return self.questions[self.question_index]
        return None
    
    def save_answer(self, answer_text):
        current_q = self.get_current_question()
        if current_q:
            self.answers[current_q['key']] = answer_text
            self.question_index += 1
    
    def is_complete(self):
        return self.question_index >= len(self.questions)


def handle_incoming_call():
    """
    Webhook endpoint for incoming calls to CrisisCtrl number
    Twilio will POST to this endpoint when someone calls
    """
    call_sid = request.form.get('CallSid')
    caller = request.form.get('From')
    
    print(f"\n📞 INCOMING CALL: {caller} (SID: {call_sid})")
    
    # Create new call session
    session = CallSession(call_sid, caller)
    active_calls[call_sid] = session
    
    # Build TwiML response
    response = VoiceResponse()
    
    # Welcome message
    response.say(
        "You have reached Crisis Control emergency hotline. Please stay calm, we will collect your report.",
        voice='Google.en-US-Standard-C',  # Female voice
        language='en-US'
    )
    
    # Pause briefly
    response.pause(length=1)
    
    # Ask first question and gather response
    first_question = session.get_current_question()
    gather = Gather(
        input='speech',
        action='/telephony/process_answer',
        method='POST',
        timeout=5,
        speech_timeout='auto',
        hints=first_question['hints'],
        language='en-US'
    )
    gather.say(first_question['text'], voice='Google.en-US-Standard-C')
    response.append(gather)
    
    # If no input, repeat question
    response.say("I didn't hear anything. Please call back.", voice='Google.en-US-Standard-C')
    
    return str(response), 200, {'Content-Type': 'text/xml'}


def process_answer():
    """
    Process user's spoken answer
    Called after each Gather completes
    """
    call_sid = request.form.get('CallSid')
    speech_result = request.form.get('SpeechResult', '')
    confidence = request.form.get('Confidence', 0)
    
    print(f"🎤 Answer received: '{speech_result}' (confidence: {confidence})")
    
    # Get session
    session = active_calls.get(call_sid)
    if not session:
        response = VoiceResponse()
        response.say("Session expired. Please call back.")
        return str(response), 200, {'Content-Type': 'text/xml'}
    
    # Save answer
    session.save_answer(speech_result)
    
    response = VoiceResponse()
    
    # Check if all questions answered
    if session.is_complete():
        # Call complete - thank user and hang up
        response.say(
            "Thank you for reporting. Emergency units have been notified and are on their way. Stay safe.",
            voice='Google.en-US-Standard-C'
        )
        
        # Submit incident to backend
        submit_phone_incident(session)
        
        # Clean up session
        del active_calls[call_sid]
        
        return str(response), 200, {'Content-Type': 'text/xml'}
    
    # Ask next question
    next_question = session.get_current_question()
    gather = Gather(
        input='speech',
        action='/telephony/process_answer',
        method='POST',
        timeout=5,
        speech_timeout='auto',
        hints=next_question['hints'],
        language='en-US'
    )
    gather.say(next_question['text'], voice='Google.en-US-Standard-C')
    response.append(gather)
    
    # Fallback if no input
    response.say("I didn't hear your response. Please try again.", voice='Google.en-US-Standard-C')
    response.redirect('/telephony/process_answer')
    
    return str(response), 200, {'Content-Type': 'text/xml'}


def submit_phone_incident(session):
    """
    Submit incident collected via phone call to the main system
    """
    from server import active_incidents, stats, socketio, assign_unit
    import time
    
    # Map severity
    severity_map = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'Critical'
    }
    severity_text = session.answers.get('severity', 'high').lower()
    severity = severity_map.get(severity_text, 'Critical')
    
    # Create incident
    incident = {
        "id": f"phone-{int(time.time())}",
        "type": session.answers.get('incident_type', 'Emergency').upper(),
        "description": session.answers.get('description', 'Phone report - details pending'),
        "location": {"lat": 13.0827, "lng": 80.2707},  # Default Chennai, can be enhanced with caller location
        "severity": severity,
        "timestamp": time.time(),
        "assignedUnit": assign_unit(session.answers.get('incident_type', 'Emergency')),
        "is_critical": True,
        "ai_recommendation": "PHONE REPORT - DISPATCH IMMEDIATELY",
        "source": "Phone Call",
        "caller": session.caller_number
    }
    
    print(f"📋 Phone incident created: {incident['id']}")
    print(f"   Type: {incident['type']}")
    print(f"   Severity: {severity}")
    print(f"   Caller: {session.caller_number}")
    
    # Add to incidents
    active_incidents.insert(0, incident)
    stats['active'] += 1
    stats['total'] += 1
    stats['critical'] += 1
    
    # Broadcast to all connected clients
    socketio.emit('new-incident', incident)
    socketio.emit('stats-update', stats)
    
    return incident


def get_call_status(call_sid):
    """Get status of a call"""
    if not twilio_client:
        return {"error": "Twilio not configured"}
    
    try:
        call = twilio_client.calls(call_sid).fetch()
        return {
            "status": call.status,
            "duration": call.duration,
            "from": call.from_,
            "to": call.to
        }
    except Exception as e:
        return {"error": str(e)}


def make_outbound_call(to_number, incident_details):
    """
    Make an outbound call to notify someone about an incident
    Useful for alerting registered users
    """
    if not twilio_client:
        return {"error": "Twilio not configured"}
    
    try:
        call = twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            url='https://your-domain.com/telephony/outbound_notification',
            status_callback='https://your-domain.com/telephony/call_status'
        )
        return {"call_sid": call.sid, "status": "initiated"}
    except Exception as e:
        return {"error": str(e)}


# Export functions for use in main server
__all__ = [
    'handle_incoming_call',
    'process_answer',
    'get_call_status',
    'make_outbound_call',
    'TWILIO_PHONE_NUMBER'
]
