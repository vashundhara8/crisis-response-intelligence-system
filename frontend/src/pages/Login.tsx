import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, UserPlus, LogIn, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBootstrapStatus } from '../services/api';

export const Login: React.FC = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasUsers, setHasUsers] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    getBootstrapStatus()
      .then((res) => {
        setHasUsers(res.has_users);
        if (!res.has_users) {
          setMode('register');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(username.trim(), password);
        navigate('/dashboard', { replace: true });
      } else {
        const created = await register({
          username: username.trim(),
          email: email.trim(),
          full_name: fullName.trim(),
          password,
        });
        setSuccess(`Account '${created.username}' created with role '${created.role}'. You may now sign in.`);
        setMode('login');
        setPassword('');
        setHasUsers(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Check credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b1424 0%, #101B2D 55%, #17263B 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            background: '#101B2D',
            color: '#ffffff',
            padding: '24px 28px',
            borderBottom: '3px solid #DC3545',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(220, 53, 69, 0.18)',
              border: '1px solid #DC3545',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC3545',
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', letterSpacing: 0.4 }}>
              CRIS COMMAND PORTAL
            </h1>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Crisis Response Intelligence System • Authorized Access
            </p>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          {!hasUsers && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e3a8a',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                marginBottom: 16,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                First-time setup detected: register the initial account below to become the system <b>Administrator</b>.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
            >
              <UserPlus size={15} />
              <span>{hasUsers ? 'Register Viewer' : 'Bootstrap Admin'}</span>
            </button>
          </div>

          {error && (
            <div style={{ background: '#fee4e2', color: '#b42318', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#ecfdf3', color: '#027a48', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter operator username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ananya Rao"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="operator@agency.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter password'}
                minLength={mode === 'register' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '11px 16px', marginTop: 6 }}
            >
              <Lock size={15} />
              <span>{submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to Operations Console' : 'Create Account'}</span>
            </button>
          </form>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0', fontSize: 11.5, color: '#64748b' }}>
            <b>Role-Based Access Control:</b> Administrator, Emergency Coordinator, Resource Manager, Viewer.
            Academic decision-support prototype — simulated operational data only.
          </div>
        </div>
      </div>
    </div>
  );
};

