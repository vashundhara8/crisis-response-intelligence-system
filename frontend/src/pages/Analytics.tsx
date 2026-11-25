import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Activity,
  Users,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getAnalyticsOverview, downloadAnalyticsCsv } from '../services/api';
import { StatCard } from '../components/StatCard';
import { PriorityDistributionChart } from '../charts/PriorityDistributionChart';
import { IncidentTypeChart } from '../charts/IncidentTypeChart';
import { ResourceUtilizationChart } from '../charts/ResourceUtilizationChart';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [incidentType, setIncidentType] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalyticsOverview({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        incident_type: incidentType || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCsv = async () => {
    try {
      const blob = await downloadAnalyticsCsv({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        incident_type: incidentType || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cris_incidents_analytics.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Operational Analytics & Command Reports</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Real-time statistics derived strictly from stored incidents, allocations, and fleet records
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={fetchAnalytics}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportCsv}>
            <Download size={15} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-section" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 160 }}>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label className="form-label">Incident Type Filter</label>
            <select className="form-select" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              <option value="">All Incident Types</option>
              <option value="Building Collapse">Building Collapse</option>
              <option value="Flash Flood">Flash Flood</option>
              <option value="Road Accident">Road Accident</option>
              <option value="Industrial Fire">Industrial Fire</option>
              <option value="Commercial Fire">Commercial Fire</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Chemical Leak">Chemical Leak</option>
              <option value="Structural Threat">Structural Threat</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchAnalytics}>Apply Filters</button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setIncidentType('');
              setTimeout(fetchAnalytics, 0);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stats-grid">
        <StatCard title="Filtered Incidents" value={data?.total_incidents ?? 0} subtext="Stored incident records" color="blue" icon={<Activity size={18} color="#3B82F6" />} />
        <StatCard title="Avg Priority Score" value={`${data?.average_priority_score ?? 0} / 100`} subtext="Mean weighted score" color="red" icon={<TrendingUp size={18} color="#DC3545" />} />
        <StatCard title="People Affected" value={data?.total_people_affected ?? 0} subtext={`${data?.total_injuries ?? 0} injuries • ${data?.total_casualties ?? 0} casualties`} color="orange" icon={<Users size={18} color="#F59E0B" />} />
        <StatCard title="Resolution Rate" value={`${data?.resolution_stats?.resolution_rate_pct ?? 0}%`} subtext={`${data?.resolution_stats?.resolved_or_closed ?? 0} resolved or closed`} color="green" icon={<CheckCircle2 size={18} color="#16A34A" />} />
        <StatCard title="Allocation Records" value={data?.allocation_stats?.total_records ?? 0} subtext={`${data?.allocation_stats?.active_allocations ?? 0} active • Avg ${data?.allocation_stats?.average_dispatch_distance_km ?? 0} km`} color="slate" icon={<ShieldCheck size={18} color="#64748b" />} />
      </div>

      {/* Charts */}
      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title"><BarChart3 size={18} color="#17263B" /><span>Incidents by Priority Tier</span></div>
          </div>
          {data && <PriorityDistributionChart data={data.incidents_by_priority || []} />}
        </div>

        <div className="card-section">
          <div className="section-header">
            <div className="section-title"><PieIcon size={18} color="#17263B" /><span>Incidents by Type</span></div>
          </div>
          {data && <IncidentTypeChart data={data.incidents_by_type || []} />}
        </div>
      </div>

      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title"><Activity size={18} color="#17263B" /><span>Incident Status Distribution</span></div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data?.incidents_by_status || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#17263B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-section">
          <div className="section-header">
            <div className="section-title"><ShieldCheck size={18} color="#17263B" /><span>Fleet Utilization</span></div>
          </div>
          {data && <ResourceUtilizationChart data={data.resource_utilization || []} />}
        </div>
      </div>

      {/* Shortage Indicators */}
      <div className="card-section">
        <div className="section-header">
          <div className="section-title"><AlertTriangle size={18} color="#F59E0B" /><span>Resource Shortage Indicators</span></div>
        </div>
        {!data?.shortage_indicators?.length ? (
          <div style={{ color: '#16A34A', fontSize: 13, fontWeight: 600 }}>
            All emergency fleet categories currently have healthy reserve availability.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.shortage_indicators.map((s: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: s.status === 'CRITICAL_SHORTAGE' ? '#fee4e2' : '#fef0c7',
                  color: s.status === 'CRITICAL_SHORTAGE' ? '#991b1b' : '#92400e',
                  fontSize: 13,
                }}
              >
                <b>{s.resource_type} ({s.status.replace('_', ' ')}):</b> {s.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
