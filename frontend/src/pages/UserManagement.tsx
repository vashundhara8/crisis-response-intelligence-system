import React, { useEffect, useState } from 'react';
import { Users, UserPlus, RefreshCw } from 'lucide-react';
import { listUsers, registerUser, updateUserRole, updateUserStatus } from '../services/api';
import { User, UserRole } from '../types';

const ROLES: UserRole[] = ['Administrator', 'Emergency Coordinator', 'Resource Manager', 'Viewer'];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'Emergency Coordinator' as UserRole });
  const [msg, setMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await registerUser(form);
      setMsg(`Created user '${form.username}' (${form.role}).`);
      setForm({ username: '', email: '', full_name: '', password: '', role: 'Emergency Coordinator' });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create user.');
    }
  };

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      const updated = await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update role.');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      const updated = await updateUserStatus(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Access Control & RBAC User Management</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Administrator console for provisioning emergency operators and enforcing role permissions
          </p>
        </div>
        <button className="btn btn-outline" onClick={loadUsers}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title"><Users size={18} color="#17263B" /><span>Registered Personnel ({users.length})</span></div>
          </div>

          <div className="table-responsive">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>USERNAME</th>
                  <th>FULL NAME</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.username}</b>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td>{u.full_name}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: 185, padding: '4px 8px', fontSize: 12 }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="card-section" onSubmit={handleCreateUser}>
          <div className="section-header">
            <div className="section-title"><UserPlus size={18} color="#17263B" /><span>Provision New Operator</span></div>
          </div>

          {msg && (
            <div style={{ background: '#ecfdf3', color: '#16A34A', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
              {msg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input type="text" className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Official Email *</label>
            <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Operational Role *</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password (min 8 chars) *</label>
            <input type="password" minLength={8} className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Create Authorized Account
          </button>
        </form>
      </div>
    </div>
  );
};

