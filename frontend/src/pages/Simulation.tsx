import React, { useEffect, useState } from 'react';
import { FlaskConical, AlertTriangle, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { getResources, runSimulation } from '../services/api';
import { Resource, SimulationResponse } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

export const Simulation: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [ambulances, setAmbulances] = useState(3);
  const [rescueTeams, setRescueTeams] = useState(3);
  const [medicalUnits, setMedicalUnits] = useState(3);
  const [fireUnits, setFireUnits] = useState(1);
  const [supplyUnits, setSupplyUnits] = useState(1);
  const [shelters, setShelters] = useState(2);
  const [unavailableIds, setUnavailableIds] = useState<number[]>([]);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [running, setRunning] = useState(false);

  const loadBaseline = async () => {
    try {
      const resList = await getResources();
      setResources(resList);
      const avail = resList.filter((r) => r.availability_status === 'AVAILABLE');
      setAmbulances(avail.filter((r) => r.resource_type === 'Ambulance').length);
      setRescueTeams(avail.filter((r) => r.resource_type === 'Rescue Team').length);
      setMedicalUnits(avail.filter((r) => r.resource_type === 'Medical Unit').length);
      setFireUnits(avail.filter((r) => r.resource_type === 'Fire and Rescue Unit').length);
      setSupplyUnits(avail.filter((r) => r.resource_type === 'Emergency Supply Unit').length);
      setShelters(avail.filter((r) => r.resource_type === 'Shelter').length);
      setUnavailableIds([]);
    } catch (err) {
      console.error('Failed to load baseline resources:', err);
    }
  };

  useEffect(() => {
    loadBaseline();
  }, []);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await runSimulation({
        available_ambulances: ambulances,
        available_rescue_teams: rescueTeams,
        available_medical_units: medicalUnits,
        available_fire_rescue_units: fireUnits,
        available_supply_units: supplyUnits,
        available_shelters: shelters,
        unavailable_resource_ids: unavailableIds,
      });
      setResult(res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Simulation failed.');
    } finally {
      setRunning(false);
    }
  };

  const toggleUnavailable = (id: number) => {
    setUnavailableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>What-If Resource Shortage Simulation</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Test fleet capacity deficits and unit outages in memory without modifying live operational records
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => { loadBaseline(); setResult(null); }}>
          <RotateCcw size={15} />
          <span>Reset to Live Baseline</span>
        </button>
      </div>

      {/* Distinct Simulation Banner */}
      <div
        style={{
          background: '#fef0c7',
          border: '1.5px solid #F59E0B',
          color: '#92400e',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <FlaskConical size={20} />
        <span>
          ISOLATED SIMULATION SANDBOX — Scenarios run purely in memory on temporary data. Actual database availability and assignments are never altered.
        </span>
      </div>

      <div className="grid-2col">
        <form className="card-section" onSubmit={handleRunSimulation}>
          <div className="section-header">
            <div className="section-title">
              <FlaskConical size={18} color="#17263B" />
              <span>Scenario Fleet Quantities</span>
            </div>
          </div>

          <div className="grid-2col" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Available Ambulances</label>
              <input type="number" min="0" max="50" className="form-input" value={ambulances} onChange={(e) => setAmbulances(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Available Rescue Teams</label>
              <input type="number" min="0" max="50" className="form-input" value={rescueTeams} onChange={(e) => setRescueTeams(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Available Medical Units</label>
              <input type="number" min="0" max="50" className="form-input" value={medicalUnits} onChange={(e) => setMedicalUnits(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fire & Rescue Units</label>
              <input type="number" min="0" max="50" className="form-input" value={fireUnits} onChange={(e) => setFireUnits(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Supply Units</label>
              <input type="number" min="0" max="50" className="form-input" value={supplyUnits} onChange={(e) => setSupplyUnits(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Shelters</label>
              <input type="number" min="0" max="50" className="form-input" value={shelters} onChange={(e) => setShelters(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div style={{ marginTop: 10, marginBottom: 16 }}>
            <div className="form-label">Simulate Specific Units Offline / Unavailable</div>
            <div style={{ maxHeight: 170, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              {resources.map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={unavailableIds.includes(r.id)} onChange={() => toggleUnavailable(r.id)} />
                  <span><b>{r.resource_code}</b> — {r.name} ({r.resource_type})</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={running} style={{ width: '100%' }}>
            <Play size={15} />
            <span>{running ? 'Running Simulation...' : 'Run What-If Allocation Simulation'}</span>
          </button>
        </form>

        <div>
          {!result ? (
            <div className="card-section" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              <FlaskConical size={36} style={{ marginBottom: 10, opacity: 0.6 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Configure fleet constraints and click "Run What-If Allocation Simulation"</p>
              <p style={{ fontSize: 12.5, marginTop: 6 }}>
                You will see shortage warnings, uncovered critical incidents, and priority-first fallback matches.
              </p>
            </div>
          ) : (
            <>
              <div className="card-section">
                <div className="section-header">
                  <div className="section-title">
                    <ShieldAlert size={18} color="#DC3545" />
                    <span>Simulation Outcome Summary</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>DB Unmodified</span>
                </div>
                <p style={{ fontSize: 13.5, color: '#101B2D', marginBottom: 14 }}>{result.scenario_summary}</p>
                <div className="grid-3col" style={{ gap: 10 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>ACTIVE INCIDENTS</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{result.total_active_incidents}</div>
                  </div>
                  <div style={{ background: '#ecfdf3', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>COVERED</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>{result.covered_incidents_count}</div>
                  </div>
                  <div style={{ background: '#fee4e2', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#DC3545' }}>WITHOUT RESOURCE</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#DC3545' }}>{result.unassigned_incidents_count}</div>
                  </div>
                </div>
              </div>

              {result.shortage_warnings.length > 0 && (
                <div className="card-section" style={{ borderLeft: '4px solid #DC3545' }}>
                  <div className="section-header">
                    <div className="section-title">
                      <AlertTriangle size={18} color="#DC3545" />
                      <span>Resource Shortage Warnings ({result.shortage_warnings.length})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.shortage_warnings.map((w, idx) => (
                      <div key={idx} style={{ background: '#fee4e2', color: '#991b1b', padding: '10px 12px', borderRadius: 6, fontSize: 12.5 }}>
                        <b>[{w.severity}] {w.resource_type}:</b> {w.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-section">
                <div className="section-header">
                  <div className="section-title"><span>Simulated Priority-First Assignments</span></div>
                </div>
                <div className="table-responsive">
                  <table className="tactical-table">
                    <thead>
                      <tr>
                        <th>INCIDENT</th>
                        <th>SIM PRIORITY</th>
                        <th>SIMULATED MATCH</th>
                        <th>NOTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.simulated_allocations.map((row) => (
                        <tr key={row.incident_id} style={{ background: row.has_compatible_resource ? 'transparent' : '#fff5f5' }}>
                          <td>
                            <b>{row.incident_code}</b>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{row.title}</div>
                          </td>
                          <td><PriorityBadge level={row.simulated_priority_level} score={row.simulated_priority_score} /></td>
                          <td>
                            {row.assigned_resource_code ? (
                              <div>
                                <b>{row.assigned_resource_code}</b> ({row.assigned_resource_type})
                              </div>
                            ) : (
                              <span style={{ color: '#DC3545', fontWeight: 700 }}>NONE AVAILABLE</span>
                            )}
                          </td>
                          <td style={{ fontSize: 11.5, color: row.has_compatible_resource ? '#475569' : '#DC3545' }}>
                            {row.status_note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

