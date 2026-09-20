export interface Neighbourhood {
  id: string;
  name: string;
  lat: number;
  lon: number;
  population: number;
  daily_orders: number;
  frequency_class: 'red' | 'amber' | 'green';
  on_time_rate: number;
  is_custom: boolean;
  created_at?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity_sqft: number;
  current_load_sqft: number;
  is_active: boolean;
  is_optimal: boolean;
  area_type: string;
  created_at?: string;
}

export interface Order {
  id: string;
  order_ref: string;
  neighbourhood_id: string | null;
  warehouse_id: string | null;
  order_type: 'fragile' | 'normal' | 'sturdy';
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'failed';
  weight_kg: number;
  volume_cft: number;
  customer_lat: number | null;
  customer_lon: number | null;
  delivery_address: string | null;
  assigned_route_id: string | null;
  delivery_partner: string | null;
  vehicle_type: string | null;
  est_delivery_time: string | null;
  actual_delivery_time: string | null;
  on_time: boolean | null;
  co_delivery_savings: number;
  created_at?: string;
}

export interface DeliveryRoute {
  id: string;
  warehouse_id: string | null;
  route_name: string;
  stop_sequence: RouteStop[];
  total_distance_km: number;
  total_time_min: number;
  num_stops: number;
  total_orders: number;
  fuel_cost: number;
  co_delivery_savings: number;
  vehicle_type: string | null;
  partner_name: string | null;
  created_at?: string;
}

export interface RouteStop {
  neighbourhood_id: string;
  name: string;
  lat: number;
  lon: number;
  orders: number;
  sequence: number;
}

export interface PetrolPump {
  id: string;
  name: string;
  lat: number;
  lon: number;
  brand: string;
}

export interface OptimizationRun {
  id: string;
  run_name: string;
  parameters: OptimizationParams;
  results: OptimizationResults;
  total_cost: number;
  total_savings: number;
  warehouses_selected: number;
  neighbourhoods_served: number;
  status: string;
  created_at?: string;
}

export interface OptimizationParams {
  max_warehouses: number;
  service_radius_km: number;
  late_penalty: number;
  time_expectation_hours: number;
  fuel_cost_per_km: number;
  co_delivery_discount_percent: number;
}

export interface OptimizationResults {
  assignments: Assignment[];
  warehouse_costs: WarehouseCost[];
  total_weighted_cost: number;
  total_late_penalty: number;
  total_fuel_cost: number;
  total_co_delivery_savings: number;
  avg_on_time_rate: number;
  coverage_percent: number;
}

export interface Assignment {
  neighbourhood_id: string;
  neighbourhood_name: string;
  warehouse_id: string;
  warehouse_name: string;
  distance_km: number;
  delivery_cost: number;
  late_penalty: number;
  on_time_prob: number;
  orders: number;
  order_weight: number;
  is_co_delivery: boolean;
  savings: number;
}

export interface WarehouseCost {
  warehouse_id: string;
  warehouse_name: string;
  neighbourhoods_served: number;
  total_orders: number;
  total_cost: number;
  load_utilization_percent: number;
}

export interface VehicleRecommendation {
  order_type: 'fragile' | 'normal' | 'sturdy';
  vehicle: string;
  reason: string;
  fuel_efficiency_km_per_l: number;
  load_capacity_kg: number;
  cost_per_km: number;
}

export interface CSVRow {
  name: string;
  lat: number;
  lon: number;
  daily_orders: number;
}

export type FrequencyClass = 'red' | 'amber' | 'green';
