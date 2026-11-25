import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  Edit3,
  ArrowUpDown,
} from 'lucide-react';
import { getIncidents, deleteIncident } from '../services/api';
import { Incident } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { CreateIncidentModal } from '../components/CreateIncidentModal';
import { EditIncidentModal } from '../components/EditIncidentModal';
import { useAuth } from '../context/AuthContext';

export const Incidents: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('Administrator', 'Emergency Coordinator');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const fetchIncidentsData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getIncidents({
        search: search || undefined,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        incident_type: typeFilter || undefined,
      });
      setIncidents(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentsData();
  }, [priorityFilter, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidentsData();
  };

  const handleDelete = async (id: number, code: string) => {
    if (!window.confirm(`Are you sure you want to delete incident ${code}?`)) return;
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete incident.');
    }
  };

  const sortedIncidents = [...incidents].sort((a, b) =>
    sortAsc ? a.priority_score - b.priority_score : b.priority_score - a.priority_score
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Emergency Incident Registry</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Full incident lifecycle management, casualty tracking, and priority scoring
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setSortAsc(!sortAsc)}>
            <ArrowUpDown size={15} />
            <span>Priority: {sortAsc ? 'Low → High' : 'High → Low'}</span>
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <PlusCircle size={16} />
              <span>Report New Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-section" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search title, code, location, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: 165 }}>
            <select className="form-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical (80–100)</option>
              <option value="HIGH">High (60–79)</option>
              <option value="MODERATE">Moderate (40–59)</option>
              <option value="LOW">Low (0–39)</option>
            </select>
          </div>

          <div style={{ width: 180 }}>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="UNDER_ASSESSMENT">Under Assessment</option>
              <option value="ACTIVE">Active</option>
              <option value="RESOURCES_ASSIGNED">Resources Assigned</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div style={{ width: 175 }}>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="Building Collapse">Building Collapse</option>
              <option value="Flash Flood">Flash Flood</option>
              <option value="Road Accident">Road Accident</option>
              <option value="Industrial Fire">Industrial Fire</option>
              <option value="Commercial Fire">Commercial Fire</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Chemical Leak">Chemical Leak</option>
              <option value="Structural Threat">Structural Threat</option>
            </select>
          </div>

          <button type="submit" className="btn btn-outline" style={{ height: 38 }}>
            <Filter size={14} />
            <span>Apply</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ height: 38 }}
            onClick={() => {
              setSearch('');
              setPriorityFilter('');
              setStatusFilter('');
              setTypeFilter('');
              fetchIncidentsData();
            }}
          >
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {errorMsg && (
        <div style={{ background: '#fee4e2', color: '#b42318', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="tactical-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>TITLE & TYPE</th>
                <th>LOCATION</th>
                <th>IMPACT (AFF / INJ / CAS)</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    Loading incident registry...
                  </td>
                </tr>
              ) : sortedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    No matching incidents found.
                  </td>
                </tr>
              ) : (
                sortedIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      <Link to={`/incidents/${inc.id}`} style={{ color: '#17263B', textDecoration: 'none' }}>
                        {inc.incident_code}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#101B2D' }}>{inc.title || inc.incident_type}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{inc.incident_type}</div>
                    </td>
                    <td>
                      <div>{inc.location}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <b>{inc.people_affected}</b> / {inc.injuries || 0} / <span style={{ color: inc.casualties ? '#DC3545' : 'inherit' }}>{inc.casualties || 0}</span>
                    </td>
                    <td>
                      <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
                    </td>
                    <td>
                      <StatusBadge status={inc.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link
                          to={`/allocation?incidentId=${inc.id}`}
                          title="Allocate Resource"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '5px 8px' }}
                        >
                          <ArrowRightLeft size={13} />
                        </Link>
                        <Link
                          to={`/incidents/${inc.id}`}
                          title="View Details"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 8px' }}
                        >
                          <Eye size={13} />
                        </Link>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setEditingIncident(inc)}
                              title="Edit Incident"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '5px 8px' }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(inc.id, inc.incident_code)}
                              title="Delete Incident"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '5px 8px', color: '#DC3545', borderColor: '#fca5a5' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchIncidentsData()}
      />

      <EditIncidentModal
        incident={editingIncident}
        onClose={() => setEditingIncident(null)}
        onUpdated={(updated) => setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
      />
    </div>
  );
};
