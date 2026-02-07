"""
Twilio Call Handler for CrisisCtrl
Handles incoming emergency calls via phone number
"""

from flask import Blueprint, request, jsonify
from twilio.twiml.voice_response import VoiceResponse, Gather
import os
from dotenv import load_dotenv

load_dotenv()

twilio_bp = Blueprint('twilio', __name__)

# Question flow
QUESTIONS = [
    "What type of incident? Say fire, medical, security, or other.",
    "How severe is it? Say low, medium, or high.",
    "Any additional information?"
]

# Store call states (in production, use Redis or database)
call_states = {}

@twilio_bp.route('/twilio/voice/incoming', methods=['POST'])
def handle_incoming_call():
    """Handle incoming call - start the conversation"""
    response = VoiceResponse()
    
    call_sid = request.form.get('CallSid')
    from_number = request.form.get('From')
    
    # Initialize call state
    call_states[call_sid] = {
        'phone': from_number,
        'question_index': 0,
        'answers': [],
        'location': None
    }
    
    # Welcome message
    response.say(
        "Welcome to Crisis Control emergency hotline. "
        "I will ask you three questions to understand your emergency.",
        voice='alice',
        language='en-US'
    )
    
    # Start with first question
    gather = Gather(
        input='speech',
        action='/api/twilio/voice/process',
        method='POST',
        speech_timeout='3',
        language='en-US'
    )
    gather.say(QUESTIONS[0], voice='alice', language='en-US')
    response.append(gather)
    
    # Fallback if no input
    response.say("I didn't receive any input. Please call back.", voice='alice')
    
    return str(response), 200, {'Content-Type': 'text/xml'}


@twilio_bp.route('/twilio/voice/process', methods=['POST'])
def process_response():
    """Process user's speech response"""
    response = VoiceResponse()
    
    call_sid = request.form.get('CallSid')
    speech_result = request.form.get('SpeechResult', '')
    
    if call_sid not in call_states:
        response.say("Session error. Please call back.", voice='alice')
        response.hangup()
        return str(response), 200, {'Content-Type': 'text/xml'}
    
    state = call_states[call_sid]
    
    # Store the answer
    state['answers'].append(speech_result)
    print(f"📞 Call {call_sid}: Q{state['question_index'] + 1} Answer: {speech_result}")
    
    # Move to next question
    state['question_index'] += 1
    
    if state['question_index'] < len(QUESTIONS):
        # Ask next question
        gather = Gather(
            input='speech',
            action='/api/twilio/voice/process',
            method='POST',
            speech_timeout='3',
            language='en-US'
        )
        gather.say(QUESTIONS[state['question_index']], voice='alice', language='en-US')
        response.append(gather)
        
        # Fallback
        response.say("I didn't hear that. Let me ask again.", voice='alice')
        response.redirect('/api/twilio/voice/process')
    else:
        # All questions answered - submit report
        submit_phone_report(state)
        
        response.say(
            "Thank you. Your emergency report has been submitted. "
            "Help is on the way. Stay safe.",
            voice='alice',
            language='en-US'
        )
        response.hangup()
        
        # Cleanup
        del call_states[call_sid]
    
    return str(response), 200, {'Content-Type': 'text/xml'}


def submit_phone_report(state):
    """Submit the collected data as an incident report"""
    from server import active_incidents, stats, socketio, assign_unit
    import time
    
    # Map severity
    severity_map = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'Critical'
    }
    
    answers = state['answers']
    incident_type = answers[0] if len(answers) > 0 else 'Unknown'
    severity_raw = answers[1].lower() if len(answers) > 1 else 'medium'
    severity = severity_map.get(severity_raw, 'Medium')
    description = answers[2] if len(answers) > 2 else 'No additional info'
    
    assigned = assign_unit(incident_type)
    
    incident = {
        "id": f"phone-{int(time.time())}",
        "type": incident_type,
        "description": f"Phone Report: {description}",
        "location": {"lat": 13.0827, "lng": 80.2707},  # Default Chennai
        "severity": severity,
        "timestamp": time.time(),
        "assignedUnit": assigned,
        "is_critical": severity == 'Critical',
        "ai_recommendation": f"DISPATCH {assigned.upper()} - Phone Report",
        "phone": state['phone'],
        "source": "PHONE_CALL"
    }
    
    active_incidents.insert(0, incident)
    stats['active'] += 1
    stats['total'] += 1
    if severity == 'Critical':
        stats['critical'] += 1
    
    socketio.emit('new-incident', incident)
    socketio.emit('stats-update', stats)
    
    print(f"✅ Phone report submitted: {incident['id']}")


@twilio_bp.route('/twilio/status', methods=['POST'])
def handle_status():
    """Handle call status updates"""
    call_sid = request.form.get('CallSid')
    call_status = request.form.get('CallStatus')
    
    print(f"📞 Call {call_sid}: Status = {call_status}")
    
    # Cleanup if call ended
    if call_status in ['completed', 'failed', 'busy', 'no-answer']:
        if call_sid in call_states:
            del call_states[call_sid]
    
    return '', 200
