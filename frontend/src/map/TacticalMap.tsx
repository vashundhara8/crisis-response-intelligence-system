import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapIncidentMarker, MapResourceMarker } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIncidentIcon = (priorityLevel: string, isSelected: boolean) => {
  const color =
    priorityLevel === 'CRITICAL'
      ? '#DC3545'
      : priorityLevel === 'HIGH'
      ? '#F59E0B'
      : priorityLevel === 'MODERATE' || priorityLevel === 'MEDIUM'
      ? '#3B82F6'
      : '#64748b';

  const size = isSelected ? 34 : 26;
  const border = isSelected ? '3.5px solid #101B2D' : '3px solid #ffffff';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${border};
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: ${isSelected ? 14 : 11}px;
      ">
        ${priorityLevel === 'CRITICAL' || isSelected ? `<div style="position:absolute; inset:-6px; border:2px solid ${color}; border-radius:50%; animation: pulse-glow 1.5s infinite;"></div>` : ''}
        !
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -16],
  });
};

const createResourceIcon = (type: string, status: string) => {
  const color =
    status === 'AVAILABLE'
      ? '#16A34A'
      : status === 'DEPLOYED' || status === 'ASSIGNED'
      ? '#F59E0B'
      : '#DC3545';

  const symbol = type.startsWith('Amb')
    ? 'AMB'
    : type.startsWith('Res')
    ? 'RES'
    : type.startsWith('Med')
    ? 'MED'
    : type.startsWith('Fire')
    ? 'FRU'
    : type.startsWith('Emer')
    ? 'SUP'
    : 'SHL';

  return L.divIcon({
    className: 'custom-resource-marker',
    html: `
      <div style="
        padding: 2px 6px;
        min-width: 34px;
        height: 24px;
        background: #101B2D;
        color: #ffffff;
        border: 2.5px solid ${color};
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.4px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [34, 24],
    iconAnchor: [17, 12],
    popupAnchor: [0, -14],
  });
};

interface TacticalMapProps {
  incidents: MapIncidentMarker[];
  resources: MapResourceMarker[];
  selectedIncidentId?: number | null;
  onSelectIncident?: (id: number) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  showResources?: boolean;
}

const BoundsFitter: React.FC<{
  incidents: MapIncidentMarker[];
  resources: MapResourceMarker[];
  selectedIncidentId?: number | null;
}> = ({ incidents, resources, selectedIncidentId }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedIncidentId) {
      const target = incidents.find((i) => i.id === selectedIncidentId);
      if (target) {
        map.setView([target.latitude, target.longitude], 13, { animate: true });
        return;
      }
    }
    const latLngs: L.LatLngTuple[] = [];
    incidents.forEach((i) => latLngs.push([i.latitude, i.longitude]));
    resources.forEach((r) => latLngs.push([r.latitude, r.longitude]));

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [incidents, resources, selectedIncidentId, map]);

  return null;
};

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incidents,
  resources,
  selectedIncidentId = null,
  onSelectIncident,
  center = [12.9716, 77.5946],
  zoom = 11,
  height = '480px',
  showResources = true,
}) => {
  return (
    <div className="leaflet-map-wrapper" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsFitter incidents={incidents} resources={resources} selectedIncidentId={selectedIncidentId} />

        {incidents.map((inc) => {
          const isSelected = selectedIncidentId === inc.id;
          return (
            <React.Fragment key={`inc-${inc.id}`}>
              <Marker
                position={[inc.latitude, inc.longitude]}
                icon={createIncidentIcon(inc.priority_level, isSelected)}
                eventHandlers={
                  onSelectIncident
                    ? {
                        click: () => onSelectIncident(inc.id),
                      }
                    : undefined
                }
              >
                <Popup>
                  <div style={{ minWidth: 220, padding: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{inc.incident_code}</span>
                      <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
                    </div>
                    <h4 style={{ fontSize: 14, color: '#101B2D', marginBottom: 2 }}>{inc.title || inc.incident_type}</h4>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{inc.incident_type}</div>
                    <p style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{inc.location}</p>
                    <p style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>
                      <b>{inc.people_affected}</b> affected • <b>{inc.injuries || 0}</b> injuries • <b>{inc.casualties || 0}</b> casualties
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <StatusBadge status={inc.status} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={`/incidents/${inc.id}`} style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', textDecoration: 'none' }}>
                          Details
                        </Link>
                        <Link to={`/allocation?incidentId=${inc.id}`} style={{ fontSize: 11, fontWeight: 700, color: '#101B2D', textDecoration: 'none' }}>
                          Allocate →
                        </Link>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
              {(inc.priority_level === 'CRITICAL' || isSelected) && (
                <CircleMarker
                  center={[inc.latitude, inc.longitude]}
                  radius={isSelected ? 34 : 26}
                  pathOptions={{
                    color: isSelected ? '#101B2D' : '#DC3545',
                    fillColor: isSelected ? '#3B82F6' : '#DC3545',
                    fillOpacity: isSelected ? 0.18 : 0.12,
                    weight: isSelected ? 2 : 1.5,
                    dashArray: '4, 4',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {showResources &&
          resources.map((res) => (
            <Marker
              key={`res-${res.id}`}
              position={[res.latitude, res.longitude]}
              icon={createResourceIcon(res.resource_type, res.availability_status)}
            >
              <Popup>
                <div style={{ minWidth: 205, padding: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{res.resource_code}</span>
                    <StatusBadge status={res.availability_status} />
                  </div>
                  <h4 style={{ fontSize: 14, color: '#101B2D', marginBottom: 4 }}>{res.name}</h4>
                  <p style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>
                    Type: <b>{res.resource_type}</b>
                  </p>
                  <p style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>Base: {res.current_location}</p>
                  <p style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                    Capacity: <b>{res.capacity}</b> units
                  </p>
                  {res.assigned_incident_code && (
                    <p style={{ fontSize: 11.5, color: '#17263B', background: '#eff6ff', padding: '4px 6px', borderRadius: 4, marginBottom: 6 }}>
                      Assigned to: <b>{res.assigned_incident_code}</b>
                    </p>
                  )}
                  <Link to={`/resources/${res.id}`} style={{ fontSize: 11, fontWeight: 700, color: '#17263B', textDecoration: 'none' }}>
                    Inspect Unit →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <div className="map-control-overlay">
        <div style={{ fontWeight: 700, color: '#101B2D', marginBottom: 4 }}>TACTICAL MAP LEGEND</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, flexWrap: 'wrap' }}>
          <span><b style={{ color: '#DC3545' }}>●</b> Critical</span>
          <span><b style={{ color: '#F59E0B' }}>●</b> High</span>
          <span><b style={{ color: '#3B82F6' }}>●</b> Moderate</span>
          <span><b style={{ color: '#64748b' }}>●</b> Low</span>
          <span><b style={{ color: '#16A34A' }}>■</b> Available Unit</span>
          <span><b style={{ color: '#F59E0B' }}>■</b> Deployed</span>
        </div>
      </div>
    </div>
  );
};
