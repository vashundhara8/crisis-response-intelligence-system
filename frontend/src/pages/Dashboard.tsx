import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Truck,
  Activity,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  MapPin,
  Clock,
  Ambulance,
  HeartPulse,
  LifeBuoy,
  Sparkles,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { getDashboardSummary, getDashboardMapData } from '../services/api';
import { DashboardSummaryResponse, DashboardMapResponse } from '../types';
import { StatCard } from '../components/StatCard';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TacticalMap } from '../map/TacticalMap';
import { CreateIncidentModal } from '../components/CreateIncidentModal';
import { IncidentTypeChart } from '../charts/IncidentTypeChart';
import { PriorityDistributionChart } from '../charts/PriorityDistributionChart';
import { ResourceUtilizationChart } from '../charts/ResourceUtilizationChart';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { hasRole } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [mapData, setMapData] = useState<DashboardMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [sumRes, mapRes] = await Promise.all([getDashboardSummary(), getDashboardMapData()]);
      setSummary(sumRes);
      setMapData(mapRes);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Unable to load command dashboard data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div>
        <div className="stats-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="stat-card">
              <div className="skeleton-box" style={{ height: 14, width: '60%', marginBottom: 12 }} />
              <div className="skeleton-box" style={{ height: 32, width: '40%', marginBottom: 8 }} />
              <div className="skeleton-box" style={{ height: 10, width: '75%' }} />
            </div>
          ))}
        </div>
        <div className="card-section">
          <div className="skeleton-box" style={{ height: 320, width: '100%' }} />
        </div>
      </div>
    );
  }

  if (errorMsg && !summary) {
    return (
      <div className="card-section" style={{ textAlign: 'center', padding: 48 }}>
        <AlertCircle size={36} color="#DC3545" style={{ marginBottom: 12 }} />
        <h3 style={{ color: '#101B2D', marginBottom: 8 }}>Command Dashboard Unavailable</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={fetchData}>
          <RefreshCw size={15} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const metrics = summary?.metrics;

  return (
    <div>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Emergency Operations Command Overview</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Real-time database-backed triage, fleet availability, and resource allocation guidance
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={fetchData}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {hasRole('Administrator', 'Emergency Coordinator') && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <PlusCircle size={15} />
              <span>Report Incident</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#fee4e2', color: '#b42318', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* 8 Database-Backed KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Active Incidents"
          value={metrics?.active_incidents ?? 0}
          subtext="Open & unresolved events"
          color="blue"
          icon={<AlertTriangle size={18} color="#3B82F6" />}
        />
        <StatCard
          title="Critical Incidents"
          value={metrics?.critical_incidents ?? 0}
          subtext="Score 80–100 • Immediate priority"
          color="red"
          icon={<Flame size={18} color="#DC3545" />}
        />
        <StatCard
          title="High-Priority Incidents"
          value={metrics?.high_incidents ?? 0}
          subtext="Score 60–79 • Expedited response"
          color="orange"
          icon={<Activity size={18} color="#F59E0B" />}
        />
        <StatCard
          title="Available Ambulances"
          value={metrics?.available_ambulances ?? 0}
          subtext="Ready for medical dispatch"
          color="green"
          icon={<Ambulance size={18} color="#16A34A" />}
        />
        <StatCard
          title="Available Rescue Teams"
          value={metrics?.available_rescue_teams ?? 0}
          subtext="USAR & extraction squads"
          color="green"
          icon={<LifeBuoy size={18} color="#16A34A" />}
        />
        <StatCard
          title="Available Medical Units"
          value={metrics?.available_medical_units ?? 0}
          subtext="Field triage & mobile clinics"
          color="green"
          icon={<HeartPulse size={18} color="#16A34A" />}
        />
        <StatCard
          title="Deployed Resources"
          value={metrics?.deployed_resources ?? 0}
          subtext={`Of ${metrics?.total_resources ?? 0} total fleet units`}
          color="orange"
          icon={<Truck size={18} color="#F59E0B" />}
        />
        <StatCard
          title="Pending Resource Requests"
          value={metrics?.pending_resource_requests ?? 0}
          subtext="Incidents awaiting unit assignment"
          color="slate"
          icon={<ShieldCheck size={18} color="#64748b" />}
        />
      </div>

      {/* Main Grid: Priority Queue + Tactical Map */}
      <div className="grid-2col">
        <div>
          {/* Emergency Priority Queue */}
          <div className="card-section">
            <div className="section-header">
              <div>
                <div className="section-title">
                  <Flame size={18} color="#DC3545" />
                  <span>Emergency Priority Queue</span>
                </div>
                <div className="section-subtitle">Ordered by configurable weighted Priority Engine score</div>
              </div>
              <Link to="/incidents" className="btn btn-outline btn-sm">
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {!summary?.prioritized_incidents?.length ? (
              <div style={{ textAlign: 'center', padding: 28, color: '#64748b', fontSize: 13 }}>
                No active emergency incidents currently in queue.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>INCIDENT & LOCATION</th>
                      <th>AFFECTED</th>
                      <th>PRIORITY</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.prioritized_incidents.slice(0, 6).map((inc) => (
                      <tr key={inc.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          <Link to={`/incidents/${inc.id}`} style={{ color: '#17263B', textDecoration: 'none' }}>
                            {inc.incident_code}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#101B2D' }}>{inc.title || inc.incident_type}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {inc.incident_type} • {inc.location}
                          </div>
                        </td>
                        <td><b>{inc.people_affected}</b></td>
                        <td><PriorityBadge level={inc.priority_level} score={inc.priority_score} /></td>
                        <td><StatusBadge status={inc.status} /></td>
                        <td>
                          <Link
                            to={`/allocation?incidentId=${inc.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                          >
                            Allocate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <Sparkles size={18} color="#17263B" />
                <span>Recommended Dispatch Actions</span>
              </div>
              <Link to="/allocation" style={{ fontSize: 12, color: '#17263B', fontWeight: 600, textDecoration: 'none' }}>
                Allocation Station →
              </Link>
            </div>

            {!summary?.recommended_actions?.length ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>
                No pending dispatch recommendations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {summary.recommended_actions.map((act) => (
                  <div
                    key={act.incident_id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12 }}>{act.incident_code}</span>
                        <PriorityBadge level={act.priority_level} score={act.priority_score} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#101B2D' }}>{act.incident_title}</div>
                      <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>{act.rationale}</div>
                    </div>
                    <Link to={`/allocation?incidentId=${act.incident_id}`} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Map, Fleet Readiness, Recent Alerts */}
        <div>
          <div className="card-section" style={{ padding: 14 }}>
            <div className="section-header" style={{ marginBottom: 12, paddingBottom: 8 }}>
              <div className="section-title">
                <MapPin size={18} color="#17263B" />
                <span>Live Tactical Incident Map</span>
              </div>
              <Link to="/map" style={{ fontSize: 12, color: '#17263B', fontWeight: 600, textDecoration: 'none' }}>
                Full Map →
              </Link>
            </div>
            {mapData && (
              <TacticalMap incidents={mapData.incidents} resources={mapData.resources} height="320px" />
            )}
          </div>

          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <Truck size={18} color="#17263B" />
                <span>Resource Availability Overview</span>
              </div>
              <Link to="/resources" style={{ fontSize: 12, color: '#17263B', fontWeight: 600, textDecoration: 'none' }}>
                Fleet →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary?.resource_summary?.map((rs) => (
                <div key={rs.resource_type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 600, color: '#101B2D' }}>{rs.resource_type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <b style={{ color: '#16A34A' }}>{rs.available} avail</b> / <b style={{ color: '#F59E0B' }}>{rs.deployed} dep</b> / {rs.total} total
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <Clock size={18} color="#17263B" />
                <span>Recent Alerts & Activity</span>
              </div>
              <Link to="/alerts" style={{ fontSize: 12, color: '#17263B', fontWeight: 600, textDecoration: 'none' }}>
                All Alerts →
              </Link>
            </div>
            {!summary?.recent_alerts?.length ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#64748b', fontSize: 13 }}>
                No open operational alerts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.recent_alerts.map((al) => (
                  <div
                    key={al.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: '#f8fafc',
                      borderLeft: `4px solid ${al.severity === 'CRITICAL' ? '#DC3545' : al.severity === 'HIGH' ? '#F59E0B' : '#3B82F6'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: '#101B2D' }}>{al.title}</div>
                      <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{al.timestamp}</span>
                    </div>
                    {al.message && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{al.message}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Embedded on Dashboard */}
      <div className="grid-3col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <BarChart3 size={16} color="#17263B" />
              <span>Priority Distribution</span>
            </div>
          </div>
          <PriorityDistributionChart data={summary?.incidents_by_priority || []} />
        </div>

        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <BarChart3 size={16} color="#17263B" />
              <span>Incident-Type Distribution</span>
            </div>
          </div>
          <IncidentTypeChart data={summary?.incidents_by_type || []} />
        </div>

        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <BarChart3 size={16} color="#17263B" />
              <span>Resource Utilization</span>
            </div>
          </div>
          <ResourceUtilizationChart data={summary?.resource_utilization || []} />
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchData()}
      />
    </div>
  );
};
