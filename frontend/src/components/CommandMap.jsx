"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import { divIcon } from 'leaflet';
import { MapPin, AlertOctagon } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default Leaflet icons in Next.js
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

// ✅ NEW: Auto-Pan Component
// This listens for coordinate changes and moves the camera
function RecenterAutomatically({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      // Fly to the new location with a smooth animation
      map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

function RoutingMachine({ start, end }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    if (typeof window !== 'undefined') {
       require('leaflet-routing-machine');
       
       const routingControl = L.Routing.control({
        waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false, 
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        lineOptions: { 
            styles: [{ color: '#10b981', weight: 6, opacity: 0.8 }] 
        },
        createMarker: () => null 
      });

      routingControl.addTo(map);
      routingControlRef.current = routingControl;

      return () => {
        if (routingControlRef.current) {
            try {
                routingControlRef.current.getPlan().setWaypoints([]);
                map.removeControl(routingControlRef.current);
            } catch (e) {
                console.warn("Routing cleanup warning:", e);
            }
            routingControlRef.current = null;
        }
      };
    }
  }, [map, start, end]);

  return null;
}

const createClusterCustomIcon = function (cluster) {
  const markers = cluster.getAllChildMarkers();
  const hasCritical = markers.some(marker => marker.options.isCritical === true);
  const colorClass = hasCritical 
    ? "border-red-500 text-red-500 bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse" 
    : "border-cyan-500 text-cyan-400 bg-slate-800/80";

  return divIcon({
    html: `<span class="flex items-center justify-center w-full h-full border-2 rounded-full font-bold text-sm ${colorClass}">${cluster.getChildCount()}</span>`,
    className: 'custom-marker-cluster',
    iconSize: [40, 40]
  });
};

const CommandMap = React.memo(function CommandMap({ incidents, riskZones = [], viewMode, unitLocation, routeDestination }) {
  
  useEffect(() => { fixLeafletIcons(); }, []);

  const safeIncidents = Array.isArray(incidents) ? incidents : [];
  const center = [13.0827, 80.2707]; 

  // ✅ GET LATEST INCIDENT TO AUTO-FOCUS
  // We grab the first incident (index 0) because your backend inserts new ones at the top.
  const latestIncident = safeIncidents.length > 0 ? safeIncidents[0] : null;
  const focusLat = latestIncident ? parseFloat(latestIncident.lat || latestIncident.location?.lat) : null;
  const focusLng = latestIncident ? parseFloat(latestIncident.lng || latestIncident.location?.lng) : null;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', background: '#1e293b' }} zoomControl={false}>
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {/* ✅ ACTIVATE AUTO-PAN */}
        {/* If we have a latest incident with valid coords, this component will fly the map there */}
        {focusLat && focusLng && (
            <RecenterAutomatically lat={focusLat} lng={focusLng} />
        )}

        {/* Routing Machine */}
        {viewMode === 'unit' && unitLocation && routeDestination && (
          <RoutingMachine start={unitLocation} end={routeDestination} />
        )}

        {/* Risk Zones */}
        {Array.isArray(riskZones) && riskZones.map((zone, i) => (
           <Circle key={`zone-${i}`} center={[zone.lat, zone.lng]} radius={zone.radius}
              pathOptions={{ color: 'red', fillColor: '#ef4444', fillOpacity: 0.15, weight: 1, dashArray: '4, 8' }} />
        ))}

        {/* Incident Markers */}
        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} maxClusterRadius={50}>
          {safeIncidents.map((inc) => {
            const lat = parseFloat(inc.lat || inc.location?.lat);
            const lng = parseFloat(inc.lng || inc.location?.lng);
            const isCritical = ['Critical', 'High'].includes(inc.severity) || inc.is_critical;
            
            if (isNaN(lat) || isNaN(lng)) return null;

            const iconMarkup = renderToStaticMarkup(
              <div className="relative flex items-center justify-center w-12 h-12 group">
                 {isCritical && <span className="absolute w-full h-full bg-red-500/40 rounded-full animate-ping duration-1000"></span>}
                 <div className={`relative z-10 p-2 rounded-full shadow-2xl border-2 transition-all duration-300 ${isCritical ? 'bg-red-600 border-red-400 scale-110' : 'bg-cyan-600 border-cyan-400'}`}>
                    {isCritical ? <AlertOctagon size={20} color="white" /> : <MapPin size={18} color="white" />}
                 </div>
              </div>
            );

            const customIcon = divIcon({
              html: iconMarkup,
              className: 'bg-transparent',
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            });

            return (
              <Marker key={inc.id || inc._id} position={[lat, lng]} icon={customIcon} isCritical={isCritical}>
                <Popup className="custom-popup">
                  <div className="text-slate-900 min-w-[150px]">
                    <div className={`text-xs font-bold px-2 py-1 mb-2 rounded text-white text-center ${isCritical ? 'bg-red-600' : 'bg-slate-800'}`}>
                        {isCritical ? 'CRITICAL THREAT' : 'INCIDENT REPORT'}
                    </div>
                    <strong className="block text-sm uppercase mb-1 border-b border-gray-300 pb-1">{inc.type}</strong>
                    <div className="text-xs space-y-1"><p>{inc.description}</p></div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
});

export default CommandMap;