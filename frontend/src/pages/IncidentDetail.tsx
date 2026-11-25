import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Edit3,
  Clock,
} from 'lucide-react';
import { getIncidentById, updateIncident } from '../services/api';
import { Incident, IncidentStatus } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TacticalMap } from '../map/TacticalMap';
import { EditIncidentModal } from '../components/EditIncidentModal';
import { useAuth } from '../context/AuthContext';

const ALL_STATUSES: IncidentStatus[] = [
  'REPORTED',
  'UNDER_ASSESSMENT',
  'ACTIVE',
  'RESOURCES_ASSIGNED',
  'RESOLVED',
  'CLOSED',
];

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canEdit = hasRole('Administrator', 'Emergency Coordinator');

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchIncident = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getIncidentById(Number(id));
      setIncident(data);
    } catch (err) {
      console.error('Failed to load incident:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident) return;
    try {
      setStatusUpdating(true);
      const updated = await updateIncident(incident.id, { status: newStatus });
      setIncident(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || !incident) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        Loading incident dossier...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/incidents" className="btn btn-outline btn-sm">
          <ArrowLeft size={14} />
          <span>Back to Registry</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div
        className="card-section"
        style={{
          background: '#ffffff',
          borderLeft: `6px solid ${
            incident.priority_level === 'CRITICAL'
              ? '#DC3545'
              : incident.priority_level === 'HIGH'
              ? '#F59E0B'
              : '#3B82F6'
          }`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                {incident.incident_code}
              </span>
              <PriorityBadge level={incident.priority_level} score={incident.priority_score} />
              <StatusBadge status={incident.status} />
            </div>
            <h2 style={{ fontSize: 23, color: '#101B2D', marginBottom: 4 }}>{incident.title || incident.incident_type}</h2>
            <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 6 }}>
              <b>{incident.incident_type}</b> • {incident.location}
            </p>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 740 }}>{incident.description}</p>
            <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 12.5, color: '#334155', flexWrap: 'wrap' }}>
              <span>Affected: <b>{incident.people_affected}</b></span>
              <span>Injuries: <b>{incident.injuries || 0}</b></span>
              <span>Casualties: <b style={{ color: incident.casualties ? '#DC3545' : 'inherit' }}>{incident.casualties || 0}</b></span>
              <span>Created: <b>{new Date(incident.created_at).toLocaleString()}</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {canEdit && (
              <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                <Edit3 size={15} />
                <span>Edit Incident</span>
              </button>
            )}
            <Link to={`/allocation?incidentId=${incident.id}`} className="btn btn-primary">
              <ArrowRightLeft size={16} />
              <span>Dispatch Allocation</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <Activity size={18} color="#17263B" />
              <span>Dynamic Priority Factor Decomposition</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {incident.last_recalculated_at ? new Date(incident.last_recalculated_at).toLocaleString() : 'Live'}
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>
            {incident.priority_explanation}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {incident.factor_contributions?.map((fc) => (
              <div key={fc.factor_name} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#101B2D' }}>{fc.factor_name}</span>
                  <span style={{ fontSize: 12 }}>
                    <b>{fc.raw_value}</b> / 100 × {fc.weight_percentage}% = <b style={{ color: '#DC3545' }}>+{fc.weighted_score} pts</b>
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${fc.raw_value}%`, height: '100%', background: '#17263B', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 14, background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e3a8a' }}>
            <b>Total Priority Score:</b> {incident.priority_score} / 100 ({incident.priority_level}) — Prototype decision-support score only (not a medical triage system).
          </div>
        </div>

        <div>
          <div className="card-section" style={{ padding: 14 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <div className="section-title">
                <MapPin size={18} color="#17263B" />
                <span>Geospatial Ingress Location</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {incident.latitude.toFixed(4)}°N, {incident.longitude.toFixed(4)}°E
              </span>
            </div>

            <TacticalMap
              incidents={[
                {
                  id: incident.id,
                  incident_code: incident.incident_code,
                  title: incident.title || incident.incident_type,
                  incident_type: incident.incident_type,
                  location: incident.location,
                  latitude: incident.latitude,
                  longitude: incident.longitude,
                  priority_score: incident.priority_score,
                  priority_level: incident.priority_level,
                  severity: incident.severity,
                  people_affected: incident.people_affected,
                  injuries: incident.injuries || 0,
                  casualties: incident.casualties || 0,
                  status: incident.status,
                },
              ]}
              resources={[]}
              selectedIncidentId={incident.id}
              center={[incident.latitude, incident.longitude]}
              zoom={13}
              height="260px"
              showResources={false}
            />
          </div>

          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <CheckCircle2 size={18} color="#17263B" />
                <span>Operational Status Lifecycle</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  disabled={!canEdit || statusUpdating || incident.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`btn ${incident.status === st ? 'btn-primary' : 'btn-outline'} btn-sm`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EditIncidentModal
        incident={isEditing ? incident : null}
        onClose={() => setIsEditing(false)}
        onUpdated={(updated) => setIncident(updated)}
      />
    </div>
  );
};
