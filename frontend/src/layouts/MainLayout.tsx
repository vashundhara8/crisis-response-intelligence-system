import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertOctagon,
  Cpu,
  Truck,
  ArrowRightLeft,
  MapPin,
  BarChart3,
  RotateCcw,
  ShieldAlert,
  Info,
  FlaskConical,
  Bell,
  Users,
  LogOut,
} from 'lucide-react';
import { resetDemonstrationData } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/incidents/')) return 'Incident Deep Inspection';
    if (path.startsWith('/resources/')) return 'Resource Unit Dossier';
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Crisis Command Dashboard';
      case '/incidents':
        return 'Emergency Incident Registry';
      case '/priority':
        return 'Intelligent Priority Engine';
      case '/resources':
        return 'Emergency Resource Fleet';
      case '/allocation':
        return 'Resource Allocation Station';
      case '/map':
        return 'Tactical Situation Map (Bengaluru)';
      case '/simulation':
        return 'What-If Resource Shortage Simulation';
      case '/analytics':
        return 'Operational Analytics & Reports';
      case '/alerts':
        return 'System Alerts & Audit Logs';
      case '/users':
        return 'Access Control & User Roles';
      default:
        return 'Crisis Response Intelligence System';
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset simulated Bengaluru demonstration data? This restores initial incidents and resources.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetDemonstrationData();
      setResetMessage('Simulated dataset reset successfully.');
      setTimeout(() => {
        setResetMessage(null);
        window.location.reload();
      }, 900);
    } catch {
      alert('Failed to reset dataset. Administrator permission required.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="tactical-sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="brand-title">CRIS EOC</div>
            <div className="brand-sub">Command & Control</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/incidents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <AlertOctagon size={18} />
            <span>Incident Registry</span>
          </NavLink>

          <NavLink to="/priority" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Cpu size={18} />
            <span>Priority Engine</span>
          </NavLink>

          <NavLink to="/resources" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Emergency Fleet</span>
          </NavLink>

          <NavLink to="/allocation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ArrowRightLeft size={18} />
            <span>Resource Allocation</span>
          </NavLink>

          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MapPin size={18} />
            <span>Tactical Map</span>
          </NavLink>

          {hasRole('Administrator', 'Emergency Coordinator', 'Resource Manager') && (
            <NavLink to="/simulation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FlaskConical size={18} />
              <span>What-If Simulation</span>
            </NavLink>
          )}

          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>Analytics & Reports</span>
          </NavLink>

          <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bell size={18} />
            <span>Alerts & Audit Logs</span>
          </NavLink>

          {hasRole('Administrator') && (
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Access Control</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 4,
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 12.5 }}>{user.full_name}</div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>{user.role}</div>
            </div>
          )}

          {hasRole('Administrator') && (
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="btn btn-outline btn-sm"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)', width: '100%' }}
            >
              <RotateCcw size={14} />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ color: '#fda29b', borderColor: 'rgba(220, 53, 69, 0.35)', width: '100%' }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            v2.0 • FastAPI + React + PostGIS + Alembic
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="tactical-header">
          <div className="header-left">
            <div className="header-title">
              <h1>{getPageTitle()}</h1>
              <p>Crisis Response Intelligence System • Government-Grade Decision-Support Platform</p>
            </div>
          </div>

          <div className="header-badges">
            {resetMessage && (
              <span className="badge-pill" style={{ background: '#ecfdf3', color: '#16A34A' }}>
                {resetMessage}
              </span>
            )}
            <span className="badge-pill badge-simulated">
              <span className="pulse-dot" />
              Simulated Bengaluru Data
            </span>
            <span className="badge-pill badge-academic">
              Decision Support Only
            </span>
          </div>
        </header>

        <main className="page-content">
          <Outlet />

          <div className="decision-support-banner">
            <Info size={20} color="#17263B" style={{ flexShrink: 0 }} />
            <div>
              <b>System Notice:</b> This is a decision-support prototype for prioritizing simultaneous incidents and recommending resource allocation—not a medically validated triage system or autonomous dispatch controller. Authorized human emergency coordinators retain final decision-making authority.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
