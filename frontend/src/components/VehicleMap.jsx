import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getChannelColor } from '../utils/formatters';

export function VehicleMap({ vehicles = [], onSelectVehicle }) {
  // Default center: Bengaluru Silk Board corridor
  const defaultCenter = [12.9172, 77.6228];

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden border border-slate-800 glass-card relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vehicles
          .filter((v) => typeof v.latitude === 'number' && !isNaN(v.latitude) && typeof v.longitude === 'number' && !isNaN(v.longitude))
          .map((v) => (
            <CircleMarker
              key={v.vehicle_id}
              center={[v.latitude, v.longitude]}
              radius={7}
              pathOptions={{
                color: getChannelColor(v.selected_channel),
                fillColor: getChannelColor(v.selected_channel),
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                click: () => onSelectVehicle && onSelectVehicle(v),
              }}
            >
              <Popup className="font-mono text-xs">
                <div className="p-1 space-y-1">
                  <div className="font-bold text-slate-900">{v.vehicle_id}</div>
                  <div>Speed: {v.speed_mps} m/s</div>
                  <div>Channel: Ch {v.selected_channel + 1}</div>
                  <div>SINR: {v.sinr_db} dB</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}

export default VehicleMap;
