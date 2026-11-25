import React, { useEffect, useState } from 'react';
import { Bell, Shield, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAlerts, resolveAlert, getAuditLogs } from '../services/api';
import { SystemAlert, AuditLogEntry } from '../types';
import { useAuth } from '../context/AuthContext';

export const AlertsAndAudit: React.FC = () => {
  const { hasRole } = useAuth();
  const canResolve = hasRole('Administrator', 'Emergency Coordinator', 'Resource Manager');
  const canViewAudit = hasRole('Administrator', 'Emergency Coordinator');

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const alertList = await getAlerts(includeResolved);
      setAlerts(alertList);
      if (canViewAudit) {
        const logs = await getAuditLogs({ action: actionFilter || undefined, limit: 100 });
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Failed to load alerts/audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [includeResolved]);

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve alert');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Operational Alerts & Audit Trail</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Automated critical incident, shortage, and unavailable unit alerts with immutable audit logging
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
            <span>Show Resolved Alerts</span>
          </label>
          <button className="btn btn-outline" onClick={loadData}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="card-section">
        <div className="section-header">
          <div className="section-title">
            <Bell size={18} color="#DC3545" />
            <span>Active Operational Alerts ({alerts.length})</span>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
            No matching system alerts.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((al) => (
              <div
                key={al.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: al.is_resolved ? '#f8fafc' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${al.is_resolved ? '#94a3b8' : al.severity === 'CRITICAL' ? '#DC3545' : al.severity === 'HIGH' ? '#F59E0B' : '#3B82F6'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      {al.alert_type}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(al.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#101B2D' }}>{al.title}</div>
                  <div style={{ fontSize: 12.5, color: '#475569' }}>{al.message}</div>
                </div>

                <div>
                  {al.is_resolved ? (
                    <span style={{ fontSize: 11.5, color: '#16A34A', fontWeight: 700 }}>Resolved</span>
                  ) : (
                    canResolve && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleResolve(al.id)}>
                        <CheckCircle2 size={14} />
                        <span>Acknowledge</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Logs Section */}
      {canViewAudit && (
        <div className="card-section">
          <div className="section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="section-title">
              <Shield size={18} color="#17263B" />
              <span>System Audit Log</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                style={{ width: 220 }}
                placeholder="Filter by action (e.g. INCIDENT, ALLOCATION)"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
              <button className="btn btn-outline btn-sm" onClick={loadData}>Filter</button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>USER (ROLE)</th>
                  <th>ACTION</th>
                  <th>ENTITY</th>
                  <th>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No audit entries found.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <b>{log.username}</b>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>{log.user_role}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700 }}>{log.action}</td>
                      <td style={{ fontSize: 12 }}>{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                      <td style={{ fontSize: 12.5, color: '#334155' }}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

