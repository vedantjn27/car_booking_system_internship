🚖 Car Booking Service – Backend (FastAPI + Socket.IO + MongoDB)
A full-featured car booking backend system inspired by Ola/Uber. It supports user & driver authentication, real-time driver discovery, fare estimation, booking, driver assignment, ratings, ride history, admin control, and notifications.

📌 Tech Stack
Backend Framework: FastAPI

Database: MongoDB

Real-Time Communication: Socket.IO,OpenStreetMap

Notifications: Email & SMS support(SendGrid and twirlio)

Geolocation: Haversine formula for distance calculation

Authentication: Basic (JWT integration recommended for production)

Deployment: Run with Uvicorn or any ASGI server

🚀 Features
👤 User Module
Register/login as rider or driver

Book and cancel rides

View past ride history

Rate completed rides

🚗 Driver Module
Register vehicle/license details

View available ride requests

Accept or cancel rides

View assigned & completed rides

Update availability status

Earnings summary

Average rating

⚙️ Admin Module
View all users and drivers

Toggle user/driver status (Active/Blocked)

View system-wide stats

Total spending by each customer

Average rating and total earnings per driver

🌐 Real-Time Features
Location tracking using locationUpdate event

Live nearby driver generation using requestDrivers

📡 Notifications
Email: via /notify/email

SMS: via /notify/sms

