export type UserRole = 'Administrator' | 'Emergency Coordinator' | 'Resource Manager' | 'Viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface BootstrapStatus {
  has_users: boolean;
  has_admin: boolean;
}

export interface IncidentFactorBreakdown {
  factor_name: string;
  raw_value: number;
  weight_percentage: number;
  weighted_score: number;
}

export type IncidentStatus =
  | 'REPORTED'
  | 'UNDER_ASSESSMENT'
  | 'ACTIVE'
  | 'RESOURCES_ASSIGNED'
  | 'RESOLVED'
  | 'CLOSED';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface Incident {
  id: number;
  incident_code: string;
  title: string;
  incident_type: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: number;
  impact: number;
  urgency: number;
  vulnerability: number;
  accessibility: number;
  people_affected: number;
  injuries: number;
  casualties: number;
  status: IncidentStatus;
  priority_score: number;
  priority_level: PriorityLevel;
  last_recalculated_at?: string;
  created_at: string;
  updated_at: string;
  factor_contributions?: IncidentFactorBreakdown[];
  priority_explanation?: string;
}

export type ResourceType =
  | 'Ambulance'
  | 'Rescue Team'
  | 'Medical Unit'
  | 'Fire and Rescue Unit'
  | 'Emergency Supply Unit'
  | 'Shelter';

export type ResourceStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'DEPLOYED'
  | 'UNAVAILABLE'
  | 'UNDER_MAINTENANCE';

export interface Resource {
  id: number;
  resource_code: string;
  resource_type: ResourceType;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  availability_status: ResourceStatus;
  current_location: string;
  assigned_incident_id?: number | null;
  assigned_incident_code?: string | null;
  assigned_incident_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceRecommendationItem {
  incident_id: number;
  incident_priority_score: number;
  incident_priority_level: string;
  resource: Resource;
  resource_type: string;
  distance_km: number;
  accessibility_penalty: number;
  accessibility_consideration: string;
  compatibility_score: number;
  is_compatible: boolean;
  capacity_score: number;
  capacity_check: string;
  availability_status: string;
  overall_suitability_score: number;
  explanation: string;
}

export interface IncidentRecommendationResponse {
  incident: Incident;
  recommendations: ResourceRecommendationItem[];
  total_candidates_evaluated: number;
  compatible_available_count: number;
  decision_support_note: string;
}

export interface AllocationResponse {
  allocation_id: number;
  incident_id: number;
  incident_code: string;
  incident_status: string;
  resource_id: number;
  resource_code: string;
  resource_status: string;
  distance_km: number;
  suitability_score: number;
  decision_status: string;
  is_override: boolean;
  recommendation_reason?: string;
  decided_by?: string;
  allocated_at: string;
  released_at?: string | null;
  message: string;
}

export interface AllocationHistoryItem {
  id: number;
  incident_id: number;
  incident_code: string;
  incident_title: string;
  incident_location: string;
  resource_id: number;
  resource_code: string;
  resource_name: string;
  resource_type: string;
  distance_km: number;
  suitability_score: number;
  decision_status: string;
  status: string;
  is_override: boolean;
  decided_by?: string;
  recommendation_reason?: string;
  allocation_notes?: string;
  allocated_at: string;
  released_at?: string | null;
}

export interface FactorBreakdown {
  factor: string;
  value: number;
  weight_pct: number;
  contribution: number;
  description: string;
}

export interface PriorityCalculationResponse {
  priority_score: number;
  priority_level: PriorityLevel;
  severity_contribution: number;
  impact_contribution: number;
  urgency_contribution: number;
  vulnerability_contribution: number;
  accessibility_contribution: number;
  breakdown: FactorBreakdown[];
  explanation: string;
  formula_used: string;
  weights_applied: Record<string, number>;
  last_recalculated_at: string;
  disclaimer: string;
}

export interface PriorityWeights {
  id?: number;
  severity_weight: number;
  impact_weight: number;
  urgency_weight: number;
  vulnerability_weight: number;
  accessibility_weight: number;
  total_weight: number;
  is_active: boolean;
  updated_at?: string;
  label?: string;
}

export interface MetricCards {
  active_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  moderate_incidents: number;
  low_incidents: number;
  total_resources: number;
  available_resources: number;
  available_ambulances: number;
  available_rescue_teams: number;
  available_medical_units: number;
  deployed_resources: number;
  pending_resource_requests: number;
  average_priority_score: number;
  total_people_affected: number;
}

export interface ResourceTypeCount {
  resource_type: string;
  available: number;
  total: number;
  deployed: number;
  unavailable?: number;
}

export interface RecentAlert {
  id: number;
  timestamp: string;
  alert_type?: string;
  severity?: string;
  incident_code?: string;
  title: string;
  message?: string;
  priority_level: string;
  priority_score: number;
  location: string;
  status: string;
}

export interface RecommendedActionItem {
  incident_id: number;
  incident_code: string;
  incident_title: string;
  priority_level: string;
  priority_score: number;
  recommended_resource_id?: number;
  recommended_resource_code?: string;
  recommended_resource_name?: string;
  recommended_resource_type?: string;
  distance_km?: number;
  suitability_score?: number;
  rationale: string;
}

export interface DashboardSummaryResponse {
  metrics: MetricCards;
  prioritized_incidents: Incident[];
  resource_summary: ResourceTypeCount[];
  recent_alerts: RecentAlert[];
  recommended_actions: RecommendedActionItem[];
  incidents_by_type: { type: string; count: number }[];
  incidents_by_priority: { priority: string; count: number; color: string }[];
  resource_utilization: {
    resource_type: string;
    total: number;
    available: number;
    deployed: number;
    unavailable?: number;
    utilization_rate: number;
  }[];
  disclaimer: string;
}

export interface MapIncidentMarker {
  id: number;
  incident_code: string;
  title: string;
  incident_type: string;
  location: string;
  latitude: number;
  longitude: number;
  priority_score: number;
  priority_level: PriorityLevel;
  severity: number;
  people_affected: number;
  injuries: number;
  casualties: number;
  status: string;
}

export interface MapResourceMarker {
  id: number;
  resource_code: string;
  resource_type: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  availability_status: string;
  current_location: string;
  assigned_incident_id?: number | null;
  assigned_incident_code?: string | null;
}

export interface DashboardMapResponse {
  incidents: MapIncidentMarker[];
  resources: MapResourceMarker[];
  center_lat: number;
  center_lon: number;
  bounding_box_label: string;
}

export interface SimulationRequest {
  available_ambulances?: number;
  available_rescue_teams?: number;
  available_medical_units?: number;
  available_fire_rescue_units?: number;
  available_supply_units?: number;
  available_shelters?: number;
  unavailable_resource_ids?: number[];
  severity_weight?: number;
  impact_weight?: number;
  urgency_weight?: number;
  vulnerability_weight?: number;
  accessibility_weight?: number;
}

export interface SimulatedIncidentAllocation {
  incident_id: number;
  incident_code: string;
  title: string;
  incident_type: string;
  location: string;
  baseline_priority_score: number;
  simulated_priority_score: number;
  simulated_priority_level: string;
  assigned_resource_code?: string;
  assigned_resource_name?: string;
  assigned_resource_type?: string;
  distance_km?: number;
  suitability_score?: number;
  has_compatible_resource: boolean;
  status_note: string;
}

export interface ShortageWarning {
  resource_type: string;
  required_count: number;
  simulated_available: number;
  shortage_count: number;
  severity: string;
  message: string;
}

export interface SimulationResponse {
  is_simulation: boolean;
  database_modified: boolean;
  scenario_summary: string;
  simulated_fleet_counts: Record<string, number>;
  total_active_incidents: number;
  covered_incidents_count: number;
  unassigned_incidents_count: number;
  simulated_allocations: SimulatedIncidentAllocation[];
  unassigned_incidents: SimulatedIncidentAllocation[];
  shortage_warnings: ShortageWarning[];
  disclaimer: string;
}

export interface SystemAlert {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  incident_id?: number | null;
  resource_id?: number | null;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  user_id?: number | null;
  username: string;
  user_role: string;
  details: string;
  created_at: string;
}
