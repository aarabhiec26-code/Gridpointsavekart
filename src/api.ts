import { supabase } from './supabaseClient';
import type {
  Neighbourhood,
  Warehouse,
  Order,
  PetrolPump,
  OptimizationRun,
  DeliveryRoute,
  OptimizationParams,
  OptimizationResults,
} from './types';

export async function fetchNeighbourhoods(): Promise<Neighbourhood[]> {
  const { data, error } = await supabase
    .from('neighbourhoods')
    .select('*')
    .order('daily_orders', { ascending: false });
  if (error) throw error;
  return data as Neighbourhood[];
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Warehouse[];
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function fetchPetrolPumps(): Promise<PetrolPump[]> {
  const { data, error } = await supabase.from('petrol_pumps').select('*').order('name');
  if (error) throw error;
  return data as PetrolPump[];
}

export async function fetchOptimizationRuns(): Promise<OptimizationRun[]> {
  const { data, error } = await supabase
    .from('optimization_runs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as OptimizationRun[];
}

export async function fetchRoutes(): Promise<DeliveryRoute[]> {
  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DeliveryRoute[];
}

export async function addNeighbourhood(
  nb: Omit<Neighbourhood, 'id' | 'created_at'>
): Promise<Neighbourhood> {
  const { data, error } = await supabase
    .from('neighbourhoods')
    .insert([nb])
    .select()
    .single();
  if (error) throw error;
  return data as Neighbourhood;
}

export async function addWarehouse(
  wh: Omit<Warehouse, 'id' | 'created_at'>
): Promise<Warehouse> {
  const { data, error } = await supabase
    .from('warehouses')
    .insert([wh])
    .select()
    .single();
  if (error) throw error;
  return data as Warehouse;
}

export async function addOrder(
  order: Partial<Order>
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert([order])
    .select()
    .single();
  if (error) throw error;
  return data as Order;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  const { error } = await supabase.from('orders').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteNeighbourhood(id: string): Promise<void> {
  const { error } = await supabase.from('neighbourhoods').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}

export async function saveOptimizationRun(
  runName: string,
  params: OptimizationParams,
  results: OptimizationResults
): Promise<OptimizationRun> {
  const { data, error } = await supabase
    .from('optimization_runs')
    .insert([
      {
        run_name: runName,
        parameters: params,
        results: results,
        total_cost: results.total_weighted_cost,
        total_savings: results.total_co_delivery_savings,
        warehouses_selected: results.warehouse_costs.length,
        neighbourhoods_served: results.assignments.length,
        status: 'completed',
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as OptimizationRun;
}

export async function saveRoutes(routes: DeliveryRoute[]): Promise<void> {
  const rows = routes.map((r) => ({
    warehouse_id: r.warehouse_id,
    route_name: r.route_name,
    stop_sequence: r.stop_sequence,
    total_distance_km: r.total_distance_km,
    total_time_min: r.total_time_min,
    num_stops: r.num_stops,
    total_orders: r.total_orders,
    fuel_cost: r.fuel_cost,
    co_delivery_savings: r.co_delivery_savings,
    vehicle_type: r.vehicle_type,
    partner_name: r.partner_name,
  }));
  const { error } = await supabase.from('delivery_routes').insert(rows);
  if (error) throw error;
}

export async function bulkInsertNeighbourhoods(
  rows: { name: string; lat: number; lon: number; daily_orders: number }[]
): Promise<number> {
  const { data, error } = await supabase
    .from('neighbourhoods')
    .insert(
      rows.map((r) => ({
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        daily_orders: r.daily_orders,
        population: 0,
        frequency_class:
          r.daily_orders >= 200 ? 'red' : r.daily_orders >= 120 ? 'amber' : 'green',
        on_time_rate: 0.88,
        is_custom: true,
      }))
    )
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function updateWarehouseOptimal(
  warehouseIds: string[]
): Promise<void> {
  await supabase.from('warehouses').update({ is_optimal: false }).neq('id', 'x');
  for (const id of warehouseIds) {
    await supabase.from('warehouses').update({ is_optimal: true }).eq('id', id);
  }
}
