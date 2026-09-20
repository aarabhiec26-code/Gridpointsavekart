import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import MapView from './MapView';
import type {
  Neighbourhood,
  Warehouse,
  Order,
  PetrolPump,
  OptimizationParams,
  OptimizationResults,
  Assignment,
  DeliveryRoute,
  OptimizationRun,
} from './types';
import {
  fetchNeighbourhoods,
  fetchWarehouses,
  fetchOrders,
  fetchPetrolPumps,
  fetchOptimizationRuns,
  fetchRoutes,
  addNeighbourhood,
  addOrder,
  updateOrder,
  deleteNeighbourhood,
  deleteOrder,
  bulkInsertNeighbourhoods,
  saveOptimizationRun,
  saveRoutes,
  updateWarehouseOptimal,
} from './api';
import {
  runOptimization,
  optimizeRoutes,
  computeDemandStatistics,
  computeReliabilityMatrix,
  classifyOrder,
  vehicleRecommendations,
  sensitivityAnalysis,
  optimizeWarehouseSpace,
  defaultParams,
  haversineDistance,
  classifyFrequency,
} from './optimization';

type Tab = 'dashboard' | 'map' | 'data' | 'optimize' | 'routes' | 'orders' | 'analytics' | 'innovate';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [neighbourhoods, setNeighbourhoods] = useState<Neighbourhood[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [petrolPumps, setPetrolPumps] = useState<PetrolPump[]>([]);
  const [pastRuns, setPastRuns] = useState<OptimizationRun[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [params, setParams] = useState<OptimizationParams>(defaultParams());
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults | null>(null);
  const [optimizedRoutes, setOptimizedRoutes] = useState<DeliveryRoute[]>([]);
  const [showOptimized, setShowOptimized] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nbs, whs, ords, pps, runs, rts] = await Promise.all([
        fetchNeighbourhoods(),
        fetchWarehouses(),
        fetchOrders(),
        fetchPetrolPumps(),
        fetchOptimizationRuns(),
        fetchRoutes(),
      ]);
      setNeighbourhoods(nbs);
      setWarehouses(whs);
      setOrders(ords);
      setPetrolPumps(pps);
      setPastRuns(runs);
      setSavedRoutes(rts);
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    clearMessages();
    try {
      const results = runOptimization(neighbourhoods, warehouses, params);
      const routes = optimizeRoutes(results.assignments, warehouses, neighbourhoods, params);
      setOptimizationResults(results);
      setOptimizedRoutes(routes);
      setShowOptimized(true);

      const optimalIds = results.warehouse_costs.map((w) => w.warehouse_id);
      await updateWarehouseOptimal(optimalIds);
      await saveOptimizationRun(`Run ${new Date().toLocaleString()}`, params, results);
      await saveRoutes(routes);
      await loadData();
      setSuccess(
        `Optimization complete: ${results.warehouse_costs.length} warehouses selected, ${results.assignments.length} neighbourhoods served, total cost ₹${results.total_weighted_cost.toLocaleString()}`
      );
    } catch (e: any) {
      setError(`Optimization failed: ${e.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  const stats = computeDemandStatistics(neighbourhoods);
  const reliability = optimizationResults
    ? null
    : computeReliabilityMatrix(neighbourhoods, warehouses, params.service_radius_km);

  if (loading) {
    return (
      <div className="app">
        <div className="header">
          <h1>SAVeKART</h1>
        </div>
        <div className="loading">Loading Hubli-Dharwad city data...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>SAVeKART</h1>
          <div className="subtitle">Warehouse Location Optimization Platform</div>
        </div>
        <div className="header-right">
          <span className="city-badge">Hubli-Dharwad, Karnataka</span>
        </div>
      </div>

      <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid var(--neutral-200)' }}>
        <div className="tabs">
          {([
            ['dashboard', 'Dashboard'],
            ['map', 'Map View'],
            ['data', 'Data Upload'],
            ['optimize', 'Optimization Solver'],
            ['routes', 'Route Planner'],
            ['orders', 'Order Tracking'],
            ['analytics', 'Analytics & Sensitivity'],
            ['innovate', 'Innovate'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`tab ${tab === key ? 'active' : ''}`}
              onClick={() => { setTab(key); clearMessages(); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="main-content">
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        {tab === 'dashboard' && (
          <DashboardView
            stats={stats}
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
            orders={orders}
            optimizationResults={optimizationResults}
            pastRuns={pastRuns}
            onOptimize={handleOptimize}
            optimizing={optimizing}
          />
        )}

        {tab === 'map' && (
          <MapViewTab
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
            petrolPumps={petrolPumps}
            assignments={optimizationResults?.assignments}
            routes={optimizedRoutes}
            showOptimized={showOptimized}
            selectedWarehouseId={selectedWarehouseId}
            onSelectWarehouse={setSelectedWarehouseId}
            onToggleOptimized={() => setShowOptimized(!showOptimized)}
          />
        )}

        {tab === 'data' && (
          <DataTab
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
            onAddNeighbourhood={async (nb) => {
              try {
                await addNeighbourhood(nb);
                await loadData();
                setSuccess(`Added neighbourhood: ${nb.name}`);
              } catch (e: any) { setError(e.message); }
            }}
            onDeleteNeighbourhood={async (id) => {
              try {
                await deleteNeighbourhood(id);
                await loadData();
                setSuccess('Neighbourhood deleted');
              } catch (e: any) { setError(e.message); }
            }}
            onBulkUpload={async (rows) => {
              try {
                const count = await bulkInsertNeighbourhoods(rows);
                await loadData();
                setSuccess(`Uploaded ${count} neighbourhoods from CSV`);
              } catch (e: any) { setError(e.message); }
            }}
          />
        )}

        {tab === 'optimize' && (
          <OptimizeTab
            params={params}
            setParams={setParams}
            onOptimize={handleOptimize}
            optimizing={optimizing}
            results={optimizationResults}
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
          />
        )}

        {tab === 'routes' && (
          <RoutesTab
            routes={optimizedRoutes.length > 0 ? optimizedRoutes : savedRoutes}
            warehouses={warehouses}
            petrolPumps={petrolPumps}
            neighbourhoods={neighbourhoods}
          />
        )}

        {tab === 'orders' && (
          <OrdersTab
            orders={orders}
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
            onAddOrder={async (order) => {
              try {
                await addOrder(order);
                await loadData();
                setSuccess(`Order ${order.order_ref} created`);
              } catch (e: any) { setError(e.message); }
            }}
            onUpdateOrder={async (id, updates) => {
              try {
                await updateOrder(id, updates);
                await loadData();
                setSuccess('Order updated');
              } catch (e: any) { setError(e.message); }
            }}
            onDeleteOrder={async (id) => {
              try {
                await deleteOrder(id);
                await loadData();
                setSuccess('Order deleted');
              } catch (e: any) { setError(e.message); }
            }}
          />
        )}

        {tab === 'analytics' && (
          <AnalyticsTab
            neighbourhoods={neighbourhoods}
            warehouses={warehouses}
            params={params}
            optimizationResults={optimizationResults}
          />
        )}

        {tab === 'innovate' && <InnovateTab />}
      </div>
    </div>
  );
}

// ==================== Dashboard ====================
function DashboardView({
  stats,
  neighbourhoods,
  warehouses,
  orders,
  optimizationResults,
  pastRuns,
  onOptimize,
  optimizing,
}: {
  stats: ReturnType<typeof computeDemandStatistics>;
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  orders: Order[];
  optimizationResults: OptimizationResults | null;
  pastRuns: OptimizationRun[];
  onOptimize: () => void;
  optimizing: boolean;
}) {
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Neighbourhoods</div>
          <div className="stat-value">{neighbourhoods.length}</div>
          <div className="stat-sub">{stats.totalPopulation.toLocaleString()} population</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Daily Orders</div>
          <div className="stat-value">{stats.totalOrders.toLocaleString()}</div>
          <div className="stat-sub">Peak day: {stats.peakDayDemand.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Warehouse Candidates</div>
          <div className="stat-value">{warehouses.length}</div>
          <div className="stat-sub">{warehouses.filter(w => w.is_optimal).length} currently optimal</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tracked Orders</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-sub">{orders.filter(o => o.status === 'delivered').length} delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Red Zone Areas</div>
          <div className="stat-value" style={{ color: 'var(--error-500)' }}>{stats.frequencyDistribution.red}</div>
          <div className="stat-sub">{stats.redOrders} daily orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Optimization Runs</div>
          <div className="stat-value">{pastRuns.length}</div>
          <div className="stat-sub">Last: {pastRuns[0]?.created_at ? new Date(pastRuns[0].created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>

      {optimizationResults && (
        <div className="card mb-20">
          <div className="card-title">Latest Optimization Summary</div>
          <div className="grid-4">
            <div>
              <div className="stat-label">Total Weighted Cost</div>
              <div className="stat-value">₹{optimizationResults.total_weighted_cost.toLocaleString()}</div>
            </div>
            <div>
              <div className="stat-label">Coverage</div>
              <div className="stat-value">{optimizationResults.coverage_percent}%</div>
            </div>
            <div>
              <div className="stat-label">Avg On-Time Probability</div>
              <div className="stat-value">{(optimizationResults.avg_on_time_rate * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="stat-label">Co-Delivery Savings</div>
              <div className="stat-value" style={{ color: 'var(--secondary-600)' }}>₹{optimizationResults.total_co_delivery_savings.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Demand Distribution by Frequency Class</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <FrequencyBar label="Red (High Frequency)" count={stats.frequencyDistribution.red} orders={stats.redOrders} color="var(--error-500)" max={stats.totalOrders} />
            <FrequencyBar label="Amber (Medium)" count={stats.frequencyDistribution.amber} orders={stats.amberOrders} color="var(--accent-500)" max={stats.totalOrders} />
            <FrequencyBar label="Green (Low)" count={stats.frequencyDistribution.green} orders={stats.greenOrders} color="var(--secondary-500)" max={stats.totalOrders} />
          </div>
          <div className="mt-20">
            <div className="stat-label">Average Orders per Neighbourhood</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.avgOrdersPerNb} <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>±{stats.stdDev}</span></div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Quick Actions</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '14px' }}>
            Run the optimization solver to determine optimal warehouse locations and neighbourhood assignments for Hubli-Dharwad.
          </p>
          <button className="btn btn-primary" onClick={onOptimize} disabled={optimizing}>
            {optimizing ? 'Optimizing...' : 'Run Optimization'}
          </button>
          <div className="mt-20">
            <div className="stat-label">Top 5 High-Demand Neighbourhoods</div>
            <div className="scrollable-table mt-20" style={{ maxHeight: '200px' }}>
              <table>
                <thead>
                  <tr><th>Name</th><th>Orders</th><th>Class</th></tr>
                </thead>
                <tbody>
                  {neighbourhoods.slice(0, 5).map(nb => (
                    <tr key={nb.id}>
                      <td>{nb.name}</td>
                      <td>{nb.daily_orders}</td>
                      <td><span className={`badge badge-${nb.frequency_class}`}>{nb.frequency_class}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrequencyBar({ label, count, orders, color, max }: { label: string; count: number; orders: number; color: string; max: number }) {
  const pct = max > 0 ? (orders / max) * 100 : 0;
  return (
    <div style={{ flex: '1 1 140px' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>{count} areas, {orders} orders</div>
      <div className="progress-bar mt-20" style={{ marginTop: '6px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ==================== Map View Tab ====================
function MapViewTab({
  neighbourhoods,
  warehouses,
  petrolPumps,
  assignments,
  routes,
  showOptimized,
  selectedWarehouseId,
  onSelectWarehouse,
  onToggleOptimized,
}: {
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  petrolPumps: PetrolPump[];
  assignments?: Assignment[];
  routes: DeliveryRoute[];
  showOptimized: boolean;
  selectedWarehouseId: string | null;
  onSelectWarehouse: (id: string | null) => void;
  onToggleOptimized: () => void;
}) {
  return (
    <div>
      <div className="flex-between">
        <div>
          <div className="section-title">City Map — Hubli-Dharwad</div>
          <div className="section-desc">Visualize neighbourhoods, warehouses, petrol pumps, and optimized assignments</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>Show Optimized</span>
          <div className={`toggle ${showOptimized ? 'active' : ''}`} onClick={onToggleOptimized}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      <div className="legend mb-20">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--error-500)' }} /> Red Zone (≥200 orders/day)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-500)' }} /> Amber Zone (120-199)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--secondary-500)' }} /> Green Zone (&lt;120)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--primary-600)', borderRadius: '4px' }} /> Warehouse</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--secondary-600)', borderRadius: '4px' }} /> Optimal Warehouse</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-600)', borderRadius: '4px' }} /> Petrol Pump</div>
        <div className="legend-item"><div className="legend-line" style={{ background: 'var(--secondary-500)' }} /> Co-delivery link</div>
        <div className="legend-item"><div className="legend-line" style={{ background: 'var(--primary-500)' }} /> Route</div>
      </div>

      <MapView
        neighbourhoods={neighbourhoods}
        warehouses={warehouses}
        petrolPumps={petrolPumps}
        assignments={assignments}
        routes={routes}
        showOptimized={showOptimized}
        selectedWarehouseId={selectedWarehouseId}
        center={[15.39, 75.08]}
        zoom={12}
      />

      <div className="grid-2 mt-20">
        <div className="card">
          <div className="card-title">Warehouse Filter</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '10px' }}>Click a warehouse to highlight its service area on the map.</p>
          <div className="scrollable-table" style={{ maxHeight: '200px' }}>
            <table>
              <thead><tr><th>Name</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {warehouses.map(wh => (
                  <tr key={wh.id}>
                    <td>{wh.name}</td>
                    <td>{wh.is_optimal ? <span className="badge badge-green">Optimal</span> : <span className="badge badge-blue">Candidate</span>}</td>
                    <td><button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => onSelectWarehouse(selectedWarehouseId === wh.id ? null : wh.id)}>{selectedWarehouseId === wh.id ? 'Selected' : 'Select'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Map Statistics</div>
          <div className="grid-2">
            <div><div className="stat-label">Total Markers</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{neighbourhoods.length + warehouses.length + petrolPumps.length}</div></div>
            <div><div className="stat-label">5km Coverage</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{showOptimized && assignments ? `${assignments.length}/${neighbourhoods.length}` : 'Run optimization'}</div></div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginTop: '10px' }}>
            Circle size represents daily order volume. Click any marker for detailed information.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== Data Upload Tab ====================
function DataTab({
  neighbourhoods,
  warehouses,
  onAddNeighbourhood,
  onDeleteNeighbourhood,
  onBulkUpload,
}: {
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  onAddNeighbourhood: (nb: Omit<Neighbourhood, 'id' | 'created_at'>) => void;
  onDeleteNeighbourhood: (id: string) => void;
  onBulkUpload: (rows: { name: string; lat: number; lon: number; daily_orders: number }[]) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNb, setNewNb] = useState({ name: '', lat: 15.35, lon: 75.1, population: 0, daily_orders: 50 });

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const rows = results.data
          .filter((r: any) => r.name && r.lat && r.lon && r.daily_orders)
          .map((r: any) => ({
            name: String(r.name),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            daily_orders: parseInt(r.daily_orders) || 0,
          }))
          .filter((r) => !isNaN(r.lat) && !isNaN(r.lon));
        if (rows.length === 0) {
          alert('No valid rows found. CSV needs columns: name, lat, lon, daily_orders');
          return;
        }
        onBulkUpload(rows);
      },
      error: (err) => alert(`CSV parse error: ${err.message}`),
    });
  };

  const downloadTemplate = () => {
    const csv = 'name,lat,lon,daily_orders\nKeshwapur,15.3470,75.1370,280\nVidyanagar,15.3610,75.1480,240\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'savekart_neighbourhood_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="section-title">Data Upload & Validation</div>
      <div className="section-desc">Upload neighbourhood data via CSV (name, lat, lon, daily_orders) or add entries manually</div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">CSV Upload</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '14px' }}>
            Your CSV needs only 4 columns: <b>name</b>, <b>lat</b>, <b>lon</b>, <b>daily_orders</b>. The platform automatically classifies frequency and computes reliability.
          </p>
          <label className="file-upload" style={{ display: 'block' }}>
            <div className="file-upload-icon">&#128193;</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Click to upload CSV file</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginTop: '4px' }}>Supported format: .csv with headers</div>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </label>
          <button className="btn btn-secondary mt-20" onClick={downloadTemplate}>Download CSV Template</button>
        </div>

        <div className="card">
          <div className="card-title">Add Neighbourhood Manually</div>
          {!showAddForm ? (
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ Add Neighbourhood</button>
          ) : (
            <div>
              <div className="form-group">
                <label className="label">Name</label>
                <input className="input" value={newNb.name} onChange={(e) => setNewNb({ ...newNb, name: e.target.value })} placeholder="e.g. Keshwapur" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Latitude</label>
                  <input className="input" type="number" step="0.0001" value={newNb.lat} onChange={(e) => setNewNb({ ...newNb, lat: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="label">Longitude</label>
                  <input className="input" type="number" step="0.0001" value={newNb.lon} onChange={(e) => setNewNb({ ...newNb, lon: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Population</label>
                  <input className="input" type="number" value={newNb.population} onChange={(e) => setNewNb({ ...newNb, population: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="label">Daily Orders</label>
                  <input className="input" type="number" value={newNb.daily_orders} onChange={(e) => setNewNb({ ...newNb, daily_orders: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => {
                  if (!newNb.name) return;
                  onAddNeighbourhood({
                    ...newNb,
                    frequency_class: classifyFrequency(newNb.daily_orders),
                    on_time_rate: 0.88,
                    is_custom: true,
                  });
                  setShowAddForm(false);
                  setNewNb({ name: '', lat: 15.35, lon: 75.1, population: 0, daily_orders: 50 });
                }}>Save</button>
                <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-20">
        <div className="flex-between">
          <div className="card-title">Neighbourhoods ({neighbourhoods.length})</div>
        </div>
        <div className="scrollable-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Lat</th><th>Lon</th><th>Pop.</th><th>Orders</th><th>Class</th><th>On-Time</th><th>Source</th><th></th></tr>
            </thead>
            <tbody>
              {neighbourhoods.map(nb => (
                <tr key={nb.id}>
                  <td>{nb.name}</td>
                  <td>{nb.lat.toFixed(4)}</td>
                  <td>{nb.lon.toFixed(4)}</td>
                  <td>{nb.population.toLocaleString()}</td>
                  <td>{nb.daily_orders}</td>
                  <td><span className={`badge badge-${nb.frequency_class}`}>{nb.frequency_class}</span></td>
                  <td>{(nb.on_time_rate * 100).toFixed(0)}%</td>
                  <td>{nb.is_custom ? <span className="badge badge-blue">Custom</span> : <span className="badge badge-green">Pre-loaded</span>}</td>
                  <td>{nb.is_custom && <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => onDeleteNeighbourhood(nb.id)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-title">Warehouses ({warehouses.length})</div>
        <div className="scrollable-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Lat</th><th>Lon</th><th>Capacity (sq ft)</th><th>Load (sq ft)</th><th>Optimal</th><th>Type</th></tr>
            </thead>
            <tbody>
              {warehouses.map(wh => (
                <tr key={wh.id}>
                  <td>{wh.name}</td>
                  <td>{wh.lat.toFixed(4)}</td>
                  <td>{wh.lon.toFixed(4)}</td>
                  <td>{wh.capacity_sqft.toLocaleString()}</td>
                  <td>{wh.current_load_sqft.toLocaleString()}</td>
                  <td>{wh.is_optimal ? <span className="badge badge-green">Yes</span> : <span className="badge badge-blue">No</span>}</td>
                  <td>{wh.area_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== Optimize Tab ====================
function OptimizeTab({
  params,
  setParams,
  onOptimize,
  optimizing,
  results,
  neighbourhoods,
  warehouses,
}: {
  params: OptimizationParams;
  setParams: (p: OptimizationParams) => void;
  onOptimize: () => void;
  optimizing: boolean;
  results: OptimizationResults | null;
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
}) {
  const spaceOpt = results
    ? optimizeWarehouseSpace(warehouses, results.assignments, 1.5)
    : [];

  return (
    <div>
      <div className="section-title">Warehouse Optimization Solver</div>
      <div className="section-desc">Configure parameters and run the linear programming optimization to minimize weighted delivery cost</div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Optimization Parameters</div>

          <div className="form-group">
            <label className="label">Max Warehouses: {params.max_warehouses}</label>
            <div className="slider-container">
              <input type="range" className="slider" min="1" max="8" value={params.max_warehouses} onChange={(e) => setParams({ ...params, max_warehouses: parseInt(e.target.value) })} />
              <span className="slider-value">{params.max_warehouses}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Service Radius (km)</label>
            <div className="slider-container">
              <input type="range" className="slider" min="2" max="10" step="0.5" value={params.service_radius_km} onChange={(e) => setParams({ ...params, service_radius_km: parseFloat(e.target.value) })} />
              <span className="slider-value">{params.service_radius_km} km</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Late Delivery Penalty (₹ per order)</label>
            <div className="slider-container">
              <input type="range" className="slider" min="0" max="200" step="5" value={params.late_penalty} onChange={(e) => setParams({ ...params, late_penalty: parseInt(e.target.value) })} />
              <span className="slider-value">₹{params.late_penalty}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Time Expectation (hours)</label>
            <div className="slider-container">
              <input type="range" className="slider" min="2" max="72" step="2" value={params.time_expectation_hours} onChange={(e) => setParams({ ...params, time_expectation_hours: parseInt(e.target.value) })} />
              <span className="slider-value">{params.time_expectation_hours}h</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Fuel Cost (₹/km)</label>
            <div className="slider-container">
              <input type="range" className="slider" min="5" max="15" step="0.5" value={params.fuel_cost_per_km} onChange={(e) => setParams({ ...params, fuel_cost_per_km: parseFloat(e.target.value) })} />
              <span className="slider-value">₹{params.fuel_cost_per_km}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Co-delivery Discount (%)</label>
            <div className="slider-container">
              <input type="range" className="slider" min="0" max="20" step="1" value={params.co_delivery_discount_percent} onChange={(e) => setParams({ ...params, co_delivery_discount_percent: parseInt(e.target.value) })} />
              <span className="slider-value">{params.co_delivery_discount_percent}%</span>
            </div>
          </div>

          <button className="btn btn-primary mt-20" onClick={onOptimize} disabled={optimizing} style={{ width: '100%' }}>
            {optimizing ? 'Running Optimization...' : 'Run Optimization Solver'}
          </button>
        </div>

        <div className="card">
          <div className="card-title">Optimization Results</div>
          {!results ? (
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', padding: '30px 0', textAlign: 'center' }}>
              Run the optimization to see results here.
            </p>
          ) : (
            <div>
              <div className="grid-2 mb-20">
                <div><div className="stat-label">Total Weighted Cost</div><div className="stat-value">₹{results.total_weighted_cost.toLocaleString()}</div></div>
                <div><div className="stat-label">Late Penalty Total</div><div className="stat-value">₹{results.total_late_penalty.toLocaleString()}</div></div>
                <div><div className="stat-label">Fuel Cost Total</div><div className="stat-value">₹{results.total_fuel_cost.toLocaleString()}</div></div>
                <div><div className="stat-label">Co-delivery Savings</div><div className="stat-value" style={{ color: 'var(--secondary-600)' }}>₹{results.total_co_delivery_savings.toLocaleString()}</div></div>
                <div><div className="stat-label">Coverage</div><div className="stat-value">{results.coverage_percent}%</div></div>
                <div><div className="stat-label">Avg On-Time Prob.</div><div className="stat-value">{(results.avg_on_time_rate * 100).toFixed(1)}%</div></div>
              </div>

              <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Selected Warehouses</h4>
              <div className="scrollable-table" style={{ maxHeight: '200px' }}>
                <table>
                  <thead><tr><th>Warehouse</th><th>Areas Served</th><th>Orders</th><th>Cost</th><th>Load %</th></tr></thead>
                  <tbody>
                    {results.warehouse_costs.map(wc => (
                      <tr key={wc.warehouse_id}>
                        <td>{wc.warehouse_name}</td>
                        <td>{wc.neighbourhoods_served}</td>
                        <td>{wc.total_orders}</td>
                        <td>₹{wc.total_cost.toLocaleString()}</td>
                        <td>{wc.load_utilization_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {results && (
        <>
          <div className="card mt-20">
            <div className="card-title">Neighbourhood-to-Warehouse Assignments</div>
            <div className="scrollable-table">
              <table>
                <thead><tr><th>Neighbourhood</th><th>Warehouse</th><th>Distance</th><th>Delivery Cost</th><th>Late Penalty</th><th>On-Time Prob.</th><th>Orders</th><th>Co-Delivery</th><th>Savings</th></tr></thead>
                <tbody>
                  {results.assignments.map(a => (
                    <tr key={a.neighbourhood_id}>
                      <td>{a.neighbourhood_name}</td>
                      <td>{a.warehouse_name}</td>
                      <td>{a.distance_km} km</td>
                      <td>₹{a.delivery_cost}</td>
                      <td>₹{a.late_penalty.toFixed(0)}</td>
                      <td>{(a.on_time_prob * 100).toFixed(1)}%</td>
                      <td>{a.orders}</td>
                      <td>{a.is_co_delivery ? <span className="badge badge-green">Yes</span> : '-'}</td>
                      <td>{a.savings > 0 ? `₹${a.savings}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title">Warehouse Space Optimization</div>
            <div className="scrollable-table">
              <table>
                <thead><tr><th>Warehouse</th><th>Allocated Orders</th><th>Used Space (cft)</th><th>Capacity (cft)</th><th>Utilization</th><th>Overflow</th></tr></thead>
                <tbody>
                  {spaceOpt.map(s => (
                    <tr key={s.warehouseId}>
                      <td>{s.warehouseName}</td>
                      <td>{s.allocatedOrders}</td>
                      <td>{s.usedSpaceCft.toLocaleString()}</td>
                      <td>{s.capacityCft.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '100px' }}>
                            <div className="progress-fill" style={{ width: `${s.utilizationPercent}%`, background: s.utilizationPercent > 80 ? 'var(--error-500)' : 'var(--primary-500)' }} />
                          </div>
                          <span>{s.utilizationPercent}%</span>
                        </div>
                      </td>
                      <td>{s.overflowOrders > 0 ? <span className="badge badge-red">{s.overflowOrders} overflow</span> : <span className="badge badge-green">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== Routes Tab ====================
function RoutesTab({
  routes,
  warehouses,
  petrolPumps,
  neighbourhoods,
}: {
  routes: DeliveryRoute[];
  warehouses: Warehouse[];
  petrolPumps: PetrolPump[];
  neighbourhoods: Neighbourhood[];
}) {
  return (
    <div>
      <div className="section-title">Route Planner — Delivery Partner Routes</div>
      <div className="section-desc">Optimized routes with nearest-neighbour TSP, time windows, fuel costs, and petrol pump indicators</div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Optimized Routes ({routes.length})</div>
          {routes.length === 0 ? (
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>Run optimization to generate routes.</p>
          ) : (
            routes.map(route => {
              const wh = warehouses.find(w => w.id === route.warehouse_id);
              return (
                <div key={route.id} className="route-card">
                  <h4>{route.route_name}</h4>
                  <div className="route-meta">
                    <span>Distance: {route.total_distance_km} km</span>
                    <span>Time: {route.total_time_min} min</span>
                    <span>Stops: {route.num_stops}</span>
                    <span>Orders: {route.total_orders}</span>
                    <span>Fuel: ₹{route.fuel_cost}</span>
                    {route.co_delivery_savings > 0 && <span style={{ color: 'var(--secondary-600)', fontWeight: 600 }}>Savings: ₹{route.co_delivery_savings}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '4px' }}>Vehicle: {route.vehicle_type} | Partner: {route.partner_name}</div>
                  <div className="route-stops">
                    <span className="route-stop-chip" style={{ background: 'var(--primary-100)', borderColor: 'var(--primary-300)' }}>{wh?.name ?? 'Warehouse'}</span>
                    {route.stop_sequence.map((stop, i) => (
                      <span key={stop.neighbourhood_id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="route-arrow">→</span>
                        <span className="route-stop-chip">{stop.sequence}. {stop.name} ({stop.orders})</span>
                      </span>
                    ))}
                    <span className="route-arrow">→</span>
                    <span className="route-stop-chip" style={{ background: 'var(--primary-100)', borderColor: 'var(--primary-300)' }}>Return</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="card">
          <div className="card-title">Petrol Pumps Along Routes</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '12px' }}>
            {petrolPumps.length} petrol pumps mapped across Hubli-Dharwad for refueling stops during delivery routes.
          </p>
          <div className="scrollable-table">
            <table>
              <thead><tr><th>Pump</th><th>Brand</th><th>Location</th></tr></thead>
              <tbody>
                {petrolPumps.map(pp => (
                  <tr key={pp.id}>
                    <td>{pp.name}</td>
                    <td><span className="badge badge-amber">{pp.brand}</span></td>
                    <td>{pp.lat.toFixed(4)}, {pp.lon.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-20">
            <div className="card-title">Vehicle Recommendations by Order Type</div>
            {vehicleRecommendations().map(vr => (
              <div key={vr.order_type} className="route-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className={`badge badge-${vr.order_type === 'fragile' ? 'red' : vr.order_type === 'sturdy' ? 'amber' : 'green'}`}>{vr.order_type}</span>
                  <strong style={{ fontSize: '0.85rem' }}>{vr.vehicle}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)' }}>{vr.reason}</div>
                <div className="route-meta mt-20" style={{ marginTop: '6px' }}>
                  <span>Capacity: {vr.load_capacity_kg} kg</span>
                  <span>Cost: ₹{vr.cost_per_km}/km</span>
                  {vr.fuel_efficiency_km_per_l > 0 && <span>Efficiency: {vr.fuel_efficiency_km_per_l} km/L</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Orders Tab ====================
function OrdersTab({
  orders,
  neighbourhoods,
  warehouses,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
}: {
  orders: Order[];
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  onAddOrder: (order: Partial<Order>) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onDeleteOrder: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_ref: '',
    neighbourhood_id: '',
    warehouse_id: '',
    order_type: 'normal' as 'fragile' | 'normal' | 'sturdy',
    weight_kg: 1.0,
    volume_cft: 1.0,
    delivery_address: '',
    declared_fragile: false,
  });

  const handleSubmit = () => {
    if (!newOrder.order_ref || !newOrder.neighbourhood_id) return;
    const classification = classifyOrder(newOrder.weight_kg, newOrder.volume_cft, newOrder.declared_fragile);
    onAddOrder({
      order_ref: newOrder.order_ref,
      neighbourhood_id: newOrder.neighbourhood_id,
      warehouse_id: newOrder.warehouse_id || null,
      order_type: classification.type,
      status: 'pending',
      weight_kg: newOrder.weight_kg,
      volume_cft: newOrder.volume_cft,
      delivery_address: newOrder.delivery_address,
      vehicle_type: classification.vehicle.vehicle,
    });
    setShowForm(false);
    setNewOrder({ order_ref: '', neighbourhood_id: '', warehouse_id: '', order_type: 'normal', weight_kg: 1.0, volume_cft: 1.0, delivery_address: '', declared_fragile: false });
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <div className="section-title">Order Tracking</div>
          <div className="section-desc">Track and manage customer orders with automatic type classification and vehicle recommendation</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Order'}</button>
      </div>

      {showForm && (
        <div className="card mb-20">
          <div className="card-title">Create New Order</div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Order Reference</label>
              <input className="input" value={newOrder.order_ref} onChange={(e) => setNewOrder({ ...newOrder, order_ref: e.target.value })} placeholder="e.g. SK-001" />
            </div>
            <div className="form-group">
              <label className="label">Neighbourhood</label>
              <select className="select" value={newOrder.neighbourhood_id} onChange={(e) => setNewOrder({ ...newOrder, neighbourhood_id: e.target.value })}>
                <option value="">Select area</option>
                {neighbourhoods.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Warehouse (optional)</label>
              <select className="select" value={newOrder.warehouse_id} onChange={(e) => setNewOrder({ ...newOrder, warehouse_id: e.target.value })}>
                <option value="">Auto-assign</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Weight (kg)</label>
              <input className="input" type="number" step="0.1" value={newOrder.weight_kg} onChange={(e) => setNewOrder({ ...newOrder, weight_kg: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Volume (cft)</label>
              <input className="input" type="number" step="0.1" value={newOrder.volume_cft} onChange={(e) => setNewOrder({ ...newOrder, volume_cft: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Delivery Address</label>
              <input className="input" value={newOrder.delivery_address} onChange={(e) => setNewOrder({ ...newOrder, delivery_address: e.target.value })} placeholder="Street address" />
            </div>
            <div className="form-group">
              <label className="label">Declared Fragile?</label>
              <select className="select" value={newOrder.declared_fragile ? 'yes' : 'no'} onChange={(e) => setNewOrder({ ...newOrder, declared_fragile: e.target.value === 'yes' })}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
          {(() => {
            const cls = classifyOrder(newOrder.weight_kg, newOrder.volume_cft, newOrder.declared_fragile);
            return (
              <div style={{ fontSize: '0.82rem', padding: '10px 14px', background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                Auto-classified as <strong>{cls.type}</strong> — Recommended vehicle: <strong>{cls.vehicle.vehicle}</strong>
              </div>
            );
          })()}
          <button className="btn btn-primary" onClick={handleSubmit}>Create Order</button>
        </div>
      )}

      <div className="card">
        <div className="card-title">All Orders ({orders.length})</div>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>No orders yet. Create one to get started.</p>
        ) : (
          <div className="scrollable-table">
            <table>
              <thead>
                <tr><th>Ref</th><th>Area</th><th>Warehouse</th><th>Type</th><th>Status</th><th>Vehicle</th><th>On Time</th><th>Savings</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.map(ord => {
                  const nb = neighbourhoods.find(n => n.id === ord.neighbourhood_id);
                  const wh = warehouses.find(w => w.id === ord.warehouse_id);
                  return (
                    <tr key={ord.id}>
                      <td>{ord.order_ref}</td>
                      <td>{nb?.name ?? '-'}</td>
                      <td>{wh?.name ?? 'Unassigned'}</td>
                      <td><span className={`badge badge-${ord.order_type === 'fragile' ? 'red' : ord.order_type === 'sturdy' ? 'amber' : 'green'}`}>{ord.order_type}</span></td>
                      <td>
                        <select
                          className="select"
                          style={{ width: 'auto', padding: '2px 6px', fontSize: '0.75rem' }}
                          value={ord.status}
                          onChange={(e) => onUpdateOrder(ord.id, { status: e.target.value as Order['status'] })}
                        >
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                      <td>{ord.vehicle_type ?? '-'}</td>
                      <td>{ord.on_time === null ? '-' : ord.on_time ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Late</span>}</td>
                      <td>{ord.co_delivery_savings > 0 ? `₹${ord.co_delivery_savings}` : '-'}</td>
                      <td><button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => onDeleteOrder(ord.id)}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Analytics Tab ====================
function AnalyticsTab({
  neighbourhoods,
  warehouses,
  params,
  optimizationResults,
}: {
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  params: OptimizationParams;
  optimizationResults: OptimizationResults | null;
}) {
  const [sensitivity, setSensitivity] = useState<ReturnType<typeof sensitivityAnalysis>>([]);

  useEffect(() => {
    setSensitivity(sensitivityAnalysis(neighbourhoods, warehouses, params));
  }, [neighbourhoods, warehouses, params]);

  const reliabilityMatrix = computeReliabilityMatrix(neighbourhoods, warehouses, params.service_radius_km);
  const stats = computeDemandStatistics(neighbourhoods);

  return (
    <div>
      <div className="section-title">Analytics & Sensitivity Analysis</div>
      <div className="section-desc">Demand statistics, reliability matrices, and sensitivity checks across varying parameters</div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Daily Orders</div><div className="stat-value">{stats.totalOrders}</div></div>
        <div className="stat-card"><div className="stat-label">Peak Day Demand</div><div className="stat-value">{stats.peakDayDemand}</div><div className="stat-sub">×{stats.peakDayMultiplier} multiplier</div></div>
        <div className="stat-card"><div className="stat-label">Avg Orders/Area</div><div className="stat-value">{stats.avgOrdersPerNb}</div><div className="stat-sub">σ = {stats.stdDev}</div></div>
        <div className="stat-card"><div className="stat-label">Max Orders</div><div className="stat-value">{stats.maxOrders}</div></div>
        <div className="stat-card"><div className="stat-label">Min Orders</div><div className="stat-value">{stats.minOrders}</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Sensitivity Analysis</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '12px' }}>How total cost and coverage respond to changes in service radius, late penalty, and warehouse count.</p>
          <div className="scrollable-table" style={{ maxHeight: '350px' }}>
            <table>
              <thead><tr><th>Scenario</th><th>Total Cost (₹)</th><th>Coverage</th><th>Warehouses</th></tr></thead>
              <tbody>
                {sensitivity.map((s, i) => (
                  <tr key={i}>
                    <td>{s.label}</td>
                    <td>₹{s.totalCost.toLocaleString()}</td>
                    <td>{s.coverage}%</td>
                    <td>{s.warehousesUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Reliability Matrix (Top 20)</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '12px' }}>On-time probability: P = base_rate × e^(-distance/radius)</p>
          <div className="scrollable-table" style={{ maxHeight: '350px' }}>
            <table>
              <thead><tr><th>Neighbourhood</th><th>Warehouse</th><th>Distance</th><th>P(On-Time)</th></tr></thead>
              <tbody>
                {reliabilityMatrix.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td>{r.neighbourhood}</td>
                    <td>{r.warehouse}</td>
                    <td>{r.distance} km</td>
                    <td>{(r.onTimeProb * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {optimizationResults && (
        <div className="card mt-20">
          <div className="card-title">Cost Breakdown</div>
          <div className="grid-3">
            <div>
              <div className="stat-label">Fuel Cost</div>
              <div className="stat-value">₹{optimizationResults.total_fuel_cost.toLocaleString()}</div>
              <div className="progress-bar mt-20" style={{ marginTop: '6px' }}>
                <div className="progress-fill" style={{ width: `${(optimizationResults.total_fuel_cost / optimizationResults.total_weighted_cost) * 100}%`, background: 'var(--primary-500)' }} />
              </div>
            </div>
            <div>
              <div className="stat-label">Late Penalty</div>
              <div className="stat-value">₹{optimizationResults.total_late_penalty.toLocaleString()}</div>
              <div className="progress-bar mt-20" style={{ marginTop: '6px' }}>
                <div className="progress-fill" style={{ width: `${(optimizationResults.total_late_penalty / optimizationResults.total_weighted_cost) * 100}%`, background: 'var(--error-500)' }} />
              </div>
            </div>
            <div>
              <div className="stat-label">Co-delivery Savings</div>
              <div className="stat-value" style={{ color: 'var(--secondary-600)' }}>₹{optimizationResults.total_co_delivery_savings.toLocaleString()}</div>
              <div className="progress-bar mt-20" style={{ marginTop: '6px' }}>
                <div className="progress-fill" style={{ width: '100%', background: 'var(--secondary-500)' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Innovate Tab ====================
function InnovateTab() {
  return (
    <div>
      <div className="section-title">Innovation Lab</div>
      <div className="section-desc">SAVeKART is designed to be extensible — add your own innovative features even after the platform is built</div>

      <div className="card mb-20" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--secondary-50))', border: '1px solid var(--primary-200)' }}>
        <h3 style={{ marginBottom: '10px' }}>Add Your Own Feature</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--neutral-700)', marginBottom: '14px' }}>
          SAVeKART's modular architecture allows new features to be plugged in without disrupting existing functionality. The optimization engine, data layer, and UI components are decoupled, so you can add new analysis modules, visualizations, or integrations at any time.
        </p>
        <div style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>
          <strong>To add a new feature:</strong>
          <ol style={{ paddingLeft: '20px', marginTop: '6px', lineHeight: 1.8 }}>
            <li>Add the mathematical model to <code style={{ background: 'var(--neutral-100)', padding: '1px 5px', borderRadius: '3px' }}>optimization.ts</code></li>
            <li>Create a new tab component in <code style={{ background: 'var(--neutral-100)', padding: '1px 5px', borderRadius: '3px' }}>App.tsx</code></li>
            <li>Add any new database tables via Supabase migrations</li>
            <li>Wire up the API calls in <code style={{ background: 'var(--neutral-100)', padding: '1px 5px', borderRadius: '3px' }}>api.ts</code></li>
          </ol>
        </div>
      </div>

      <div className="grid-3">
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--secondary-100)' }}>&#9851;</div>
          <div className="feature-title">Carbon Footprint Tracker</div>
          <div className="feature-desc">Calculate CO2 emissions per delivery route and suggest the greenest vehicle options. Track sustainability metrics over time.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--accent-100)' }}>&#128202;</div>
          <div className="feature-title">Demand Forecasting</div>
          <div className="feature-desc">Predict future order volumes using time-series analysis. Proactively adjust warehouse staffing and inventory.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--primary-100)' }}>&#129518;</div>
          <div className="feature-title">Crowdsourced Delivery</div>
          <div className="feature-desc">Allow community members to become delivery partners during peak hours, reducing cost and improving delivery times.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: '#fee2e2' }}>&#128737;</div>
          <div className="feature-title">Weather-Aware Routing</div>
          <div className="feature-desc">Integrate weather forecasts to proactively reroute deliveries away from flooded or congested areas during monsoon.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--secondary-100)' }}>&#128176;</div>
          <div className="feature-title">Dynamic Pricing Engine</div>
          <div className="feature-desc">Adjust delivery charges based on demand, distance, and co-delivery availability. Pass savings directly to customers.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--accent-100)' }}>&#129682;</div>
          <div className="feature-title">Micro-Warehouse Network</div>
          <div className="feature-desc">Identify underutilized commercial spaces that can serve as pop-up micro-warehouses during peak demand periods.</div>
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-title">Current Feature Set</div>
        <div className="grid-2">
          <div>
            <h4 style={{ fontSize: '0.88rem', marginBottom: '8px' }}>Optimization</h4>
            <ul style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--neutral-600)', lineHeight: 1.8 }}>
              <li>Order-weighted delivery cost minimization (LP)</li>
              <li>Late-delivery penalty function</li>
              <li>5km service radius constraint</li>
              <li>Facility-location greedy heuristic</li>
              <li>Sensitivity analysis (radius, penalty, warehouse count)</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', marginBottom: '8px' }}>Logistics</h4>
            <ul style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--neutral-600)', lineHeight: 1.8 }}>
              <li>Route optimization (nearest-neighbour TSP)</li>
              <li>Co-delivery detection and savings calculation</li>
              <li>Order classification: fragile / normal / sturdy</li>
              <li>Vehicle recommendation by order type</li>
              <li>Warehouse space optimization (bin-packing)</li>
              <li>Petrol pump indicators on routes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
