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
from bson import ObjectId
from fastapi import Body
from bson.errors import InvalidId

# === MongoDB Setup ===
MONGO_URI = "mongodb://localhost:27017"  # Replace with your MongoDB URI
client = MongoClient(MONGO_URI)
db = client["car_booking_db"]
rides_collection = db["rides"]
users_collection = db["users"]
drivers_collection = db["drivers"]
driver_status_collection = db["driver_status"]

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

class UserSignup(BaseModel):
    email: str
    password: str
    user_type: str  # 'user', 'driver', or 'admin'

class UserLogin(BaseModel):
    email: str
    password: str    

class DriverDetails(BaseModel):
    email: str
    vehicle_number: str
    license_number: str

class DriverStatus(BaseModel):
    driver_email: str
    is_available: bool

class RideAction(BaseModel):
    ride_id: str
    driver_email: Optional[str] = None 

# === Ride Model ===
class Ride(BaseModel):
    rider_email: str
    driver_id: str
    pickup: str
    drop: str
    fare: float
    rating: Optional[int] = None
    ride_time: str = Field(default_factory=lambda: datetime.now().isoformat())

# Keep your existing RideRequest model as is - no changes needed
class RideRequest(BaseModel):
    pickup: str
    drop: str
    pickup_coords: List[float]
    rider_email: str

class DriverCancelRideRequest(BaseModel):
    ride_id: str
    driver_email: Optional[str] = None 

# ----------------------------
# REST Endpoints

# Updated book-ride endpoint
@app.post("/book-ride")
async def book_ride(ride: RideRequest):
    try:
        lat1, lon1 = ride.pickup_coords
        # Hardcode or fetch drop coords here; for now, assume dummy:
        lat2, lon2 = lat1 + 0.05, lon1 + 0.05  # Temporary
        
        distance = haversine(lat1, lon1, lat2, lon2)
        fare = 50 + (distance * 10)

        ride_data = {
            "rider_email": ride.rider_email,
            "driver_id": None,
            "pickup": ride.pickup,
            "drop": ride.drop,
            "pickup_coords": ride.pickup_coords,
            "fare": round(fare, 2),
            "distance": round(distance, 2),
            "rating": None,
            "status": "booked",
            "ride_time": datetime.now().isoformat()
        }

        rides_collection.insert_one(ride_data)
        return {"message": "Ride booked successfully"}
    except Exception as e:
        print(f"Database error: {str(e)}")
        return {"message": "Ride booking failed"}

@app.post("/cancel-ride")
def cancel_ride(action: RideAction):
    ride = rides_collection.find_one({"_id": ObjectId(action.ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.get("status") not in ["booked"]:
        raise HTTPException(status_code=400, detail="Only booked rides can be canceled")

    rides_collection.update_one(
        {"_id": ObjectId(action.ride_id)},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}}
    )
    return {"message": "Ride cancelled successfully"}

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
@app.get("/rides/user/{email}")
def get_rides_for_user(email: str):
    rides = list(rides_collection.find({"rider_email": email}))
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

@app.post("/register")
def register_user(user: UserSignup):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    users_collection.insert_one({
        "email": user.email,
        "password": user.password,  # For production, hash this password!
        "user_type": user.user_type
    })

    return {"message": "User registered successfully", "email": user.email, "role": user.user_type}

@app.post("/login")
def login_user(user: UserLogin):
    found = users_collection.find_one({"email": user.email, "password": user.password})
    if not found:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "email": found["email"],
        "user_type": found["user_type"]
    }

@app.get("/user/{email}")
def get_user(email: str):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email": user["email"],
        "user_type": user["user_type"]
    }

@app.post("/rate-ride/{ride_id}")
def rate_ride(ride_id: str, rating: int = Body(..., embed=True)):
    if rating < 1 or rating > 5:
        return {"error": "Rating must be between 1 and 5"}
    result = rides_collection.update_one(
        {"_id": ObjectId(ride_id), "status": "completed"},
        {"$set": {"rating": rating}}
    )
    if result.modified_count == 1:
        return {"message": "Rating submitted successfully"}
    return {"error": "Ride not found or not completed yet"}

@app.post("/driver/register-details")
def register_driver_details(driver: DriverDetails):
    existing_driver = drivers_collection.find_one({"email": driver.email})
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver details already exist")

    drivers_collection.insert_one(driver.dict())
    return {"message": "Driver details added successfully"}

# 1. GET: Available Rides (unassigned rides)
@app.get("/driver/available-rides")
def available_rides():
    rides = list(rides_collection.find({"driver_id": None}))
    for ride in rides:
        ride["_id"] = str(ride["_id"])
    return rides

# 2. GET: Driver's assigned rides
@app.get("/driver/my-rides/{driver_email}")
def my_rides(driver_email: str):
    rides = list(rides_collection.find({"driver_id": driver_email}))
    for ride in rides:
        ride["_id"] = str(ride["_id"])
    return rides

# 3. GET: Driver's earnings summary
@app.get("/driver/earnings/{driver_email}")
def driver_earnings(driver_email: str):
    completed_rides = list(rides_collection.find({
        "driver_id": driver_email,
        "status": "completed"
    }))
    total_earnings = sum(ride.get("fare", 0) for ride in completed_rides)
    total_rides = len(completed_rides)
    return {
        "driver": driver_email,
        "total_rides": total_rides,
        "total_earnings": round(total_earnings, 2)
    }

# 4. POST: Update driver availability
@app.post("/driver/status")
def update_driver_status(status: DriverStatus):
    driver_status_collection.update_one(
        {"driver_email": status.driver_email},
        {"$set": {"is_available": status.is_available}},
        upsert=True
    )
    return {"message": "Driver status updated"}

# 5. POST: Accept a ride
@app.post("/driver/accept-ride")
def accept_ride(action: RideAction):
    try:
        ride = rides_collection.find_one({"_id": ObjectId(action.ride_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Ride ID format")

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.get("driver_id"):
        raise HTTPException(status_code=400, detail="Ride already accepted")

    rides_collection.update_one(
        {"_id": ObjectId(action.ride_id)},
        {"$set": {"driver_id": action.driver_email, "status": "ongoing"}}
    )
    return {"message": "Ride accepted"}

# 6. POST: Complete a ride
@app.post("/driver/complete-ride")
def complete_ride(action: RideAction):
    try:
        ride = rides_collection.find_one({"_id": ObjectId(action.ride_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Ride ID format")

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.get("status") != "ongoing":
        raise HTTPException(status_code=400, detail="Ride not in progress")

    rides_collection.update_one(
        {"_id": ObjectId(action.ride_id)},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )

    return {"message": "Ride marked as completed"}

##7.Driver Rating
@app.get("/driver/{driver_id}/rating")
def get_driver_rating(driver_id: str):
    completed_rides = list(rides_collection.find({
        "driver_id": driver_id,
        "status": "completed",
        "rating": {"$ne": None}
    }))

    if not completed_rides:
        return {"average_rating": 0.0, "total_rides": 0}

    total_rating = sum(ride["rating"] for ride in completed_rides)
    average = round(total_rating / len(completed_rides), 1)

    return {
        "average_rating": average,
        "total_rides": len(completed_rides)
    }

##8. Driver cancels a ride
@app.post("/driver/cancel-ride")
def cancel_driver_ride(data: DriverCancelRideRequest):
    try:
        ride_obj_id = ObjectId(data.ride_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ride ID format")

    ride = rides_collection.find_one({"_id": ride_obj_id})

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.get("status") != "ongoing":
        raise HTTPException(status_code=400, detail="Only ongoing rides can be cancelled")

    # Set ride as cancelled
    rides_collection.update_one(
        {"_id": ride_obj_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": "driver",
            "cancelled_at": datetime.utcnow()
        }}
    )

    return {"message": "Ride cancelled by driver"}

##admin
@app.get("/admin/stats")
def get_admin_stats():
    total_users = users_collection.count_documents({})
    total_customers = users_collection.count_documents({"user_type": "customer"})
    total_drivers = users_collection.count_documents({"user_type": "driver"})
    total_rides = rides_collection.count_documents({})
    active_rides = rides_collection.count_documents({"status": {"$in": ["booked", "ongoing"]}})
    return {
        "totalUsers": total_users,
        "totalDrivers": total_drivers,
        "totalCustomers": total_customers,
        "totalRides": total_rides,
        "activeRides": active_rides
    }

@app.get("/admin/customers")
def get_customers():
    users = list(users_collection.find({"user_type": "customer"}))
    customers = []

    for user in users:
        email = user.get("email", "")  # this is from users_collection
        joined = str(user.get("_id").generation_time)

        # Fetch total fare from rides_collection using rider_email
        total_spent = sum(
            ride.get("fare", 0)
            for ride in rides_collection.find({"rider_email": email, "status": "completed"})
        )

        customers.append({
            "email": email,
            "joined_at": joined,
            "total_spent": round(total_spent, 2)
        })

    return customers

@app.get("/admin/drivers")
def get_all_drivers():
    drivers = list(users_collection.find({"user_type": "driver"}))

    # Maps for vehicle numbers and availability
    driver_details_map = {
        d["email"]: d for d in drivers_collection.find()
    }
    driver_status_map = {
        s["driver_email"]: s["is_available"]
        for s in driver_status_collection.find()
    }

    result = []

    for driver in drivers:
        email = driver["email"]

        # Completed rides for the driver
        completed_rides = list(rides_collection.find({
            "driver_id": email,
            "status": "completed"
        }))

        # Total earnings
        earnings = sum(ride.get("fare", 0) for ride in completed_rides)

        # Calculate average rating
        rated_rides = [ride for ride in completed_rides if ride.get("rating") is not None]
        avg_rating = round(sum(ride["rating"] for ride in rated_rides) / len(rated_rides), 1) if rated_rides else 0.0

        # Get vehicle and availability
        vehicle = driver_details_map.get(email, {}).get("vehicle_number", "N/A")
        status = driver_status_map.get(email, False)

        result.append({
            "email": email,
            "vehicle_number": vehicle,
            "total_earned": round(earnings, 2),
            "is_available": status,
            "average_rating": avg_rating,
            "completed_rides": len(completed_rides)
        })

    return result
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