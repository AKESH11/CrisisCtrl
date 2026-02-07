# CrisisCtrl Emergency Hotline Setup Guide

## 🚨 Professional Phone-Based Emergency Reporting

CrisisCtrl now supports **real phone calls** using Twilio for professional emergency reporting. Users can call a dedicated emergency number and speak with an AI assistant that collects incident details and dispatches units automatically.

---

## 📞 How It Works

```
User calls emergency number → Twilio receives call → Webhook to your server → AI processes speech → Responds with voice → Saves incident → Dispatches units
```

### Call Flow

1. **User dials CrisisCtrl emergency number**
2. **AI greets caller**: "You have reached Crisis Control emergency hotline..."
3. **AI asks 3 questions**:
   - What type of incident? (fire, medical, security, other)
   - How severe is it? (low, medium, high)
   - Please provide additional details
4. **User speaks answers** - AI transcribes in real-time
5. **AI confirms**: "Emergency units have been notified..."
6. **Incident created** and broadcast to all dashboard users
7. **Units dispatched** based on incident type

---

## 🛠️ Setup Instructions

### Step 1: Get Twilio Account (Free Trial)

1. **Sign up**: https://www.twilio.com/try-twilio
   - Free trial with **$15 credit** (no credit card required)
   - Enough for ~100 emergency calls

2. **Get a phone number**:
   - Go to **Console → Phone Numbers → Buy a Number**
   - Choose a number with **Voice** capabilities
   - Cost: **$1/month** (trial credit covers this)
   - Save this number - it's your **CrisisCtrl Emergency Hotline**

3. **Get credentials**:
   - Go to **Console → Dashboard**
   - Copy **Account SID** (starts with `AC...`)
   - Copy **Auth Token** (click to reveal)

### Step 2: Configure Backend

1. **Copy `.env.example` to `.env`**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3: Expose Server (ngrok for testing)

Twilio needs a public URL to send webhooks. Use **ngrok** for local development:

1. **Download ngrok**: https://ngrok.com/download

2. **Run ngrok**:
   ```bash
   ngrok http 5001
   ```

3. **Copy the HTTPS URL** (looks like `https://1234-56-78-90-12.ngrok-free.app`)

### Step 4: Configure Twilio Webhook

1. Go to **Twilio Console → Phone Numbers → Manage → Active Numbers**
2. Click your **CrisisCtrl number**
3. Scroll to **Voice Configuration**
4. **A Call Comes In**:
   - Type: `Webhook`
   - URL: `https://YOUR-NGROK-URL.ngrok-free.app/telephony/incoming`
   - Method: `HTTP POST`
5. **Save**

### Step 5: Test the System

1. **Start backend**:
   ```bash
   cd backend
   python server.py
   ```

2. **Call your Twilio number** from any phone

3. **Expected flow**:
   ```
   AI: "You have reached Crisis Control emergency hotline..."
   AI: "What type of incident? Say fire, medical, security, or other."
   You: "Fire"
   AI: "How severe is it? Say low, medium, or high."
   You: "High"
   AI: "Please provide additional details."
   You: "Building on Main Street"
   AI: "Thank you for reporting. Emergency units have been notified..."
   ```

4. **Check dashboard** - incident should appear immediately

---

## 🎨 Frontend Integration

### Option 1: Phone Number Button (New)

Replace browser-based voice with real phone calls:

```javascript
import PhoneCallButton from '../components/PhoneCallButton';

// In your page
<PhoneCallButton userEmail={userEmail} />
```

Shows:
- Red emergency call button with phone icon
- Phone number badge
- Modal with call instructions
- Tap-to-call on mobile

### Option 2: Hybrid (Both Options)

Keep both browser voice AND phone calls:

```javascript
import VoiceCallButton from '../components/VoiceCallButton';
import PhoneCallButton from '../components/PhoneCallButton';

<VoiceCallButton userEmail={userEmail} />
<PhoneCallButton userEmail={userEmail} />
```

---

## 💰 Cost Breakdown

**Twilio Costs** (pay-as-you-go after free trial):

| Item | Free Trial | After Trial |
|------|-----------|-------------|
| New Account Credit | $15 | - |
| Phone Number | $1/month | $1/month |
| Incoming Call (per minute) | Uses credit | $0.0085/min |
| Speech Recognition | Uses credit | $0.02/min |
| Text-to-Speech | Uses credit | $0.04/1000 chars |

**Example**: 
- 100 calls/month × 2 min avg = **~$5/month**
- With trial credit: **Free for first 3 months**

---

## 🔒 Security Best Practices

1. **Never commit `.env`** - already in `.gitignore`
2. **Rotate Twilio auth token** monthly
3. **Use ngrok auth** for production:
   ```bash
   ngrok http 5001 --authtoken YOUR_TOKEN
   ```
4. **Rate limiting**: Add to backend to prevent abuse:
   ```python
   from flask_limiter import Limiter
   limiter = Limiter(app, key_func=lambda: request.form.get('From'))
   
   @limiter.limit("5 per hour")
   @app.route('/telephony/incoming', methods=['POST'])
   def telephony_incoming():
       # ...
   ```

---

## 📊 Monitoring & Analytics

### View Call Logs

Twilio Console → Monitor → Logs → Calls

Tracks:
- Call duration
- Caller number
- Status (completed, failed, busy)
- Cost per call

### Database Storage

All phone reports saved to `active_incidents`:

```python
{
    "id": "phone-1234567890",
    "type": "FIRE",
    "severity": "Critical",
    "source": "Phone Call",
    "caller": "+1234567890",
    "description": "Building on Main Street",
    "location": {"lat": 13.0827, "lng": 80.2707}
}
```

---

## 🌍 Production Deployment

### Deploy with Real Domain

1. **Get a domain** (e.g., `crisisctrl.com`)

2. **Deploy backend** to cloud:
   - **Heroku**: `heroku create crisisctrl-backend`
   - **Railway**: `railway up`
   - **AWS EC2**: Traditional VPS

3. **Update Twilio webhook**:
   ```
   https://api.crisisctrl.com/telephony/incoming
   ```

4. **SSL certificate**: Required by Twilio (auto with most platforms)

### Scaling

For high call volume:
- **Use Redis** for call sessions (instead of in-memory dict)
- **Queue system** (Celery) for async processing
- **Load balancer** for multiple backend instances

---

## 🐛 Troubleshooting

### "No webhook received"

**Cause**: ngrok/server not accessible

**Fix**:
1. Check ngrok is running: `ngrok http 5001`
2. Verify public URL works: Open in browser
3. Backend running: `python server.py` shows 200 OK logs
4. Twilio webhook URL matches ngrok URL exactly

### "Speech timeout" / No recognition

**Cause**: Twilio speech recognition didn't hear anything

**Fix**:
1. Speak **clearly and louder**
2. Check phone volume
3. Reduce background noise
4. Increase `timeout` in Gather: `timeout=10`

### "Incident not appearing in dashboard"

**Cause**: Socket.IO not connected

**Fix**:
1. Check frontend connects to backend: Browser console
2. Backend shows: `👥 Active users: 1` 
3. Try refreshing dashboard page

### "Import Error: telephony module"

**Cause**: Twilio package not installed

**Fix**:
```bash
pip install twilio==8.10.0
```

---

## 🚀 Advanced Features

### Outbound Alerting

Call users near an incident:

```python
from telephony import make_outbound_call

# Call all users within 5km
for user in nearby_users:
    make_outbound_call(
        to_number=user['phone'],
        incident_details=incident
    )
```

### Multi-Language Support

Change voice language in `telephony.py`:

```python
gather = Gather(
    language='es-MX',  # Spanish
    # language='hi-IN',  # Hindi
    # language='ta-IN',  # Tamil
)
```

### Call Recording

Enable in Twilio webhook:

```python
response.record(
    transcribe=True,
    transcribe_callback='/telephony/transcription'
)
```

---

## 📝 API Reference

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/telephony/incoming` | POST | Twilio webhook - incoming calls |
| `/telephony/process_answer` | POST | Process user's spoken answer |
| `/api/telephony/number` | GET | Get emergency phone number |

### Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Yes | `ACxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Yes | `xxxxxxxxxxxxxxxx` |
| `TWILIO_PHONE_NUMBER` | Yes | `+1234567890` |
| `OPENAI_API_KEY` | No | `sk-xxxxx` (for enhanced AI) |

---

## 🎯 Next Steps

1. **Test locally**: Call your number, complete full report
2. **Deploy to production**: Use real domain
3. **Announce emergency hotline**: Share number publicly
4. **Monitor usage**: Check Twilio dashboard weekly
5. **Scale as needed**: Add more numbers for different regions

---

## 📞 Support

- **Twilio Docs**: https://www.twilio.com/docs/voice
- **CrisisCtrl Issues**: GitHub Issues
- **Community**: Discord/Slack channel

**Emergency Hotline is LIVE!** 🚨
