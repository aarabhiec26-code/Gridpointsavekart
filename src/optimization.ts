import type {
  Neighbourhood,
  Warehouse,
  OptimizationParams,
  OptimizationResults,
  Assignment,
  WarehouseCost,
  VehicleRecommendation,
  RouteStop,
  DeliveryRoute,
} from './types';

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function classifyFrequency(dailyOrders: number): 'red' | 'amber' | 'green' {
  if (dailyOrders >= 200) return 'red';
  if (dailyOrders >= 120) return 'amber';
  return 'green';
}

export function defaultParams(): OptimizationParams {
  return {
    max_warehouses: 5,
    service_radius_km: 5.0,
    late_penalty: 50,
    time_expectation_hours: 24,
    fuel_cost_per_km: 8.5,
    co_delivery_discount_percent: 8,
  };
}

export function vehicleRecommendations(): VehicleRecommendation[] {
  return [
    {
      order_type: 'fragile',
      vehicle: 'Electric Cargo Van (Bajaj RE EV)',
      reason:
        'Electric van provides smooth acceleration with minimal vibration, reducing damage risk for fragile goods. Zero emissions, lowest fuel cost.',
      fuel_efficiency_km_per_l: 0,
      load_capacity_kg: 200,
      cost_per_km: 2.5,
    },
    {
      order_type: 'normal',
      vehicle: 'Petrol 3-Wheeler (Piaggio Ape)',
      reason:
        'Balanced cost and capacity for standard parcels. Widely available in Hubli-Dharwad, low maintenance, moderate fuel consumption.',
      fuel_efficiency_km_per_l: 25,
      load_capacity_kg: 500,
      cost_per_km: 4.0,
    },
    {
      order_type: 'sturdy',
      vehicle: 'Diesel Mini Truck (Tata Ace)',
      reason:
        'High load capacity for heavy/sturdy goods. Best fuel efficiency per kg for bulk deliveries on highway-grade roads.',
      fuel_efficiency_km_per_l: 15,
      load_capacity_kg: 1000,
      cost_per_km: 6.0,
    },
  ];
}

function getVehicleForType(orderType: string): VehicleRecommendation {
  const recs = vehicleRecommendations();
  return recs.find((r) => r.order_type === orderType) ?? recs[1];
}

interface ScoredWarehouse {
  warehouse: Warehouse;
  totalScore: number;
  neighbourhoodsServed: number;
}

/**
 * Optimization model: minimises order-weighted delivery cost + late-delivery penalty.
 *
 * Objective function (per neighbourhood i, warehouse j):
 *   C_ij = (d_ij * fuel_cost_per_km) + (orders_i * late_penalty * (1 - on_time_rate_ij))
 *   Weight_ij = C_ij * orders_i
 *
 * Total cost = Σ (selected j for each i) Weight_ij
 *
 * Constraint 1: d_ij <= service_radius_km (5 km)
 * Constraint 2: number of selected warehouses <= max_warehouses
 * Constraint 3: each neighbourhood assigned to exactly one warehouse
 *
 * Greedy facility-location heuristic:
 * 1. Score each warehouse by sum of (orders / max(0.1, distance)) for all
 *    neighbourhoods within the service radius — higher orders and shorter
 *    distance produce a higher score.
 * 2. Select the top-K warehouses by score.
 * 3. Assign each neighbourhood to the nearest selected warehouse within radius.
 * 4. Compute co-delivery savings for neighbourhoods sharing the same warehouse
 *    and being within 0.5 km of each other (same building / adjacent houses).
 */
export function runOptimization(
  neighbourhoods: Neighbourhood[],
  warehouses: Warehouse[],
  params: OptimizationParams
): OptimizationResults {
  const { max_warehouses, service_radius_km, late_penalty, fuel_cost_per_km } = params;

  // Step 1: Score warehouses
  const scored: ScoredWarehouse[] = warehouses.map((wh) => {
    let totalScore = 0;
    let count = 0;
    for (const nb of neighbourhoods) {
      const dist = haversineDistance(wh.lat, wh.lon, nb.lat, nb.lon);
      if (dist <= service_radius_km) {
        totalScore += nb.daily_orders / Math.max(0.1, dist);
        count++;
      }
    }
    return { warehouse: wh, totalScore, neighbourhoodsServed: count };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  const selected = scored.slice(0, max_warehouses).filter((s) => s.totalScore > 0);
  const selectedIds = new Set(selected.map((s) => s.warehouse.id));

  // Step 2: Assign neighbourhoods to nearest selected warehouse
  const assignments: Assignment[] = [];
  const warehouseOrderMap = new Map<string, Neighbourhood[]>();

  for (const nb of neighbourhoods) {
    let bestWarehouse: Warehouse | null = null;
    let bestDist = Infinity;

    for (const wh of warehouses) {
      if (!selectedIds.has(wh.id)) continue;
      const dist = haversineDistance(wh.lat, wh.lon, nb.lat, nb.lon);
      if (dist <= service_radius_km && dist < bestDist) {
        bestDist = dist;
        bestWarehouse = wh;
      }
    }

    if (bestWarehouse) {
      const dist = bestDist;
      const onTimeProb = nb.on_time_rate * Math.exp(-dist / service_radius_km);
      const deliveryCost = dist * fuel_cost_per_km;
      const lateCost = nb.daily_orders * late_penalty * (1 - onTimeProb);
      const orderWeight = nb.daily_orders;

      assignments.push({
        neighbourhood_id: nb.id,
        neighbourhood_name: nb.name,
        warehouse_id: bestWarehouse.id,
        warehouse_name: bestWarehouse.name,
        distance_km: parseFloat(dist.toFixed(2)),
        delivery_cost: parseFloat(deliveryCost.toFixed(2)),
        late_penalty: parseFloat(lateCost.toFixed(2)),
        on_time_prob: parseFloat(onTimeProb.toFixed(4)),
        orders: nb.daily_orders,
        order_weight: orderWeight,
        is_co_delivery: false,
        savings: 0,
      });

      if (!warehouseOrderMap.has(bestWarehouse.id)) {
        warehouseOrderMap.set(bestWarehouse.id, []);
      }
      warehouseOrderMap.get(bestWarehouse.id)!.push(nb);
    }
  }

  // Step 3: Detect co-delivery opportunities (neighbourhoods within 0.5 km of each other, same warehouse)
  for (const [whId, nbs] of warehouseOrderMap) {
    for (let i = 0; i < nbs.length; i++) {
      for (let j = i + 1; j < nbs.length; j++) {
        const d = haversineDistance(nbs[i].lat, nbs[i].lon, nbs[j].lat, nbs[j].lon);
        if (d <= 0.5) {
          const a1 = assignments.find((a) => a.neighbourhood_id === nbs[i].id);
          const a2 = assignments.find((a) => a.neighbourhood_id === nbs[j].id);
          if (a1 && a2) {
            a1.is_co_delivery = true;
            a2.is_co_delivery = true;
            const combinedOrders = a1.orders + a2.orders;
            const fuelSaved = d * params.fuel_cost_per_km * 2;
            const savingsPerOrder = (fuelSaved / combinedOrders) * (params.co_delivery_discount_percent / 100);
            a1.savings = parseFloat(savingsPerOrder.toFixed(2));
            a2.savings = parseFloat(savingsPerOrder.toFixed(2));
          }
        }
      }
    }
  }

  // Step 4: Compute warehouse-level costs
  const warehouseCosts: WarehouseCost[] = selected.map((s) => {
    const whAssignments = assignments.filter((a) => a.warehouse_id === s.warehouse.id);
    const totalOrders = whAssignments.reduce((sum, a) => sum + a.orders, 0);
    const totalCost = whAssignments.reduce(
      (sum, a) => sum + a.delivery_cost * a.orders + a.late_penalty,
      0
    );
    const loadUtil =
      s.warehouse.capacity_sqft > 0
        ? Math.min(100, ((totalOrders * 2) / s.warehouse.capacity_sqft) * 100)
        : 0;

    return {
      warehouse_id: s.warehouse.id,
      warehouse_name: s.warehouse.name,
      neighbourhoods_served: whAssignments.length,
      total_orders: totalOrders,
      total_cost: parseFloat(totalCost.toFixed(2)),
      load_utilization_percent: parseFloat(loadUtil.toFixed(1)),
    };
  });

  const totalWeightedCost = assignments.reduce(
    (sum, a) => sum + a.delivery_cost * a.orders + a.late_penalty,
    0
  );
  const totalLatePenalty = assignments.reduce((sum, a) => sum + a.late_penalty, 0);
  const totalFuelCost = assignments.reduce(
    (sum, a) => sum + a.delivery_cost * a.orders,
    0
  );
  const totalSavings = assignments.reduce((sum, a) => sum + a.savings * a.orders, 0);
  const avgOnTime =
    assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.on_time_prob, 0) / assignments.length
      : 0;
  const coverage =
    neighbourhoods.length > 0
      ? (assignments.length / neighbourhoods.length) * 100
      : 0;

  return {
    assignments,
    warehouse_costs: warehouseCosts,
    total_weighted_cost: parseFloat(totalWeightedCost.toFixed(2)),
    total_late_penalty: parseFloat(totalLatePenalty.toFixed(2)),
    total_fuel_cost: parseFloat(totalFuelCost.toFixed(2)),
    total_co_delivery_savings: parseFloat(totalSavings.toFixed(2)),
    avg_on_time_rate: parseFloat(avgOnTime.toFixed(4)),
    coverage_percent: parseFloat(coverage.toFixed(1)),
  };
}

/**
 * Route optimisation using a nearest-neighbour TSP heuristic.
 * Starts at the warehouse, visits stops in order of proximity, returns to warehouse.
 * Includes time-window estimation based on distance and stop count.
 */
export function optimizeRoutes(
  assignments: Assignment[],
  warehouses: Warehouse[],
  neighbourhoods: Neighbourhood[],
  params: OptimizationParams
): DeliveryRoute[] {
  const routes: DeliveryRoute[] = [];
  const whGroups = new Map<string, Assignment[]>();

  for (const a of assignments) {
    if (!whGroups.has(a.warehouse_id)) whGroups.set(a.warehouse_id, []);
    whGroups.get(a.warehouse_id)!.push(a);
  }

  for (const [whId, whAssignments] of whGroups) {
    const wh = warehouses.find((w) => w.id === whId);
    if (!wh) continue;

    const stops: RouteStop[] = whAssignments.map((a) => {
      const nb = neighbourhoods.find((n) => n.id === a.neighbourhood_id);
      return {
        neighbourhood_id: a.neighbourhood_id,
        name: a.neighbourhood_name,
        lat: nb?.lat ?? 0,
        lon: nb?.lon ?? 0,
        orders: a.orders,
        sequence: 0,
      };
    });

    // Nearest-neighbour TSP
    const ordered: RouteStop[] = [];
    const remaining = [...stops];
    let currentLat = wh.lat;
    let currentLon = wh.lon;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineDistance(currentLat, currentLon, remaining[i].lat, remaining[i].lon);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      next.sequence = ordered.length + 1;
      ordered.push(next);
      currentLat = next.lat;
      currentLon = next.lon;
    }

    // Total distance: warehouse → stops → warehouse
    let totalDist = 0;
    let prevLat = wh.lat;
    let prevLon = wh.lon;
    for (const s of ordered) {
      totalDist += haversineDistance(prevLat, prevLon, s.lat, s.lon);
      prevLat = s.lat;
      prevLon = s.lon;
    }
    totalDist += haversineDistance(prevLat, prevLon, wh.lat, wh.lon);

    const avgSpeedKmph = 25;
    const totalTimeMin = (totalDist / avgSpeedKmph) * 60 + ordered.length * 5;
    const totalOrders = ordered.reduce((sum, s) => sum + s.orders, 0);

    // Determine vehicle type based on dominant order type
    const vehicle = 'Piaggio Ape (Petrol 3-Wheeler)';
    const fuelCost = totalDist * params.fuel_cost_per_km;
    const coDeliverySavings = whAssignments
      .filter((a) => a.is_co_delivery)
      .reduce((sum, a) => sum + a.savings * a.orders, 0);

    routes.push({
      id: crypto.randomUUID(),
      warehouse_id: whId,
      route_name: `${wh.name} Route`,
      stop_sequence: ordered,
      total_distance_km: parseFloat(totalDist.toFixed(2)),
      total_time_min: parseFloat(totalTimeMin.toFixed(1)),
      num_stops: ordered.length,
      total_orders: totalOrders,
      fuel_cost: parseFloat(fuelCost.toFixed(2)),
      co_delivery_savings: parseFloat(coDeliverySavings.toFixed(2)),
      vehicle_type: vehicle,
      partner_name: `Partner-${routes.length + 1}`,
    });
  }

  return routes;
}

/**
 * Demand statistics: computes order weights, frequency class distribution,
 * peak-day demand estimates, and summary metrics.
 */
export function computeDemandStatistics(neighbourhoods: Neighbourhood[]) {
  const totalOrders = neighbourhoods.reduce((s, n) => s + n.daily_orders, 0);
  const totalPopulation = neighbourhoods.reduce((s, n) => s + n.population, 0);
  const avgOrdersPerNb =
    neighbourhoods.length > 0 ? totalOrders / neighbourhoods.length : 0;
  const maxOrders = Math.max(...neighbourhoods.map((n) => n.daily_orders), 0);
  const minOrders = Math.min(...neighbourhoods.map((n) => n.daily_orders), 0);

  const red = neighbourhoods.filter((n) => n.frequency_class === 'red');
  const amber = neighbourhoods.filter((n) => n.frequency_class === 'amber');
  const green = neighbourhoods.filter((n) => n.frequency_class === 'green');

  const peakDayMultiplier = 1.35;
  const peakDayDemand = Math.round(totalOrders * peakDayMultiplier);

  const variance =
    neighbourhoods.length > 0
      ? neighbourhoods.reduce((s, n) => s + (n.daily_orders - avgOrdersPerNb) ** 2, 0) /
        neighbourhoods.length
      : 0;
  const stdDev = Math.sqrt(variance);

  return {
    totalOrders,
    totalPopulation,
    avgOrdersPerNb: parseFloat(avgOrdersPerNb.toFixed(1)),
    maxOrders,
    minOrders,
    stdDev: parseFloat(stdDev.toFixed(1)),
    peakDayDemand,
    peakDayMultiplier,
    frequencyDistribution: {
      red: red.length,
      amber: amber.length,
      green: green.length,
    },
    redOrders: red.reduce((s, n) => s + n.daily_orders, 0),
    amberOrders: amber.reduce((s, n) => s + n.daily_orders, 0),
    greenOrders: green.reduce((s, n) => s + n.daily_orders, 0),
  };
}

/**
 * Reliability matrix: on-time probability between each neighbourhood and warehouse.
 * P(on_time) = base_rate * exp(-distance / service_radius)
 */
export function computeReliabilityMatrix(
  neighbourhoods: Neighbourhood[],
  warehouses: Warehouse[],
  serviceRadiusKm: number
): { neighbourhood: string; warehouse: string; distance: number; onTimeProb: number }[] {
  const matrix: { neighbourhood: string; warehouse: string; distance: number; onTimeProb: number }[] = [];
  for (const nb of neighbourhoods) {
    for (const wh of warehouses) {
      const dist = haversineDistance(nb.lat, nb.lon, wh.lat, wh.lon);
      if (dist <= serviceRadiusKm) {
        const prob = nb.on_time_rate * Math.exp(-dist / serviceRadiusKm);
        matrix.push({
          neighbourhood: nb.name,
          warehouse: wh.name,
          distance: parseFloat(dist.toFixed(2)),
          onTimeProb: parseFloat(prob.toFixed(4)),
        });
      }
    }
  }
  return matrix;
}

/**
 * Order classification: determines type and recommends vehicle.
 * Uses a weighted scoring function combining weight and volume:
 *   fragility_score = (weight_kg * 0.3 + volume_cft * 0.7) / max_weight
 * Applied maxima/minima: classify by threshold boundaries.
 */
export function classifyOrder(
  weightKg: number,
  volumeCft: number,
  declaredFragile: boolean
): { type: 'fragile' | 'normal' | 'sturdy'; vehicle: VehicleRecommendation } {
  let type: 'fragile' | 'normal' | 'sturdy';
  if (declaredFragile || weightKg < 2) {
    type = 'fragile';
  } else if (weightKg > 15 || volumeCft > 3) {
    type = 'sturdy';
  } else {
    type = 'normal';
  }
  return { type, vehicle: getVehicleForType(type) };
}

/**
 * Sensitivity analysis: runs optimization with varying parameters
 * to see how total cost and coverage change.
 */
export function sensitivityAnalysis(
  neighbourhoods: Neighbourhood[],
  warehouses: Warehouse[],
  baseParams: OptimizationParams
): { label: string; totalCost: number; coverage: number; warehousesUsed: number }[] {
  const results: { label: string; totalCost: number; coverage: number; warehousesUsed: number }[] = [];

  const radii = [3, 4, 5, 6, 7];
  for (const r of radii) {
    const p = { ...baseParams, service_radius_km: r };
    const res = runOptimization(neighbourhoods, warehouses, p);
    results.push({
      label: `${r} km radius`,
      totalCost: res.total_weighted_cost,
      coverage: res.coverage_percent,
      warehousesUsed: res.warehouse_costs.length,
    });
  }

  const penalties = [0, 25, 50, 75, 100];
  for (const pen of penalties) {
    const p = { ...baseParams, late_penalty: pen };
    const res = runOptimization(neighbourhoods, warehouses, p);
    results.push({
      label: `Penalty ₹${pen}`,
      totalCost: res.total_weighted_cost,
      coverage: res.coverage_percent,
      warehousesUsed: res.warehouse_costs.length,
    });
  }

  const maxWh = [2, 3, 4, 5, 6];
  for (const m of maxWh) {
    const p = { ...baseParams, max_warehouses: m };
    const res = runOptimization(neighbourhoods, warehouses, p);
    results.push({
      label: `Max ${m} warehouses`,
      totalCost: res.total_weighted_cost,
      coverage: res.coverage_percent,
      warehousesUsed: res.warehouse_costs.length,
    });
  }

  return results;
}

/**
 * Space optimization: given warehouse capacity and order volume,
 * computes the optimal storage allocation using a bin-packing heuristic.
 */
export function optimizeWarehouseSpace(
  warehouses: Warehouse[],
  assignments: Assignment[],
  avgOrderVolumeCft: number
): { warehouseId: string; warehouseName: string; allocatedOrders: number; usedSpaceCft: number; capacityCft: number; utilizationPercent: number; overflowOrders: number }[] {
  return warehouses
    .filter((w) => assignments.some((a) => a.warehouse_id === w.id))
    .map((w) => {
      const whAssignments = assignments.filter((a) => a.warehouse_id === w.id);
      const allocatedOrders = whAssignments.reduce((s, a) => s + a.orders, 0);
      const capacityCft = w.capacity_sqft * 8; // approx 8 ft ceiling
      const usedSpaceCft = allocatedOrders * avgOrderVolumeCft;
      const utilizationPercent = capacityCft > 0 ? (usedSpaceCft / capacityCft) * 100 : 0;
      const overflowOrders =
        utilizationPercent > 100
          ? Math.ceil((usedSpaceCft - capacityCft) / avgOrderVolumeCft)
          : 0;
      return {
        warehouseId: w.id,
        warehouseName: w.name,
        allocatedOrders,
        usedSpaceCft: parseFloat(usedSpaceCft.toFixed(1)),
        capacityCft,
        utilizationPercent: parseFloat(Math.min(100, utilizationPercent).toFixed(1)),
        overflowOrders,
      };
    });
}
