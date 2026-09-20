/*
# SAVeKART — Warehouse Location Optimization Platform Schema

## Purpose
Stores neighbourhood data, warehouse candidates, orders, optimization results,
routes, and user-uploaded datasets for the SAVeKART platform.

## New Tables
1. `neighbourhoods` — City neighbourhoods with lat/lon, population, daily orders, order frequency class
2. `warehouses` — Candidate/existing warehouse locations with capacity, load, operational status
3. `orders` — Individual orders with type (fragile/normal/sturdy), status, assigned warehouse, delivery details
4. `optimization_runs` — Records of optimization executions with input parameters and results
5. `delivery_routes` — Optimized routes per warehouse with stop sequences and savings calculations
6. `petrol_pumps` — Petrol pump locations for route planning reference
7. `dataset_uploads` — CSV upload records (name, lat, lon, daily orders) for user-fed data

## Security
- Single-tenant app (no auth). All policies use TO anon, authenticated with USING (true) since data is intentionally public/shared.
- RLS enabled on every table.
*/
-- =============================================
-- Neighbourhoods
-- =============================================
CREATE TABLE IF NOT EXISTS neighbourhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  population integer NOT NULL DEFAULT 0,
  daily_orders integer NOT NULL DEFAULT 0,
  frequency_class text NOT NULL DEFAULT 'green',
  on_time_rate double precision NOT NULL DEFAULT 0.90,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE neighbourhoods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_neighbourhoods" ON neighbourhoods;
CREATE POLICY "anon_select_neighbourhoods" ON neighbourhoods FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_neighbourhoods" ON neighbourhoods;
CREATE POLICY "anon_insert_neighbourhoods" ON neighbourhoods FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_neighbourhoods" ON neighbourhoods;
CREATE POLICY "anon_update_neighbourhoods" ON neighbourhoods FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_neighbourhoods" ON neighbourhoods;
CREATE POLICY "anon_delete_neighbourhoods" ON neighbourhoods FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Warehouses (candidate + existing)
-- =============================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  capacity_sqft integer NOT NULL DEFAULT 5000,
  current_load_sqft integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_optimal boolean NOT NULL DEFAULT false,
  area_type text NOT NULL DEFAULT 'commercial',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_warehouses" ON warehouses;
CREATE POLICY "anon_select_warehouses" ON warehouses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_warehouses" ON warehouses;
CREATE POLICY "anon_insert_warehouses" ON warehouses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouses" ON warehouses;
CREATE POLICY "anon_update_warehouses" ON warehouses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouses" ON warehouses;
CREATE POLICY "anon_delete_warehouses" ON warehouses FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Orders
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref text NOT NULL,
  neighbourhood_id uuid REFERENCES neighbourhoods(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  order_type text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  weight_kg double precision NOT NULL DEFAULT 1.0,
  volume_cft double precision NOT NULL DEFAULT 1.0,
  customer_lat double precision,
  customer_lon double precision,
  delivery_address text,
  assigned_route_id uuid,
  delivery_partner text,
  vehicle_type text,
  est_delivery_time text,
  actual_delivery_time text,
  on_time boolean DEFAULT true,
  co_delivery_savings double precision DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Optimization Runs
-- =============================================
CREATE TABLE IF NOT EXISTS optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name text NOT NULL DEFAULT 'Optimization Run',
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_cost double precision DEFAULT 0,
  total_savings double precision DEFAULT 0,
  warehouses_selected integer DEFAULT 0,
  neighbourhoods_served integer DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_opt_runs" ON optimization_runs;
CREATE POLICY "anon_select_opt_runs" ON optimization_runs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_opt_runs" ON optimization_runs;
CREATE POLICY "anon_insert_opt_runs" ON optimization_runs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_opt_runs" ON optimization_runs;
CREATE POLICY "anon_update_opt_runs" ON optimization_runs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_opt_runs" ON optimization_runs;
CREATE POLICY "anon_delete_opt_runs" ON optimization_runs FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Delivery Routes
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  route_name text NOT NULL,
  stop_sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_distance_km double precision DEFAULT 0,
  total_time_min double precision DEFAULT 0,
  num_stops integer DEFAULT 0,
  total_orders integer DEFAULT 0,
  fuel_cost double precision DEFAULT 0,
  co_delivery_savings double precision DEFAULT 0,
  vehicle_type text,
  partner_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_routes" ON delivery_routes;
CREATE POLICY "anon_select_routes" ON delivery_routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_routes" ON delivery_routes;
CREATE POLICY "anon_insert_routes" ON delivery_routes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routes" ON delivery_routes;
CREATE POLICY "anon_update_routes" ON delivery_routes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routes" ON delivery_routes;
CREATE POLICY "anon_delete_routes" ON delivery_routes FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Petrol Pumps
-- =============================================
CREATE TABLE IF NOT EXISTS petrol_pumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  brand text DEFAULT 'IOC',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE petrol_pumps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_petrol" ON petrol_pumps;
CREATE POLICY "anon_select_petrol" ON petrol_pumps FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_petrol" ON petrol_pumps;
CREATE POLICY "anon_insert_petrol" ON petrol_pumps FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_petrol" ON petrol_pumps;
CREATE POLICY "anon_update_petrol" ON petrol_pumps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_petrol" ON petrol_pumps;
CREATE POLICY "anon_delete_petrol" ON petrol_pumps FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Dataset Uploads
-- =============================================
CREATE TABLE IF NOT EXISTS dataset_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  row_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dataset_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_uploads" ON dataset_uploads;
CREATE POLICY "anon_select_uploads" ON dataset_uploads FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_uploads" ON dataset_uploads;
CREATE POLICY "anon_insert_uploads" ON dataset_uploads FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_uploads" ON dataset_uploads;
CREATE POLICY "anon_update_uploads" ON dataset_uploads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_uploads" ON dataset_uploads;
CREATE POLICY "anon_delete_uploads" ON dataset_uploads FOR DELETE TO anon, authenticated USING (true);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_neighbourhoods_freq ON neighbourhoods(frequency_class);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse ON orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_neighbourhood ON orders(neighbourhood_id);
CREATE INDEX IF NOT EXISTS idx_routes_warehouse ON delivery_routes(warehouse_id);
