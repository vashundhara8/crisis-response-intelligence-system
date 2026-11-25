import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin, History, RotateCcw } from 'lucide-react';
import { getResourceDetail, releaseAllocation } from '../services/api';
import { Resource } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TacticalMap } from '../map/TacticalMap';
import { useAuth } from '../context/AuthContext';

export const ResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canRelease = hasRole('Administrator', 'Emergency Coordinator', 'Resource Manager');

  const [resource, setResource] = useState<Resource | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getResourceDetail(Number(id));
      setResource(data.resource);
      setHistory(data.allocation_history || []);
    } catch (err) {
      console.error('Failed to load resource detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleRelease = async (allocationId: number) => {
    try {
      await releaseAllocation(allocationId);
      loadDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to release allocation.');
    }
  };

  if (loading || !resource) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading resource dossier...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/resources" className="btn btn-outline btn-sm">
          <ArrowLeft size={14} />
          <span>Back to Fleet</span>
        </Link>
      </div>

      <div className="card-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{resource.resource_code}</span>
              <StatusBadge status={resource.availability_status} />
            </div>
            <h2 style={{ fontSize: 22, color: '#101B2D', marginBottom: 4 }}>{resource.name}</h2>
            <p style={{ fontSize: 13.5, color: '#475569' }}>
              <b>{resource.resource_type}</b> • Base Location: {resource.current_location} • Capacity: <b>{resource.capacity}</b>
            </p>
            {resource.assigned_incident_id && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Currently assigned to:{' '}
                <Link to={`/incidents/${resource.assigned_incident_id}`} style={{ fontWeight: 700, color: '#3B82F6' }}>
                  {resource.assigned_incident_code} — {resource.assigned_incident_title}
                </Link>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Last updated: {new Date(resource.updated_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <History size={18} color="#17263B" />
              <span>Assignment & Dispatch History</span>
            </div>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
              No historical allocations recorded for this unit yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="tactical-table">
                <thead>
                  <tr>
                    <th>INCIDENT</th>
                    <th>DISTANCE</th>
                    <th>DECISION</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link to={`/incidents/${h.incident_id}`} style={{ fontWeight: 700, color: '#17263B', textDecoration: 'none' }}>
                          {h.incident_code}
                        </Link>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{h.incident_title}</div>
                      </td>
                      <td>{h.distance_km} km</td>
                      <td>{h.decision_status}</td>
                      <td><StatusBadge status={h.status === 'ACTIVE' ? 'DEPLOYED' : 'AVAILABLE'} /></td>
                      <td>
                        {h.status === 'ACTIVE' && canRelease ? (
                          <button className="btn btn-outline btn-sm" onClick={() => handleRelease(h.id)}>
                            <RotateCcw size={12} />
                            <span>Release</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {h.released_at ? new Date(h.released_at).toLocaleDateString() : h.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-section" style={{ padding: 14 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <div className="section-title">
              <MapPin size={18} color="#17263B" />
              <span>Station Coordinates</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {resource.latitude.toFixed(4)}°N, {resource.longitude.toFixed(4)}°E
            </span>
          </div>

          <TacticalMap
            incidents={[]}
            resources={[
              {
                id: resource.id,
                resource_code: resource.resource_code,
                resource_type: resource.resource_type,
                name: resource.name,
                latitude: resource.latitude,
                longitude: resource.longitude,
                capacity: resource.capacity,
                availability_status: resource.availability_status,
                current_location: resource.current_location,
                assigned_incident_id: resource.assigned_incident_id,
                assigned_incident_code: resource.assigned_incident_code,
              },
            ]}
            center={[resource.latitude, resource.longitude]}
            zoom={13}
            height="280px"
          />
        </div>
      </div>
    </div>
  );
};

