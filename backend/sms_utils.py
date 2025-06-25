# sms_utils.py
import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

def send_sms(to_number, body):
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")

    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body=body,
        from_=from_number,
        to=to_number
    )
    return message.sid