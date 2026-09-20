import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Neighbourhood, Warehouse, PetrolPump, Assignment, DeliveryRoute } from './types';

interface MapViewProps {
  neighbourhoods: Neighbourhood[];
  warehouses: Warehouse[];
  petrolPumps: PetrolPump[];
  assignments?: Assignment[];
  routes?: DeliveryRoute[];
  showOptimized: boolean;
  selectedWarehouseId?: string | null;
  center?: [number, number];
  zoom?: number;
}

const COLORS = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
  warehouse: '#1e63e8',
  warehouseOptimal: '#16a34a',
  warehouseInactive: '#94a3b8',
  petrol: '#f97316',
  route: '#3380f6',
  assignmentLine: '#22c55e',
};

function createCircleIcon(color: string, size: number, label?: string): L.DivIcon {
  const html = label
    ? `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;">${label}</div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`;
  return L.divIcon({ html, className: 'custom-marker', iconSize: [size, size] });
}

function createWarehouseIcon(optimal: boolean, label?: string): L.DivIcon {
  const color = optimal ? COLORS.warehouseOptimal : COLORS.warehouse;
  const size = optimal ? 36 : 30;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:6px;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">${label ?? 'W'}</div>`;
  return L.divIcon({ html, className: 'custom-marker', iconSize: [size, size] });
}

function createPetrolIcon(): L.DivIcon {
  const html = `<div style="width:22px;height:22px;border-radius:4px;background:${COLORS.petrol};border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;">P</div>`;
  return L.divIcon({ html, className: 'custom-marker', iconSize: [22, 22] });
}

export default function MapView({
  neighbourhoods,
  warehouses,
  petrolPumps,
  assignments,
  routes,
  showOptimized,
  selectedWarehouseId,
  center = [15.39, 75.08],
  zoom = 12,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { center, zoom });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);
    layerRef.current = L.layerGroup().addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerRef.current) return;
    const layer = layerRef.current;
    layer.clearLayers();

    const assignmentMap = new Map<string, Assignment>();
    if (assignments) {
      for (const a of assignments) {
        assignmentMap.set(a.neighbourhood_id, a);
      }
    }

    const optimalWhIds = new Set<string>();
    if (showOptimized && assignments) {
      for (const a of assignments) {
        optimalWhIds.add(a.warehouse_id);
      }
    }

    // Draw assignment lines (optimized view)
    if (showOptimized && assignments) {
      for (const a of assignments) {
        const nb = neighbourhoods.find((n) => n.id === a.neighbourhood_id);
        const wh = warehouses.find((w) => w.id === a.warehouse_id);
        if (nb && wh) {
          L.polyline(
            [
              [wh.lat, wh.lon],
              [nb.lat, nb.lon],
            ],
            {
              color: a.is_co_delivery ? COLORS.assignmentLine : COLORS.route,
              weight: a.is_co_delivery ? 3 : 2,
              opacity: 0.6,
              dashArray: a.is_co_delivery ? undefined : '6 4',
            }
          ).addTo(layer);
        }
      }
    }

    // Draw route lines
    if (routes && routes.length > 0) {
      for (const route of routes) {
        if (route.warehouse_id) {
          const wh = warehouses.find((w) => w.id === route.warehouse_id);
          if (wh && route.stop_sequence.length > 0) {
            const points: [number, number][] = [[wh.lat, wh.lon]];
            for (const stop of route.stop_sequence) {
              points.push([stop.lat, stop.lon]);
            }
            points.push([wh.lat, wh.lon]);
            L.polyline(points, {
              color: COLORS.route,
              weight: 2.5,
              opacity: 0.7,
            }).addTo(layer);
          }
        }
      }
    }

    // Petrol pumps
    for (const pp of petrolPumps) {
      const marker = L.marker([pp.lat, pp.lon], { icon: createPetrolIcon() }).addTo(layer);
      marker.bindPopup(`<b>${pp.name}</b><br/>${pp.brand}`);
    }

    // Warehouses
    for (const wh of warehouses) {
      const isOptimal = optimalWhIds.has(wh.id);
      const isSelected = selectedWarehouseId === wh.id;
      const icon = createWarehouseIcon(isOptimal, isOptimal ? 'W' : 'w');
      const marker = L.marker([wh.lat, wh.lon], { icon }).addTo(layer);
      const statusLabel = isOptimal
        ? '<span style="color:#16a34a;font-weight:700;">OPTIMAL</span>'
        : '<span style="color:#94a3b8;">Candidate</span>';
      marker.bindPopup(
        `<b>${wh.name}</b><br/>${statusLabel}<br/>Capacity: ${wh.capacity_sqft.toLocaleString()} sq ft<br/>Current Load: ${wh.current_load_sqft.toLocaleString()} sq ft<br/>Type: ${wh.area_type}`
      );
    }

    // Neighbourhoods
    for (const nb of neighbourhoods) {
      const color = COLORS[nb.frequency_class] ?? COLORS.green;
      const assignment = assignmentMap.get(nb.id);
      const size = Math.max(16, Math.min(34, 16 + nb.daily_orders / 15));
      const icon = createCircleIcon(color, size, String(nb.daily_orders));
      const marker = L.marker([nb.lat, nb.lon], { icon }).addTo(layer);
      let popupContent = `<b>${nb.name}</b><br/>Population: ${nb.population.toLocaleString()}<br/>Daily Orders: ${nb.daily_orders}<br/>Class: <span style="color:${color};font-weight:700;">${nb.frequency_class.toUpperCase()}</span><br/>On-time Rate: ${(nb.on_time_rate * 100).toFixed(0)}%`;
      if (assignment) {
        popupContent += `<br/><hr style="margin:4px 0;"/><b>Assigned to:</b> ${assignment.warehouse_name}<br/><b>Distance:</b> ${assignment.distance_km} km<br/><b>Delivery Cost:</b> ₹${assignment.delivery_cost}<br/><b>On-time Prob:</b> ${(assignment.on_time_prob * 100).toFixed(1)}%`;
        if (assignment.is_co_delivery) {
          popupContent += `<br/><span style="color:#16a34a;font-weight:700;">Co-delivery savings: ₹${assignment.savings}/order</span>`;
        }
      }
      marker.bindPopup(popupContent);
    }
  }, [neighbourhoods, warehouses, petrolPumps, assignments, routes, showOptimized, selectedWarehouseId]);

  return <div ref={mapRef} className="map-container" />;
}
