import React, { useEffect, useState } from 'react';
import { X, Edit3 } from 'lucide-react';
import { updateIncident } from '../services/api';
import { Incident, IncidentStatus } from '../types';

interface EditIncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdated: (incident: Incident) => void;
}

export const EditIncidentModal: React.FC<EditIncidentModalProps> = ({
  incident,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    incident_type: '',
    description: '',
    location: '',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 50,
    impact: 50,
    urgency: 50,
    vulnerability: 50,
    accessibility: 50,
    people_affected: 0,
    injuries: 0,
    casualties: 0,
    status: 'REPORTED' as IncidentStatus,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (incident) {
      setFormData({
        title: incident.title || '',
        incident_type: incident.incident_type,
        description: incident.description,
        location: incident.location,
        latitude: incident.latitude,
        longitude: incident.longitude,
        severity: incident.severity,
        impact: incident.impact,
        urgency: incident.urgency,
        vulnerability: incident.vulnerability,
        accessibility: incident.accessibility,
        people_affected: incident.people_affected,
        injuries: incident.injuries || 0,
        casualties: incident.casualties || 0,
        status: incident.status,
      });
      setErrorMsg(null);
    }
  }, [incident]);

  if (!incident) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const updated = await updateIncident(incident.id, {
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        people_affected: Number(formData.people_affected),
        injuries: Number(formData.injuries),
        casualties: Number(formData.casualties),
        severity: Number(formData.severity),
        impact: Number(formData.impact),
        urgency: Number(formData.urgency),
        vulnerability: Number(formData.vulnerability),
        accessibility: Number(formData.accessibility),
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: 660 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit3 color="#17263B" size={20} />
            <h3 style={{ fontSize: 18, color: '#101B2D' }}>Edit Incident ({incident.incident_code})</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Incident Title *</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid-2col" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Incident Type *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid-3col" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                >
                  <option value="REPORTED">Reported</option>
                  <option value="UNDER_ASSESSMENT">Under Assessment</option>
                  <option value="ACTIVE">Active</option>
                  <option value="RESOURCES_ASSIGNED">Resources Assigned</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="grid-3col" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">People Affected</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.people_affected}
                  onChange={(e) => setFormData({ ...formData, people_affected: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Injuries</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.injuries}
                  onChange={(e) => setFormData({ ...formData, injuries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Casualties</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.casualties}
                  onChange={(e) => setFormData({ ...formData, casualties: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#101B2D', marginBottom: 10 }}>
                Update Priority Factors (Auto-recalculates Score)
              </div>
              {(
                [
                  ['severity', 'Severity'],
                  ['impact', 'Impact'],
                  ['urgency', 'Urgency'],
                  ['vulnerability', 'Vulnerability'],
                  ['accessibility', 'Accessibility'],
                ] as const
              ).map(([key, label]) => (
                <div className="slider-group" key={key}>
                  <div className="slider-header">
                    <span>{label}</span>
                    <b>{formData[key]}</b>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="slider-input"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Recalculate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

