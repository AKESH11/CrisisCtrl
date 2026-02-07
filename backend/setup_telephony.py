#!/usr/bin/env python3
"""
CrisisCtrl Telephony Quick Setup
Automated setup and testing script
"""

import os
import sys
import subprocess

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def check_env_file():
    """Check if .env file exists"""
    if os.path.exists('.env'):
        print("✅ .env file found")
        return True
    else:
        print("❌ .env file not found")
        print("   Creating .env from .env.example...")
        if os.path.exists('.env.example'):
            subprocess.run(['cp', '.env.example', '.env'])
            print("✅ Created .env - Please edit it with your Twilio credentials")
            return False
        else:
            print("❌ .env.example not found!")
            return False

def install_dependencies():
    """Install Python dependencies"""
    print_header("Installing Dependencies")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
        print("✅ All dependencies installed")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def check_twilio_config():
    """Check if Twilio is configured"""
    from dotenv import load_dotenv
    load_dotenv()
    
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    phone_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    if account_sid and auth_token and phone_number:
        print(f"✅ Twilio configured")
        print(f"   Account SID: {account_sid[:10]}...")
        print(f"   Phone Number: {phone_number}")
        return True
    else:
        print("⚠️ Twilio not fully configured")
        print("   Please edit .env file with your Twilio credentials:")
        print("   - TWILIO_ACCOUNT_SID")
        print("   - TWILIO_AUTH_TOKEN")
        print("   - TWILIO_PHONE_NUMBER")
        return False

def test_twilio_connection():
    """Test Twilio API connection"""
    print_header("Testing Twilio Connection")
    try:
        from twilio.rest import Client
        from dotenv import load_dotenv
        load_dotenv()
        
        client = Client(
            os.getenv('TWILIO_ACCOUNT_SID'),
            os.getenv('TWILIO_AUTH_TOKEN')
        )
        
        # Fetch account details
        account = client.api.accounts(os.getenv('TWILIO_ACCOUNT_SID')).fetch()
        print(f"✅ Connected to Twilio")
        print(f"   Account Name: {account.friendly_name}")
        print(f"   Status: {account.status}")
        
        # Fetch phone number details
        phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        incoming_numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
        
        if incoming_numbers:
            number = incoming_numbers[0]
            print(f"   Phone Number: {number.phone_number}")
            print(f"   Voice URL: {number.voice_url or 'Not configured'}")
            
            if not number.voice_url:
                print("\n⚠️ WARNING: Voice webhook not configured!")
                print("   You need to set the webhook URL in Twilio Console")
        else:
            print(f"⚠️ Phone number {phone_number} not found in account")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Twilio: {e}")
        return False

def show_ngrok_instructions():
    """Show ngrok setup instructions"""
    print_header("Local Testing with ngrok")
    print("""
For local testing, you need to expose your server using ngrok:

1. Download ngrok: https://ngrok.com/download

2. Start your Flask server:
   python server.py

3. In another terminal, run ngrok:
   ngrok http 5001

4. Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)

5. Go to Twilio Console → Phone Numbers → Your Number → Voice Configuration
   Set webhook to: https://YOUR-NGROK-URL.ngrok-free.app/telephony/incoming

6. Call your Twilio number to test!
    """)

def main():
    print_header("CrisisCtrl Telephony Setup")
    print("This script will help you set up the emergency hotline system")
    
    # Step 1: Check .env
    print_header("Step 1: Environment Configuration")
    env_exists = check_env_file()
    if not env_exists:
        print("\n⚠️ Please edit .env file with your Twilio credentials, then run this script again")
        sys.exit(1)
    
    # Step 2: Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Step 3: Check Twilio config
    print_header("Step 2: Twilio Configuration")
    twilio_configured = check_twilio_config()
    
    if not twilio_configured:
        print("\n⚠️ Please complete Twilio configuration in .env, then run this script again")
        sys.exit(1)
    
    # Step 4: Test connection
    if test_twilio_connection():
        print("\n✅ Twilio setup complete!")
    
    # Step 5: Show next steps
    show_ngrok_instructions()
    
    print_header("Setup Complete!")
    print("""
Next steps:
1. Start server: python server.py
2. Start ngrok: ngrok http 5001 (in another terminal)
3. Configure Twilio webhook with ngrok URL
4. Call your emergency number to test
5. Check dashboard for incoming incidents

Documentation: See TELEPHONY_SETUP.md for detailed instructions
    """)

if __name__ == '__main__':
    main()
