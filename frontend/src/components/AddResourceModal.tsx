import React, { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { createResource } from '../services/api';
import { Resource, ResourceStatus, ResourceType } from '../types';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (res: Resource) => void;
}

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [formData, setFormData] = useState({
    resource_type: 'Ambulance' as ResourceType,
    name: '',
    latitude: 12.9716,
    longitude: 77.5946,
    capacity: 4,
    availability_status: 'AVAILABLE' as ResourceStatus,
    current_location: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const created = await createResource({
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        capacity: Number(formData.capacity),
      });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to register emergency resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck color="#17263B" size={22} />
            <h3 style={{ fontSize: 18, color: '#101B2D' }}>Register Emergency Fleet Unit</h3>
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

            <div className="grid-2col" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Resource Type *</label>
                <select
                  className="form-select"
                  value={formData.resource_type}
                  onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as ResourceType })}
                  required
                >
                  <option value="Ambulance">Ambulance</option>
                  <option value="Rescue Team">Rescue Team</option>
                  <option value="Medical Unit">Medical Unit</option>
                  <option value="Fire and Rescue Unit">Fire and Rescue Unit</option>
                  <option value="Emergency Supply Unit">Emergency Supply Unit</option>
                  <option value="Shelter">Shelter</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unit / Asset Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ALS Rapid Transit A-06"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid-2col" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Base Depot / Location *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Malleshwaram Disaster HQ"
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Availability Status</label>
                <select
                  className="form-select"
                  value={formData.availability_status}
                  onChange={(e) => setFormData({ ...formData, availability_status: e.target.value as ResourceStatus })}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="DEPLOYED">Deployed</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                </select>
              </div>
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
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
