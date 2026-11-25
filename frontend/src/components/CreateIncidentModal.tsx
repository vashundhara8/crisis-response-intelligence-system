import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createIncident } from '../services/api';
import { Incident, IncidentStatus } from '../types';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    incident_type: 'Building Collapse',
    description: '',
    location: '',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 80,
    impact: 75,
    urgency: 85,
    vulnerability: 70,
    accessibility: 65,
    people_affected: 25,
    injuries: 0,
    casualties: 0,
    status: 'REPORTED' as IncidentStatus,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const estimatedScore = Math.round(
    formData.severity * 0.3 +
      formData.impact * 0.25 +
      formData.urgency * 0.2 +
      formData.vulnerability * 0.15 +
      formData.accessibility * 0.1
  );

  const estimatedTier =
    estimatedScore >= 80 ? 'CRITICAL' : estimatedScore >= 60 ? 'HIGH' : estimatedScore >= 40 ? 'MODERATE' : 'LOW';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const created = await createIncident({
        ...formData,
        title: formData.title.trim() || `${formData.incident_type} — ${formData.location}`,
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
      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to register incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: 660 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle color="#DC3545" size={22} />
            <h3 style={{ fontSize: 18, color: '#101B2D' }}>Report Emergency Incident</h3>
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
                placeholder="e.g. Warehouse Chemical Fire in Peenya Sector 2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid-2col" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Incident Type *</label>
                <select
                  className="form-select"
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  required
                >
                  <option value="Building Collapse">Building Collapse</option>
                  <option value="Flash Flood">Flash Flood</option>
                  <option value="Road Accident">Road Accident</option>
                  <option value="Industrial Fire">Industrial Fire</option>
                  <option value="Commercial Fire">Commercial Fire</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Chemical Leak">Chemical Leak</option>
                  <option value="Structural Threat">Structural Threat</option>
                  <option value="Power Substation Surge">Power Substation Surge</option>
                  <option value="Urban Waterlogging">Urban Waterlogging</option>
                  <option value="Landslide / Tree Fall">Landslide / Tree Fall</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Address / Location *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Peenya 2nd Stage, Bengaluru"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Operational Description *</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Details of hazard, trapped individuals, road blockages..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid-3col" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Latitude *</label>
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
                <label className="form-label">Longitude *</label>
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
                <label className="form-label">Initial Status *</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                >
                  <option value="REPORTED">Reported</option>
                  <option value="UNDER_ASSESSMENT">Under Assessment</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
            </div>

            <div className="grid-3col" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">People Affected *</label>
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

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 14, borderRadius: 8, marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#101B2D' }}>Priority Factors (0 - 100)</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: estimatedTier === 'CRITICAL' ? '#fee4e2' : estimatedTier === 'HIGH' ? '#fef0c7' : '#e0f2fe',
                    color: estimatedTier === 'CRITICAL' ? '#DC3545' : estimatedTier === 'HIGH' ? '#F59E0B' : '#3B82F6',
                  }}
                >
                  EST. {estimatedScore} / 100 ({estimatedTier})
                </span>
              </div>

              {(
                [
                  ['severity', 'Severity (Hazard Intensity)'],
                  ['impact', 'Impact (Population Exposure)'],
                  ['urgency', 'Urgency (Time Criticality)'],
                  ['vulnerability', 'Vulnerability (At-Risk Groups)'],
                  ['accessibility', 'Accessibility (Ingress Feasibility)'],
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
              {isSubmitting ? 'Registering...' : 'Register Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
