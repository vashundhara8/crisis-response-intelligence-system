import React, { useEffect, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { getDashboardMapData } from '../services/api';
import { DashboardMapResponse } from '../types';
import { TacticalMap } from '../map/TacticalMap';

export const TacticalMapPage: React.FC = () => {
  const [mapData, setMapData] = useState<DashboardMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);

  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [resourceStatusFilter, setResourceStatusFilter] = useState<string>('');
  const [showResources, setShowResources] = useState(true);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardMapData();
      setMapData(data);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  const filteredIncidents = (mapData?.incidents || []).filter((inc) => {
    if (priorityFilter && inc.priority_level !== priorityFilter) return false;
    if (statusFilter && inc.status !== statusFilter) return false;
    return true;
  });

  const filteredResources = !showResources
    ? []
    : (mapData?.resources || []).filter((res) => {
        if (resourceTypeFilter && res.resource_type !== resourceTypeFilter) return false;
        if (resourceStatusFilter && res.availability_status !== resourceStatusFilter) return false;
        return true;
      });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Tactical Emergency Situation Map</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Interactive OpenStreetMap overlay using stored incident & resource coordinates
          </p>
        </div>

        <button className="btn btn-outline" onClick={fetchMapData}>
          <RefreshCw size={15} />
          <span>Refresh Map Data</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card-section" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#101B2D', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} />
              <span>Map Filters:</span>
            </span>

            <select className="form-select" style={{ width: 155 }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>

            <select className="form-select" style={{ width: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Incident Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="UNDER_ASSESSMENT">Under Assessment</option>
              <option value="ACTIVE">Active</option>
              <option value="RESOURCES_ASSIGNED">Resources Assigned</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select className="form-select" style={{ width: 175 }} value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}>
              <option value="">All Resource Types</option>
              <option value="Ambulance">Ambulances</option>
              <option value="Rescue Team">Rescue Teams</option>
              <option value="Medical Unit">Medical Units</option>
              <option value="Fire and Rescue Unit">Fire & Rescue Units</option>
              <option value="Emergency Supply Unit">Emergency Supply Units</option>
              <option value="Shelter">Shelters</option>
            </select>

            <select className="form-select" style={{ width: 165 }} value={resourceStatusFilter} onChange={(e) => setResourceStatusFilter(e.target.value)}>
              <option value="">All Unit Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={showResources} onChange={(e) => setShowResources(e.target.checked)} />
              <span>Show Resources</span>
            </label>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            Plotted: <b>{filteredIncidents.length}</b> incidents • <b>{filteredResources.length}</b> resources
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ gridTemplateColumns: '1fr 3fr' }}>
        <div className="card-section" style={{ maxHeight: 620, overflowY: 'auto', padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#101B2D', marginBottom: 10 }}>
            Click to Highlight Incident
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncidentId(selectedIncidentId === inc.id ? null : inc.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: selectedIncidentId === inc.id ? '2px solid #101B2D' : '1px solid #e2e8f0',
                  background: selectedIncidentId === inc.id ? '#eff6ff' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  <span>{inc.incident_code}</span>
                  <span style={{ color: inc.priority_level === 'CRITICAL' ? '#DC3545' : '#F59E0B' }}>
                    {inc.priority_level} ({inc.priority_score})
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#101B2D', marginTop: 2 }}>{inc.title || inc.incident_type}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{inc.location}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
          {loading && !mapData ? (
            <div style={{ height: 620, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
              Loading tactical GIS map...
            </div>
          ) : (
            <TacticalMap
              incidents={filteredIncidents}
              resources={filteredResources}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              height="620px"
              showResources={showResources}
            />
          )}
        </div>
      </div>
    </div>
  );
};
