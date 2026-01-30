from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from twilio.rest import Client as TwilioClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Twilio setup
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER')

twilio_client = None
if twilio_account_sid and twilio_auth_token:
    try:
        twilio_client = TwilioClient(twilio_account_sid, twilio_auth_token)
    except Exception as e:
        logging.error(f"Failed to initialize Twilio client: {e}")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class Zone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    image_url: Optional[str] = ""

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class Sensor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Literal["motion", "door", "window"]
    zone_id: str
    status: Literal["active", "inactive", "triggered", "offline"] = "inactive"
    battery_level: int = 100
    last_triggered: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SensorCreate(BaseModel):
    name: str
    type: Literal["motion", "door", "window"]
    zone_id: str
    battery_level: Optional[int] = 100

class SensorUpdate(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[str] = None
    status: Optional[Literal["active", "inactive", "triggered", "offline"]] = None
    battery_level: Optional[int] = None

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["intrusion", "armed", "disarmed", "monitor_start", "monitor_stop", "sensor_triggered", "sensor_added", "sensor_removed", "zone_added", "zone_removed", "sms_sent", "system"]
    message: str
    severity: Literal["info", "warning", "danger"] = "info"
    sensor_id: Optional[str] = None
    zone_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    type: str
    message: str
    severity: Optional[str] = "info"
    sensor_id: Optional[str] = None
    zone_id: Optional[str] = None

class SystemState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "system_state"
    mode: Literal["armed", "disarmed", "monitoring"] = "disarmed"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemStateUpdate(BaseModel):
    mode: Literal["armed", "disarmed", "monitoring"]

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    sms_enabled: bool = False
    alert_phone_number: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    sms_enabled: Optional[bool] = None
    alert_phone_number: Optional[str] = None

class SensorTrigger(BaseModel):
    sensor_id: str

# ============ HELPER FUNCTIONS ============

async def log_event(event_type: str, message: str, severity: str = "info", sensor_id: str = None, zone_id: str = None):
    event = Event(type=event_type, message=message, severity=severity, sensor_id=sensor_id, zone_id=zone_id)
    doc = event.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.events.insert_one(doc)
    return event

async def send_sms_alert(message: str):
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings or not settings.get('sms_enabled') or not settings.get('alert_phone_number'):
        logger.info("SMS alerts disabled or no phone number configured")
        return False
    
    if not twilio_client or not twilio_phone_number:
        logger.error("Twilio not configured")
        return False
    
    try:
        twilio_client.messages.create(
            body=message,
            from_=twilio_phone_number,
            to=settings['alert_phone_number']
        )
        await log_event("sms_sent", f"SMS alert sent: {message}", "info")
        logger.info(f"SMS sent to {settings['alert_phone_number']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return False

async def get_system_state():
    state = await db.system_state.find_one({"id": "system_state"}, {"_id": 0})
    if not state:
        default_state = SystemState()
        doc = default_state.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.system_state.insert_one(doc)
        return default_state
    if isinstance(state['updated_at'], str):
        state['updated_at'] = datetime.fromisoformat(state['updated_at'])
    return SystemState(**state)

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Home Intruder Alarm System API"}

# System State
@api_router.get("/system/state", response_model=SystemState)
async def get_state():
    return await get_system_state()

@api_router.put("/system/state", response_model=SystemState)
async def update_state(update: SystemStateUpdate):
    current_state = await get_system_state()
    old_mode = current_state.mode
    new_mode = update.mode
    
    updated_state = SystemState(mode=new_mode)
    doc = updated_state.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.system_state.update_one(
        {"id": "system_state"},
        {"$set": doc},
        upsert=True
    )
    
    # Log the state change
    if old_mode != new_mode:
        if new_mode == "armed":
            await log_event("armed", "System armed", "warning")
        elif new_mode == "disarmed":
            await log_event("disarmed", "System disarmed", "info")
        elif new_mode == "monitoring":
            await log_event("monitor_start", "Monitoring mode enabled", "info")
    
    return updated_state

# Zones
@api_router.get("/zones", response_model=List[Zone])
async def get_zones():
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    for zone in zones:
        if isinstance(zone.get('created_at'), str):
            zone['created_at'] = datetime.fromisoformat(zone['created_at'])
    return zones

@api_router.post("/zones", response_model=Zone)
async def create_zone(zone_data: ZoneCreate):
    zone = Zone(**zone_data.model_dump())
    doc = zone.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.zones.insert_one(doc)
    await log_event("zone_added", f"Zone '{zone.name}' added", "info", zone_id=zone.id)
    return zone

@api_router.put("/zones/{zone_id}", response_model=Zone)
async def update_zone(zone_id: str, update: ZoneUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.zones.update_one({"id": zone_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if isinstance(zone.get('created_at'), str):
        zone['created_at'] = datetime.fromisoformat(zone['created_at'])
    return Zone(**zone)

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str):
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Delete all sensors in this zone
    await db.sensors.delete_many({"zone_id": zone_id})
    await db.zones.delete_one({"id": zone_id})
    await log_event("zone_removed", f"Zone '{zone['name']}' removed", "info", zone_id=zone_id)
    return {"message": "Zone deleted"}

# Sensors
@api_router.get("/sensors", response_model=List[Sensor])
async def get_sensors():
    sensors = await db.sensors.find({}, {"_id": 0}).to_list(100)
    for sensor in sensors:
        if isinstance(sensor.get('created_at'), str):
            sensor['created_at'] = datetime.fromisoformat(sensor['created_at'])
        if isinstance(sensor.get('last_triggered'), str):
            sensor['last_triggered'] = datetime.fromisoformat(sensor['last_triggered'])
    return sensors

@api_router.get("/sensors/zone/{zone_id}", response_model=List[Sensor])
async def get_sensors_by_zone(zone_id: str):
    sensors = await db.sensors.find({"zone_id": zone_id}, {"_id": 0}).to_list(100)
    for sensor in sensors:
        if isinstance(sensor.get('created_at'), str):
            sensor['created_at'] = datetime.fromisoformat(sensor['created_at'])
        if isinstance(sensor.get('last_triggered'), str):
            sensor['last_triggered'] = datetime.fromisoformat(sensor['last_triggered'])
    return sensors

@api_router.post("/sensors", response_model=Sensor)
async def create_sensor(sensor_data: SensorCreate):
    # Verify zone exists
    zone = await db.zones.find_one({"id": sensor_data.zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    sensor = Sensor(**sensor_data.model_dump())
    doc = sensor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc['last_triggered']:
        doc['last_triggered'] = doc['last_triggered'].isoformat()
    await db.sensors.insert_one(doc)
    await log_event("sensor_added", f"Sensor '{sensor.name}' ({sensor.type}) added to zone", "info", sensor_id=sensor.id, zone_id=sensor.zone_id)
    return sensor

@api_router.put("/sensors/{sensor_id}", response_model=Sensor)
async def update_sensor(sensor_id: str, update: SensorUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.sensors.update_one({"id": sensor_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    if isinstance(sensor.get('created_at'), str):
        sensor['created_at'] = datetime.fromisoformat(sensor['created_at'])
    if isinstance(sensor.get('last_triggered'), str):
        sensor['last_triggered'] = datetime.fromisoformat(sensor['last_triggered'])
    return Sensor(**sensor)

@api_router.delete("/sensors/{sensor_id}")
async def delete_sensor(sensor_id: str):
    sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    await db.sensors.delete_one({"id": sensor_id})
    await log_event("sensor_removed", f"Sensor '{sensor['name']}' removed", "info", sensor_id=sensor_id, zone_id=sensor.get('zone_id'))
    return {"message": "Sensor deleted"}

# Sensor Trigger (Simulation)
@api_router.post("/sensors/trigger")
async def trigger_sensor(trigger: SensorTrigger):
    sensor = await db.sensors.find_one({"id": trigger.sensor_id}, {"_id": 0})
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    zone = await db.zones.find_one({"id": sensor['zone_id']}, {"_id": 0})
    zone_name = zone['name'] if zone else "Unknown Zone"
    
    # Update sensor status
    now = datetime.now(timezone.utc)
    await db.sensors.update_one(
        {"id": trigger.sensor_id},
        {"$set": {"status": "triggered", "last_triggered": now.isoformat()}}
    )
    
    # Get system state
    state = await get_system_state()
    
    sensor_type_label = "Motion detected" if sensor['type'] == 'motion' else f"{sensor['type'].capitalize()} opened"
    message = f"{sensor_type_label} - {sensor['name']} in {zone_name}"
    
    if state.mode == "armed":
        # INTRUSION ALERT!
        await log_event("intrusion", f"🚨 INTRUSION DETECTED: {message}", "danger", sensor_id=trigger.sensor_id, zone_id=sensor['zone_id'])
        await send_sms_alert(f"🚨 SECURITY ALERT: {message}")
        return {"alert": True, "message": f"INTRUSION: {message}", "severity": "danger"}
    elif state.mode == "monitoring":
        # Just log the movement
        await log_event("sensor_triggered", f"Movement detected: {message}", "warning", sensor_id=trigger.sensor_id, zone_id=sensor['zone_id'])
        return {"alert": False, "message": f"Movement logged: {message}", "severity": "warning"}
    else:
        # System disarmed, no alert
        await log_event("sensor_triggered", f"Sensor triggered (system disarmed): {message}", "info", sensor_id=trigger.sensor_id, zone_id=sensor['zone_id'])
        return {"alert": False, "message": f"Logged: {message}", "severity": "info"}

# Reset sensor status
@api_router.post("/sensors/{sensor_id}/reset")
async def reset_sensor(sensor_id: str):
    result = await db.sensors.update_one(
        {"id": sensor_id},
        {"$set": {"status": "active"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return {"message": "Sensor reset"}

# Events/Activity Log
@api_router.get("/events", response_model=List[Event])
async def get_events(limit: int = 50):
    events = await db.events.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
    return events

@api_router.delete("/events")
async def clear_events():
    await db.events.delete_many({})
    await log_event("system", "Activity log cleared", "info")
    return {"message": "Events cleared"}

# Settings
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        default_settings = Settings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(update: SettingsUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return Settings(**settings)

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    state = await get_system_state()
    zones_count = await db.zones.count_documents({})
    sensors_count = await db.sensors.count_documents({})
    triggered_count = await db.sensors.count_documents({"status": "triggered"})
    recent_events = await db.events.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5)
    
    for event in recent_events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
    
    return {
        "system_mode": state.mode,
        "zones_count": zones_count,
        "sensors_count": sensors_count,
        "triggered_count": triggered_count,
        "recent_events": recent_events
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
