import asyncio
from dotenv import load_dotenv
load_dotenv()

from email_service import send_proposal_notification_email

def test_email():
    park_name = "Central Park"
    proposal_id = 999
    end_date = "November 30, 2025"
    description = "Test proposal to verify email notification system is working correctly. NDVI change from 0.750 to 0.250, PM2.5 increase of 45.2%"

    success = send_proposal_notification_email(
        park_name=park_name,
        proposal_id=proposal_id,
        end_date=end_date,
        description=description
    )

    if success:
        print("SUCCESS!")
    else:
        print("FAILED!")

if __name__ == "__main__":
    test_email()
