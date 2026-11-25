import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { PriorityEngine } from './pages/PriorityEngine';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { Allocation } from './pages/Allocation';
import { TacticalMapPage } from './pages/TacticalMapPage';
import { Analytics } from './pages/Analytics';
import { Simulation } from './pages/Simulation';
import { AlertsAndAudit } from './pages/AlertsAndAudit';
import { UserManagement } from './pages/UserManagement';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="priority" element={<PriorityEngine />} />
            <Route path="resources" element={<Resources />} />
            <Route path="resources/:id" element={<ResourceDetail />} />
            <Route path="allocation" element={<Allocation />} />
            <Route path="map" element={<TacticalMapPage />} />
            <Route
              path="simulation"
              element={
                <ProtectedRoute allowedRoles={['Administrator', 'Emergency Coordinator', 'Resource Manager']}>
                  <Simulation />
                </ProtectedRoute>
              }
            />
            <Route path="analytics" element={<Analytics />} />
            <Route path="alerts" element={<AlertsAndAudit />} />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['Administrator']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
