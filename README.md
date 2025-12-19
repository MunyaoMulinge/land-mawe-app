# 🚛 Land Mawe

Admin portal for tracking trucks for roadshows.

## Features
- **Dashboard** - Overview of fleet status and recent bookings
- **Trucks** - Manage fleet, track availability/booked/maintenance status
- **Drivers** - Onboard drivers with checklist requirements
- **Bookings** - Schedule trucks for roadshow events

## Quick Start

### 1. Database Setup
```bash
# Create database
createdb land_mawe

# Run schema
psql -d land_mawe -f server/schema.sql
```

### 2. Start Backend
```bash
cd server
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack
- React + Vite (Frontend)
- Express (Backend)
- PostgreSQL (Database)
