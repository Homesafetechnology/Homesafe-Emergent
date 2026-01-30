# Here are your Instructions
After cloning or deploying, create the `.env` files manually:

**Backend** (`/app/backend/.env`):
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=3e4a3766a93e9554b22fa3f0538ef1d5
TWILIO_PHONE_NUMBER=+1234567890
```

**Frontend** (`/app/frontend/.env`):
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

**On Emergent platform**: Use the Environment Variables section in deployment settings to add these securely without committing them to code.
