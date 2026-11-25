import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Truck,
  MapPin,
  Flame,
  ShieldCheck,
  RefreshCw,
  XCircle,
  AlertTriangle,
  RotateCcw,
  History,
} from 'lucide-react';
import {
  getPrioritizedIncidents,
  getResourceRecommendation,
  executeAllocation,
  releaseAllocation,
  getAllocationHistory,
} from '../services/api';
import {
  Incident,
  IncidentRecommendationResponse,
  AllocationResponse,
  AllocationHistoryItem,
} from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const Allocation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const canAllocate = hasRole('Administrator', 'Emergency Coordinator');
  const canRelease = hasRole('Administrator', 'Emergency Coordinator', 'Resource Manager');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(() => {
    const param = searchParams.get('incidentId');
    return param ? Number(param) : null;
  });
  const [recData, setRecData] = useState<IncidentRecommendationResponse | null>(null);
  const [history, setHistory] = useState<AllocationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  const [allocationFeedback, setAllocationFeedback] = useState<AllocationResponse | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const loadIncidentsAndHistory = async () => {
    try {
      setLoading(true);
      const [incData, histData] = await Promise.all([getPrioritizedIncidents(30), getAllocationHistory(50)]);
      setIncidents(incData);
      setHistory(histData);

      const urlId = searchParams.get('incidentId');
      if (urlId && incData.some((i) => i.id === Number(urlId))) {
        setSelectedIncidentId(Number(urlId));
      } else if (incData.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(incData[0].id);
      }
    } catch (err) {
      console.error('Failed to load prioritized incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentsAndHistory();
  }, []);

  const loadRecommendations = async (incId: number) => {
    try {
      setRecLoading(true);
      const res = await getResourceRecommendation(incId);
      setRecData(res);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      setSearchParams({ incidentId: String(selectedIncidentId) }, { replace: true });
      loadRecommendations(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const handleDecision = async (resourceId: number, action: 'ACCEPT' | 'REJECT' | 'OVERRIDE') => {
    if (!selectedIncidentId) return;
    if (action === 'OVERRIDE' && !decisionNotes.trim()) {
      const reason = window.prompt('Enter coordinator justification for manual override:');
      if (!reason || !reason.trim()) return;
      setDecisionNotes(reason.trim());
      return submitDecision(resourceId, action, reason.trim());
    }
    return submitDecision(resourceId, action, decisionNotes.trim() || undefined);
  };

  const submitDecision = async (resourceId: number, action: 'ACCEPT' | 'REJECT' | 'OVERRIDE', notes?: string) => {
    if (!selectedIncidentId) return;
    try {
      setAllocatingId(resourceId);
      const res = await executeAllocation({
        incident_id: selectedIncidentId,
        resource_id: resourceId,
        action,
        is_override: action === 'OVERRIDE',
        notes,
      });
      setAllocationFeedback(res);
      setDecisionNotes('');
      await Promise.all([loadRecommendations(selectedIncidentId), loadIncidentsAndHistory()]);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Allocation decision failed.');
    } finally {
      setAllocatingId(null);
    }
  };

  const handleRelease = async (allocationId: number) => {
    try {
      const res = await releaseAllocation(allocationId);
      setAllocationFeedback(res);
      if (selectedIncidentId) await loadRecommendations(selectedIncidentId);
      await loadIncidentsAndHistory();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to release allocation.');
    }
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);
  const topRecommendation = recData?.recommendations?.find(
    (r) => r.availability_status === 'AVAILABLE' && r.is_compatible && !r.resource.assigned_incident_id
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Resource Allocation Decision Station</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Proximity, accessibility penalty, hazard compatibility, and capacity evaluation — human coordinator retains final authority
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => selectedIncidentId && loadRecommendations(selectedIncidentId)}>
          <RefreshCw size={15} />
          <span>Refresh Recommendations</span>
        </button>
      </div>

      {allocationFeedback && (
        <div
          style={{
            padding: '14px 18px',
            background: allocationFeedback.decision_status === 'REJECTED' ? '#fef0c7' : '#ecfdf3',
            border: `1px solid ${allocationFeedback.decision_status === 'REJECTED' ? '#fedf89' : '#a6f4c5'}`,
            borderRadius: 8,
            color: allocationFeedback.decision_status === 'REJECTED' ? '#92400e' : '#027a48',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={22} />
            <div>
              <b style={{ fontSize: 14 }}>{allocationFeedback.message}</b>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Decision: <b>{allocationFeedback.decision_status}</b> • Resource: <b>{allocationFeedback.resource_code}</b> • Distance: <b>{allocationFeedback.distance_km} km</b> • Incident Status: <b>{allocationFeedback.incident_status}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2col">
        {/* Left: Prioritized Incident Selector */}
        <div>
          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <Flame size={18} color="#DC3545" />
                <span>Prioritized Incident Queue</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{incidents.length} open</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Loading queue...</div>
              ) : incidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No open incidents in queue.</div>
              ) : (
                incidents.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #17263B' : '1px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: '#17263B' }}>
                          {inc.incident_code}
                        </span>
                        <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#101B2D', marginBottom: 2 }}>
                        {inc.title || inc.incident_type}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <MapPin size={12} />
                        <span>{inc.location}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span><b>{inc.people_affected}</b> affected • {inc.injuries || 0} inj</span>
                        <StatusBadge status={inc.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Recommendations */}
        <div>
          {selectedIncident && (
            <div className="card-section" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Selected Target Incident ({selectedIncident.incident_code})
                </span>
                <StatusBadge status={selectedIncident.status} />
              </div>
              <h3 style={{ fontSize: 18, color: '#101B2D', marginBottom: 4 }}>
                {selectedIncident.title || `${selectedIncident.incident_type} — ${selectedIncident.location}`}
              </h3>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{selectedIncident.description}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                <span>Priority Score: <b style={{ color: '#DC3545' }}>{selectedIncident.priority_score} ({selectedIncident.priority_level})</b></span>
                <span>Affected: <b>{selectedIncident.people_affected}</b></span>
                <span>Accessibility: <b>{selectedIncident.accessibility}/100</b></span>
              </div>
              {canAllocate && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional coordinator decision notes / override justification..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Top Compatible Recommendation */}
          {topRecommendation && (
            <div className="card-section" style={{ background: '#ecfdf3', border: '1.5px solid #a6f4c5', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>
                  TOP RECOMMENDED DISPATCH
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                  Suitability: {topRecommendation.overall_suitability_score.toFixed(1)} / 100
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 17, color: '#064e3b', marginBottom: 4 }}>
                    {topRecommendation.resource.name} ({topRecommendation.resource.resource_code})
                  </h3>
                  <p style={{ fontSize: 13, color: '#047857' }}>
                    {topRecommendation.resource_type} • Station: {topRecommendation.resource.current_location}
                  </p>
                </div>

                {canAllocate && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={allocatingId === topRecommendation.resource.id}
                      onClick={() => handleDecision(topRecommendation.resource.id, 'ACCEPT')}
                      className="btn btn-success btn-sm"
                    >
                      <Truck size={15} />
                      <span>{allocatingId === topRecommendation.resource.id ? 'Dispatching...' : 'Accept & Assign'}</span>
                    </button>
                    <button
                      disabled={allocatingId === topRecommendation.resource.id}
                      onClick={() => handleDecision(topRecommendation.resource.id, 'REJECT')}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#b42318', borderColor: '#fca5a5', background: '#ffffff' }}
                    >
                      <XCircle size={15} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12, background: '#ffffff', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#065f46' }}>
                  <b>Geographic Distance:</b> {topRecommendation.distance_km} km
                </div>
                <div style={{ fontSize: 12, color: '#065f46' }}>
                  <b>Compatibility:</b> {topRecommendation.is_compatible ? 'Primary Hazard Match' : 'Override Required'}
                </div>
                <div style={{ fontSize: 12, color: '#065f46' }}>
                  <b>Capacity:</b> {topRecommendation.capacity_check}
                </div>
                <div style={{ fontSize: 12, color: '#065f46' }}>
                  <b>Accessibility:</b> {topRecommendation.accessibility_consideration}
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: '#047857', fontStyle: 'italic' }}>
                <b>Rationale:</b> {topRecommendation.explanation}
              </div>
            </div>
          )}

          {/* All Evaluated Candidates */}
          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <ShieldCheck size={18} color="#17263B" />
                <span>All Evaluated Fleet Candidates</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {recData?.compatible_available_count || 0} compatible & available of {recData?.total_candidates_evaluated || 0}
              </span>
            </div>

            <div className="table-responsive">
              <table className="tactical-table">
                <thead>
                  <tr>
                    <th>ASSET</th>
                    <th>DISTANCE / PENALTY</th>
                    <th>SUITABILITY</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>COORDINATOR ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recLoading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                        Evaluating candidate resources...
                      </td>
                    </tr>
                  ) : (
                    recData?.recommendations?.map((item) => {
                      const isAvail = item.availability_status === 'AVAILABLE' && !item.resource.assigned_incident_id;
                      return (
                        <tr key={item.resource.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.resource.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {item.resource.resource_code} • {item.resource_type} • Cap {item.resource.capacity}
                            </div>
                          </td>
                          <td>
                            <b>{item.distance_km} km</b>
                            <div style={{ fontSize: 10.5, color: '#64748b' }}>+{item.accessibility_penalty} km ingress</div>
                          </td>
                          <td>
                            <b>{item.overall_suitability_score.toFixed(1)}</b>
                            <div style={{ fontSize: 10.5, color: item.is_compatible ? '#16A34A' : '#F59E0B' }}>
                              {item.is_compatible ? 'Compatible' : 'Non-Primary'}
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={item.availability_status} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {!canAllocate ? (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>Read Only</span>
                            ) : !isAvail ? (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>Unavailable</span>
                            ) : item.is_compatible ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  disabled={allocatingId === item.resource.id}
                                  onClick={() => handleDecision(item.resource.id, 'ACCEPT')}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: 11, padding: '4px 8px' }}
                                >
                                  Assign
                                </button>
                                <button
                                  disabled={allocatingId === item.resource.id}
                                  onClick={() => handleDecision(item.resource.id, 'REJECT')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: 11, padding: '4px 8px' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={allocatingId === item.resource.id}
                                onClick={() => handleDecision(item.resource.id, 'OVERRIDE')}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: 11, padding: '4px 8px', color: '#b45309', borderColor: '#F59E0B' }}
                              >
                                <AlertTriangle size={12} />
                                <span>Manual Override</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation History & Release Table */}
      <div className="card-section">
        <div className="section-header">
          <div className="section-title">
            <History size={18} color="#17263B" />
            <span>Allocation Decision History & Release Control</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>{history.length} recent records</span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
            No resource allocation decisions logged yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>INCIDENT</th>
                  <th>RESOURCE</th>
                  <th>DISTANCE</th>
                  <th>DECISION</th>
                  <th>DECIDED BY</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 11.5, color: '#64748b' }}>{new Date(h.allocated_at).toLocaleString()}</td>
                    <td>
                      <b>{h.incident_code}</b>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{h.incident_title}</div>
                    </td>
                    <td>
                      <b>{h.resource_code}</b> — {h.resource_name}
                      <div style={{ fontSize: 11, color: '#64748b' }}>{h.resource_type}</div>
                    </td>
                    <td>{h.distance_km} km</td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 11.5 }}>{h.decision_status}</span>
                      {h.is_override && <div style={{ fontSize: 10, color: '#F59E0B' }}>Manual Override</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{h.decided_by || 'SYSTEM'}</td>
                    <td><StatusBadge status={h.status === 'ACTIVE' ? 'DEPLOYED' : h.status === 'REJECTED' ? 'UNAVAILABLE' : 'AVAILABLE'} /></td>
                    <td style={{ textAlign: 'right' }}>
                      {h.status === 'ACTIVE' && canRelease ? (
                        <button className="btn btn-outline btn-sm" onClick={() => handleRelease(h.id)}>
                          <RotateCcw size={12} />
                          <span>Release / Reassign</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {h.released_at ? `Released ${new Date(h.released_at).toLocaleTimeString()}` : h.status}
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
    </div>
  );
};
