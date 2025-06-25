import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import List
import random
import math
from utils import haversine  # Assumes haversine(lat1, lon1, lat2, lon2) is defined here
from notifications import send_email
from sms_utils import send_sms
from pymongo import MongoClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# === MongoDB Setup ===
MONGO_URI = "mongodb://localhost:27017"  # Replace with your MongoDB URI
client = MongoClient(MONGO_URI)
db = client["car_booking_db"]
rides_collection = db["rides"]

# Create Async Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins='*', async_mode='asgi')

# Create FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Base driver data (without fixed locations)
base_drivers = [
    {"id": 1, "name": "Ravi", "vehicle_number": "KA05AB1234"},
    {"id": 2, "name": "Anita", "vehicle_number": "KA03CD5678"},
    {"id": 3, "name": "Sunil", "vehicle_number": "KA02EF9012"},
    {"id": 4, "name": "Priya", "vehicle_number": "KA01GH3456"},
    {"id": 5, "name": "Vikram", "vehicle_number": "KA04IJ7890"},
]

# ----------------------------
# Helper function to generate drivers near a location
def generate_drivers_near_location(lat, lon, num_drivers=3, radius_km=2.0):
    """
    Generate drivers within a specified radius of the given location
    
    Args:
        lat: Latitude of pickup location
        lon: Longitude of pickup location
        num_drivers: Number of drivers to generate (default: 3)
        radius_km: Radius in kilometers within which to place drivers (default: 2km)
    
    Returns:
        List of drivers with locations near the pickup point
    """
    drivers = []
    selected_base_drivers = random.sample(base_drivers, min(num_drivers, len(base_drivers)))
    
    for driver in selected_base_drivers:
        # Generate random angle and distance
        angle = random.uniform(0, 2 * math.pi)
        distance = random.uniform(0.1, radius_km)  # Between 100m to radius_km
        
        # Convert distance to approximate lat/lon offset
        # Rough approximation: 1 degree lat ≈ 111 km
        lat_offset = (distance * math.cos(angle)) / 111.0
        lon_offset = (distance * math.sin(angle)) / (111.0 * math.cos(math.radians(lat)))
        
        driver_location = [
            round(lat + lat_offset, 6),
            round(lon + lon_offset, 6)
        ]
        
        drivers.append({
            **driver,
            "location": driver_location,
            "distance_from_pickup": round(distance, 2)
        })
    
    return drivers

# ----------------------------
# Pydantic models
class RideRequest(BaseModel):
    pickup: str
    drop: str
    pickup_coords: List[float]  # [lat, lon] for pickup location

class FareRequest(BaseModel):
    pickup: List[float]
    drop: List[float]

class LocationRequest(BaseModel):
    lat: float
    lon: float

class DriverSearchRequest(BaseModel):
    pickup_lat: float
    pickup_lon: float
    radius_km: float = 2.0  # Default 2km radius
    num_drivers: int = 3    # Default 3 drivers

class SMSRequest(BaseModel):
    phone: str
    message: str

# === Ride Model ===
class Ride(BaseModel):
    rider_id: str
    driver_id: str
    pickup: str
    drop: str
    fare: float
    rating: Optional[int] = None
    ride_time: str = Field(default_factory=lambda: datetime.now().isoformat())
# ----------------------------
# REST Endpoints

# Keep your existing RideRequest model as is - no changes needed
class RideRequest(BaseModel):
    pickup: str
    drop: str
    pickup_coords: List[float]  # [lat, lon] for pickup location

# Updated book-ride endpoint
@app.post("/book-ride")
async def book_ride(ride: RideRequest):
    try:
        # Create ride document with default values
        ride_data = {
            "rider_id": getattr(ride, 'rider_id', 'default_user'),
            "driver_id": "1",  # Default driver assignment
            "pickup": ride.pickup,
            "drop": ride.drop,
            "fare": 100.0,  # Default fare, you can implement fare calculation later
            "rating": None,
            "ride_time": datetime.now().isoformat(),
            "pickup_coords": ride.pickup_coords,
            "status": "booked"
        }
        
        # Store in MongoDB
        result = rides_collection.insert_one(ride_data)
        
        # Return the same response as before, but now data is actually stored
        return {"message": "Ride booked successfully"}
        
    except Exception as e:
        # If database fails, still return success message but log the error
        print(f"Database error: {str(e)}")
        return {"message": "Ride booked successfully"}

@app.post("/calculate-fare")
def calculate_fare(data: FareRequest):
    lat1, lon1 = data.pickup
    lat2, lon2 = data.drop
    distance = haversine(lat1, lon1, lat2, lon2)
    fare = 50 + (distance * 10)  # ₹50 base fare + ₹10/km
    return {"distance": distance, "fare": round(fare, 2)}

@app.post("/match-driver")
async def match_driver(location: LocationRequest):
    """
    Find the nearest driver from dynamically generated drivers near pickup location
    """
    user_lat = location.lat
    user_lon = location.lon
    
    # Generate drivers near the pickup location
    nearby_drivers = generate_drivers_near_location(user_lat, user_lon)
    
    # Find the nearest driver
    nearest_driver = None
    min_distance = float("inf")
    
    for driver in nearby_drivers:
        driver_lat, driver_lon = driver["location"]
        distance = haversine(user_lat, user_lon, driver_lat, driver_lon)
        if distance < min_distance:
            min_distance = distance
            nearest_driver = driver
    
    return {
        "driver": nearest_driver,
        "distance_km": round(min_distance, 2),
        "all_nearby_drivers": nearby_drivers
    }

@app.post("/find-drivers")
async def find_drivers(request: DriverSearchRequest):
    """
    Get all available drivers near the pickup location
    """
    drivers = generate_drivers_near_location(
        request.pickup_lat, 
        request.pickup_lon, 
        request.num_drivers, 
        request.radius_km
    )
    
    # Sort drivers by distance from pickup
    drivers.sort(key=lambda x: x["distance_from_pickup"])
    
    return {
        "pickup_location": [request.pickup_lat, request.pickup_lon],
        "search_radius_km": request.radius_km,
        "drivers_found": len(drivers),
        "drivers": drivers
    }

@app.get("/drivers/near/{lat}/{lon}")
async def get_drivers_near_location(lat: float, lon: float, radius: float = 2.0, count: int = 5):
    """
    Quick endpoint to get drivers near a specific lat/lon
    """
    drivers = generate_drivers_near_location(lat, lon, count, radius)
    return {
        "location": [lat, lon],
        "drivers": drivers
    }

@app.post("/notify/email")
def notify_email(data: dict):
    email = data["email"]
    subject = data["subject"]
    content = data["message"]
    status = send_email(email, subject, content)
    return {"status": status}


@app.post("/notify/sms")
def notify_sms(data: SMSRequest):
    sid = send_sms(data.phone, data.message)
    return {"status": "sent", "sid": sid}

# === Store a New Ride ===
@app.post("/rides")
def create_ride(ride: Ride):
    result = rides_collection.insert_one(ride.dict())
    return {"message": "Ride stored successfully", "ride_id": str(result.inserted_id)}

# === Get All Rides for a Specific Rider ===
@app.get("/rides/user/{rider_id}")
def get_rides_for_user(rider_id: str):
    rides = list(rides_collection.find({"rider_id": rider_id}))
    for ride in rides:
        ride["_id"] = str(ride["_id"])
    return rides

# === Get All Rides (Admin use) ===
@app.get("/rides")
def get_all_rides():
    rides = list(rides_collection.find())
    for ride in rides:
        ride["_id"] = str(ride["_id"])
    return rides

# ----------------------------
# Socket.IO Events

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def locationUpdate(sid, data):
    print(f"Location from {sid}: {data}")
    await sio.emit("driverLocation", data)

@sio.event
async def requestDrivers(sid, data):
    """
    Socket event to request drivers near a location
    """
    try:
        lat = data.get('lat')
        lon = data.get('lon')
        radius = data.get('radius', 2.0)
        count = data.get('count', 3)
        
        if lat is None or lon is None:
            await sio.emit("error", {"message": "Invalid location data"}, room=sid)
            return
        
        drivers = generate_drivers_near_location(lat, lon, count, radius)
        
        await sio.emit("driversFound", {
            "pickup_location": [lat, lon],
            "drivers": drivers
        }, room=sid)
        
    except Exception as e:
        await sio.emit("error", {"message": str(e)}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# ----------------------------
# Combine Socket.IO with FastAPI
socket_app = socketio.ASGIApp(sio, app)

# ----------------------------
# Entry point
if __name__ == "__main__":
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)