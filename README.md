# SAVeKART — Warehouse Location Optimization Platform

**A mathematical optimization platform for warehouse location selection, neighbourhood assignment, route planning, and delivery management — applied to Hubli-Dharwad, Karnataka (Tier-2 city).**

## Overview

SAVeKART determines where warehouses should be located and which neighbourhoods should be assigned to each warehouse. It minimizes weighted delivery cost, where neighbourhoods with more orders contribute more heavily to the objective function. The platform uses linear programming, statistics, and maxima-minima applications to solve the optimization problem.

## City: Hubli-Dharwad, Karnataka

- **Population:** ~9.3 lakh (930,000) — Tier-2 city
- **Neighbourhoods loaded:** 25 (Old Hubli, Keshwapur, Vidyanagar, Dharwad Court Circle, etc.)
- **Warehouse candidates:** 8 (Gokul Road Logistics Hub, Navanagar Distribution Centre, etc.)
- **Petrol pumps mapped:** 10 (IOC, HP, BPCL across major routes)

## Features

### 1. Data Upload & Validation
- CSV upload with only 4 columns: `name, lat, lon, daily_orders`
- Manual neighbourhood entry form
- Automatic frequency classification (Red/Amber/Green zones)
- CSV template download

### 2. Demand Statistics
- Order weight analysis per neighbourhood
- Red/Amber/Green frequency class distribution
- Peak-day demand estimation (1.35x multiplier)
- Standard deviation and variance calculations

### 3. Distance & Reliability Matrices
- Haversine distance between all neighbourhood-warehouse pairs
- On-time probability: `P = base_rate × e^(-distance/radius)`
- Full reliability matrix within service radius

### 4. Optimization Model (Linear Program)
- **Objective:** Minimize order-weighted delivery cost + late-delivery penalty
- **Constraints:** 5km service radius, max warehouse count, single assignment
- **Method:** Greedy facility-location heuristic with scoring function
- Adjustable parameters: max warehouses, service radius, late penalty, fuel cost, time expectation, co-delivery discount

### 5. Route Optimization
- Nearest-neighbour TSP heuristic for each warehouse
- Time-window estimation based on distance and stop count
- Fuel cost calculation per route
- Petrol pump indicators along routes
- Co-delivery detection for adjacent neighbourhoods (within 0.5 km)

### 6. Simulation & Sensitivity Analysis
- Varying service radius (3-7 km)
- Varying late penalty (₹0-₹100)
- Varying max warehouses (2-6)
- Cost breakdown: fuel cost vs late penalty vs savings

### 7. Order Tracking & Classification
- Order type classification: **Fragile**, **Normal**, **Sturdy**
- Vehicle recommendation per order type:
  - Fragile → Electric Cargo Van (low vibration, zero emissions)
  - Normal → Petrol 3-Wheeler (balanced cost/capacity)
  - Sturdy → Diesel Mini Truck (high load capacity)
- Status tracking: Pending → Assigned → Out for Delivery → Delivered/Failed
- Co-delivery savings calculation

### 8. Warehouse Space Optimization
- Bin-packing heuristic for storage allocation
- Load utilization percentage per warehouse
- Overflow detection

### 9. Innovation Lab (Extensible)
SAVeKART is designed to be extensible. New features can be added after deployment:
- Carbon footprint tracker
- Demand forecasting (time-series)
- Crowdsourced delivery network
- Weather-aware routing
- Dynamic pricing engine
- Micro-warehouse network

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Maps | Leaflet + OpenStreetMap |
| Backend/Database | Supabase (PostgreSQL) |
| CSV Parsing | PapaParse |
| Testing | Vitest |

## Open Source Libraries Used

- **react** (v18.3.1) — UI framework (MIT)
- **react-dom** (v18.3.1) — React DOM renderer (MIT)
- **leaflet** (v1.9.4) — Interactive maps (BSD-2-Clause)
- **react-leaflet** (v4.2.1) — React bindings for Leaflet (MIT)
- **papaparse** (v5.4.1) — CSV parsing (MIT)
- **@supabase/supabase-js** (v2.45.4) — Supabase client (MIT)
- **typescript** (v5.6.2) — Type checking (Apache-2.0)
- **vite** (v5.4.8) — Build tool (MIT)
- **vitest** (v2.1.1) — Testing framework (MIT)

## Project Structure

```
savekart/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main app with 8 tabs
│   ├── index.css             # Global styles + design system
│   ├── types.ts              # TypeScript interfaces
│   ├── supabaseClient.ts     # Supabase client setup
│   ├── api.ts                # Database CRUD operations
│   ├── optimization.ts       # Mathematical optimization engine
│   ├── optimization.test.ts  # Unit tests (16 tests)
│   └── MapView.tsx           # Leaflet map component
├── MATHEMATICAL_CALCULATIONS.md  # Mathematical model documentation
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## Setup & Run

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run test     # Run tests
```

## Testing

16 unit tests covering:
- Haversine distance calculation
- Frequency classification
- Order type classification (fragile/normal/sturdy)
- Optimization model (assignment, cost, coverage)
- Route optimization
- Demand statistics
- Vehicle recommendations

## Language

The platform is built using **TypeScript** (a typed superset of JavaScript). The optimization engine uses mathematical functions implemented in TypeScript — no external LP solver library is used; the greedy heuristic and TSP are implemented from scratch.

## License

MIT — Free to use, modify, and distribute.

## Author

Built as a hackathon project for warehouse location optimization in Tier-2 Karnataka cities.
