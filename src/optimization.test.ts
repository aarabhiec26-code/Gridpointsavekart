import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  classifyFrequency,
  classifyOrder,
  runOptimization,
  optimizeRoutes,
  computeDemandStatistics,
  defaultParams,
  vehicleRecommendations,
} from './optimization'
import type { Neighbourhood, Warehouse } from './types'

const mockNeighbourhoods: Neighbourhood[] = [
  { id: 'n1', name: 'Area A', lat: 15.35, lon: 75.10, population: 30000, daily_orders: 250, frequency_class: 'red', on_time_rate: 0.85, is_custom: false },
  { id: 'n2', name: 'Area B', lat: 15.36, lon: 75.12, population: 20000, daily_orders: 130, frequency_class: 'amber', on_time_rate: 0.88, is_custom: false },
  { id: 'n3', name: 'Area C', lat: 15.40, lon: 75.15, population: 15000, daily_orders: 80, frequency_class: 'green', on_time_rate: 0.92, is_custom: false },
]

const mockWarehouses: Warehouse[] = [
  { id: 'w1', name: 'WH Alpha', lat: 15.355, lon: 75.11, capacity_sqft: 10000, current_load_sqft: 5000, is_active: true, is_optimal: false, area_type: 'commercial' },
  { id: 'w2', name: 'WH Beta', lat: 15.395, lon: 75.14, capacity_sqft: 8000, current_load_sqft: 3000, is_active: true, is_optimal: false, area_type: 'industrial' },
]

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(15.0, 75.0, 15.0, 75.0)).toBe(0)
  })

  it('calculates positive distance for different points', () => {
    const d = haversineDistance(15.35, 75.10, 15.40, 75.15)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(20) // should be under 20km for these coords
  })
})

describe('classifyFrequency', () => {
  it('classifies as red for >= 200 orders', () => {
    expect(classifyFrequency(200)).toBe('red')
    expect(classifyFrequency(300)).toBe('red')
  })

  it('classifies as amber for 120-199', () => {
    expect(classifyFrequency(120)).toBe('amber')
    expect(classifyFrequency(199)).toBe('amber')
  })

  it('classifies as green for < 120', () => {
    expect(classifyFrequency(50)).toBe('green')
    expect(classifyFrequency(119)).toBe('green')
  })
})

describe('classifyOrder', () => {
  it('classifies fragile when declared', () => {
    const result = classifyOrder(5, 2, true)
    expect(result.type).toBe('fragile')
    expect(result.vehicle.order_type).toBe('fragile')
  })

  it('classifies fragile for very light items', () => {
    const result = classifyOrder(1.5, 0.5, false)
    expect(result.type).toBe('fragile')
  })

  it('classifies sturdy for heavy items', () => {
    const result = classifyOrder(20, 4, false)
    expect(result.type).toBe('sturdy')
  })

  it('classifies normal for medium items', () => {
    const result = classifyOrder(5, 1.5, false)
    expect(result.type).toBe('normal')
  })
})

describe('runOptimization', () => {
  it('assigns all neighbourhoods within radius', () => {
    const params = defaultParams()
    const results = runOptimization(mockNeighbourhoods, mockWarehouses, params)
    expect(results.assignments.length).toBeGreaterThan(0)
    for (const a of results.assignments) {
      expect(a.distance_km).toBeLessThanOrEqual(params.service_radius_km)
    }
  })

  it('computes positive total cost', () => {
    const results = runOptimization(mockNeighbourhoods, mockWarehouses, defaultParams())
    expect(results.total_weighted_cost).toBeGreaterThan(0)
  })

  it('produces coverage <= 100', () => {
    const results = runOptimization(mockNeighbourhoods, mockWarehouses, defaultParams())
    expect(results.coverage_percent).toBeLessThanOrEqual(100)
  })
})

describe('optimizeRoutes', () => {
  it('generates routes for assigned warehouses', () => {
    const params = defaultParams()
    const results = runOptimization(mockNeighbourhoods, mockWarehouses, params)
    const routes = optimizeRoutes(results.assignments, mockWarehouses, mockNeighbourhoods, params)
    expect(routes.length).toBeGreaterThan(0)
    for (const r of routes) {
      expect(r.num_stops).toBeGreaterThan(0)
      expect(r.total_distance_km).toBeGreaterThan(0)
    }
  })
})

describe('computeDemandStatistics', () => {
  it('computes correct totals', () => {
    const stats = computeDemandStatistics(mockNeighbourhoods)
    expect(stats.totalOrders).toBe(460)
    expect(stats.totalPopulation).toBe(65000)
    expect(stats.frequencyDistribution.red).toBe(1)
    expect(stats.frequencyDistribution.amber).toBe(1)
    expect(stats.frequencyDistribution.green).toBe(1)
  })

  it('calculates peak day demand', () => {
    const stats = computeDemandStatistics(mockNeighbourhoods)
    expect(stats.peakDayDemand).toBe(Math.round(460 * 1.35))
  })
})

describe('vehicleRecommendations', () => {
  it('returns all three types', () => {
    const recs = vehicleRecommendations()
    expect(recs.length).toBe(3)
    const types = recs.map(r => r.order_type)
    expect(types).toContain('fragile')
    expect(types).toContain('normal')
    expect(types).toContain('sturdy')
  })
})
