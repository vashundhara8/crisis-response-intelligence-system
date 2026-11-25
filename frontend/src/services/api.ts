import axios from 'axios';
import {
  Incident,
  Resource,
  DashboardSummaryResponse,
  DashboardMapResponse,
  IncidentRecommendationResponse,
  AllocationResponse,
  AllocationHistoryItem,
  PriorityCalculationResponse,
  PriorityWeights,
  TokenResponse,
  User,
  BootstrapStatus,
  SimulationRequest,
  SimulationResponse,
  SystemAlert,
  AuditLogEntry,
} from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';
const TOKEN_STORAGE_KEY = 'cris_auth_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('cris:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY);

// Auth & RBAC APIs
export const getBootstrapStatus = async (): Promise<BootstrapStatus> => {
  const res = await apiClient.get<BootstrapStatus>('/auth/bootstrap-status');
  return res.data;
};

export const loginUser = async (data: { username: string; password: string }): Promise<TokenResponse> => {
  const res = await apiClient.post<TokenResponse>('/auth/login', data);
  return res.data;
};

export const registerUser = async (data: {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role?: string;
}): Promise<User> => {
  const res = await apiClient.post<User>('/auth/register', data);
  return res.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
};

export const listUsers = async (): Promise<User[]> => {
  const res = await apiClient.get<User[]>('/auth/users');
  return res.data;
};

export const updateUserRole = async (userId: number, role: string): Promise<User> => {
  const res = await apiClient.put<User>(`/auth/users/${userId}/role`, { role });
  return res.data;
};

export const updateUserStatus = async (userId: number, is_active: boolean): Promise<User> => {
  const res = await apiClient.put<User>(`/auth/users/${userId}/status`, { is_active });
  return res.data;
};

// Dashboard APIs
export const getDashboardSummary = async (): Promise<DashboardSummaryResponse> => {
  const res = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary');
  return res.data;
};

export const getDashboardMapData = async (): Promise<DashboardMapResponse> => {
  const res = await apiClient.get<DashboardMapResponse>('/dashboard/map');
  return res.data;
};

export const resetDemonstrationData = async (): Promise<{ message: string }> => {
  const res = await apiClient.post<{ message: string }>('/dashboard/reset-demo');
  return res.data;
};

// Incidents APIs
export const getIncidents = async (params?: {
  priority?: string;
  status?: string;
  incident_type?: string;
  search?: string;
}): Promise<Incident[]> => {
  const res = await apiClient.get<Incident[]>('/incidents', { params });
  return res.data;
};

export const getPrioritizedIncidents = async (limit = 20): Promise<Incident[]> => {
  const res = await apiClient.get<Incident[]>('/incidents/prioritized', { params: { limit } });
  return res.data;
};

export const getIncidentById = async (id: number): Promise<Incident> => {
  const res = await apiClient.get<Incident>(`/incidents/${id}`);
  return res.data;
};

export const createIncident = async (data: Partial<Incident>): Promise<Incident> => {
  const res = await apiClient.post<Incident>('/incidents', data);
  return res.data;
};

export const updateIncident = async (id: number, data: Partial<Incident>): Promise<Incident> => {
  const res = await apiClient.put<Incident>(`/incidents/${id}`, data);
  return res.data;
};

export const deleteIncident = async (id: number): Promise<void> => {
  await apiClient.delete(`/incidents/${id}`);
};

// Resources APIs
export const getResources = async (params?: {
  resource_type?: string;
  status?: string;
  search?: string;
}): Promise<Resource[]> => {
  const res = await apiClient.get<Resource[]>('/resources', { params });
  return res.data;
};

export const getAvailableResources = async (resource_type?: string): Promise<Resource[]> => {
  const res = await apiClient.get<Resource[]>('/resources/available', { params: { resource_type } });
  return res.data;
};

export const getDeployedResources = async (): Promise<Resource[]> => {
  const res = await apiClient.get<Resource[]>('/resources/deployed');
  return res.data;
};

export const getResourceById = async (id: number): Promise<Resource> => {
  const res = await apiClient.get<Resource>(`/resources/${id}`);
  return res.data;
};

export const getResourceDetail = async (id: number): Promise<{ resource: Resource; allocation_history: any[] }> => {
  const res = await apiClient.get(`/resources/${id}/detail`);
  return res.data;
};

export const createResource = async (data: Partial<Resource>): Promise<Resource> => {
  const res = await apiClient.post<Resource>('/resources', data);
  return res.data;
};

export const updateResource = async (id: number, data: Partial<Resource>): Promise<Resource> => {
  const res = await apiClient.put<Resource>(`/resources/${id}`, data);
  return res.data;
};

export const deleteResource = async (id: number): Promise<void> => {
  await apiClient.delete(`/resources/${id}`);
};

// Allocation APIs
export const getResourceRecommendation = async (incidentId: number): Promise<IncidentRecommendationResponse> => {
  const res = await apiClient.get<IncidentRecommendationResponse>(`/allocation/recommend/${incidentId}`);
  return res.data;
};

export const executeAllocation = async (data: {
  incident_id: number;
  resource_id: number;
  action?: 'ACCEPT' | 'REJECT' | 'OVERRIDE';
  is_override?: boolean;
  notes?: string;
}): Promise<AllocationResponse> => {
  const res = await apiClient.post<AllocationResponse>('/allocation', data);
  return res.data;
};

export const releaseAllocation = async (allocationId: number): Promise<AllocationResponse> => {
  const res = await apiClient.post<AllocationResponse>(`/allocation/${allocationId}/release`);
  return res.data;
};

export const getAllocationHistory = async (limit = 100): Promise<AllocationHistoryItem[]> => {
  const res = await apiClient.get<AllocationHistoryItem[]>('/allocation/history', { params: { limit } });
  return res.data;
};

// Priority Engine APIs
export const calculatePriority = async (data: {
  severity: number;
  impact: number;
  urgency: number;
  vulnerability: number;
  accessibility: number;
}): Promise<PriorityCalculationResponse> => {
  const res = await apiClient.post<PriorityCalculationResponse>('/priority/calculate', data);
  return res.data;
};

export const getPriorityWeights = async (): Promise<PriorityWeights> => {
  const res = await apiClient.get<PriorityWeights>('/priority/weights');
  return res.data;
};

export const updatePriorityWeights = async (data: {
  severity_weight: number;
  impact_weight: number;
  urgency_weight: number;
  vulnerability_weight: number;
  accessibility_weight: number;
}): Promise<PriorityWeights> => {
  const res = await apiClient.put<PriorityWeights>('/priority/weights', data);
  return res.data;
};

// Simulation APIs
export const runSimulation = async (data: SimulationRequest): Promise<SimulationResponse> => {
  const res = await apiClient.post<SimulationResponse>('/simulation/run', data);
  return res.data;
};

// Analytics APIs
export const getAnalyticsOverview = async (params?: {
  start_date?: string;
  end_date?: string;
  incident_type?: string;
}): Promise<any> => {
  const res = await apiClient.get('/analytics/overview', { params });
  return res.data;
};

export const downloadAnalyticsCsv = async (params?: {
  start_date?: string;
  end_date?: string;
  incident_type?: string;
}): Promise<Blob> => {
  const res = await apiClient.get('/analytics/export-csv', { params, responseType: 'blob' });
  return res.data;
};

// Alerts & Audit Logs APIs
export const getAlerts = async (includeResolved = false): Promise<SystemAlert[]> => {
  const res = await apiClient.get<SystemAlert[]>('/alerts', { params: { include_resolved: includeResolved } });
  return res.data;
};

export const resolveAlert = async (alertId: number): Promise<SystemAlert> => {
  const res = await apiClient.post<SystemAlert>(`/alerts/${alertId}/resolve`);
  return res.data;
};

export const getAuditLogs = async (params?: {
  action?: string;
  entity_type?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> => {
  const res = await apiClient.get<AuditLogEntry[]>('/audit-logs', { params });
  return res.data;
};

export default apiClient;
