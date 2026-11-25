import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit3,
  Eye,
} from 'lucide-react';
import { getResources, deleteResource, updateResource } from '../services/api';
import { Resource, ResourceStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AddResourceModal } from '../components/AddResourceModal';
import { EditResourceModal } from '../components/EditResourceModal';
import { useAuth } from '../context/AuthContext';

export const Resources: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('Administrator', 'Resource Manager', 'Emergency Coordinator');
  const canDelete = hasRole('Administrator', 'Resource Manager');

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deployedOnly, setDeployedOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await getResources({
        search: search || undefined,
        resource_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handleStatusUpdate = async (res: Resource, nextStatus: ResourceStatus) => {
    try {
      const updated = await updateResource(res.id, { availability_status: nextStatus });
      setResources((prev) => prev.map((r) => (r.id === res.id ? updated : r)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update resource status.');
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!window.confirm(`Delete resource ${code}?`)) return;
    try {
      await deleteResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete resource.');
    }
  };

  const visibleResources = deployedOnly
    ? resources.filter((r) => r.availability_status === 'DEPLOYED' || r.availability_status === 'ASSIGNED')
    : resources;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Emergency Resource Fleet</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Manage Ambulances, Rescue Teams, Medical Units, Fire & Rescue, Emergency Supplies, and Shelters
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${deployedOnly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDeployedOnly(!deployedOnly)}
          >
            <span>{deployedOnly ? 'Showing Deployed Units' : 'View Deployed Only'}</span>
          </button>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
              <PlusCircle size={16} />
              <span>Register Fleet Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card-section" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search resource name, code, or base station..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: 195 }}>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Resource Types</option>
              <option value="Ambulance">Ambulances</option>
              <option value="Rescue Team">Rescue Teams</option>
              <option value="Medical Unit">Medical Units</option>
              <option value="Fire and Rescue Unit">Fire & Rescue Units</option>
              <option value="Emergency Supply Unit">Emergency Supply Units</option>
              <option value="Shelter">Shelters</option>
            </select>
          </div>

          <div style={{ width: 185 }}>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
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
              setTypeFilter('');
              setStatusFilter('');
              setDeployedOnly(false);
              fetchResources();
            }}
          >
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {/* Fleet Table */}
      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="tactical-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>TYPE & ASSET NAME</th>
                <th>LOCATION</th>
                <th>CAPACITY</th>
                <th>STATUS</th>
                <th>ASSIGNED INCIDENT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    Loading fleet assets...
                  </td>
                </tr>
              ) : visibleResources.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    No matching resources found.
                  </td>
                </tr>
              ) : (
                visibleResources.map((res) => (
                  <tr key={res.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      <Link to={`/resources/${res.id}`} style={{ color: '#17263B', textDecoration: 'none' }}>
                        {res.resource_code}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#101B2D' }}>{res.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{res.resource_type}</div>
                    </td>
                    <td>
                      <div>{res.current_location}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {res.latitude.toFixed(4)}°N, {res.longitude.toFixed(4)}°E
                      </div>
                    </td>
                    <td><b>{res.capacity}</b> units</td>
                    <td><StatusBadge status={res.availability_status} /></td>
                    <td>
                      {res.assigned_incident_id ? (
                        <Link
                          to={`/incidents/${res.assigned_incident_id}`}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#3B82F6', textDecoration: 'none' }}
                        >
                          {res.assigned_incident_code || `INC-${res.assigned_incident_id}`}
                        </Link>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canManage && (
                          <select
                            className="form-select"
                            style={{ width: 135, padding: '4px 8px', fontSize: 11 }}
                            value={res.availability_status}
                            onChange={(e) => handleStatusUpdate(res, e.target.value as ResourceStatus)}
                          >
                            <option value="AVAILABLE">Available</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="DEPLOYED">Deployed</option>
                            <option value="UNAVAILABLE">Unavailable</option>
                            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                          </select>
                        )}
                        <Link to={`/resources/${res.id}`} className="btn btn-outline btn-sm" style={{ padding: '5px 8px' }} title="View Detail">
                          <Eye size={13} />
                        </Link>
                        {canManage && (
                          <button
                            onClick={() => setEditingResource(res)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Edit Resource"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(res.id, res.resource_code)}
                            title="Delete Resource"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px', color: '#DC3545', borderColor: '#fca5a5' }}
                          >
                            <Trash2 size={13} />
                          </button>
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

      <AddResourceModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onCreated={() => fetchResources()} />
      <EditResourceModal
        resource={editingResource}
        onClose={() => setEditingResource(null)}
        onUpdated={(updated) => setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
      />
    </div>
  );
};
