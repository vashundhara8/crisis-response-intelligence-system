import React, { useEffect, useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Layers,
  Settings2,
  Clock,
  Info,
} from 'lucide-react';
import { calculatePriority, getPriorityWeights, updatePriorityWeights } from '../services/api';
import { PriorityCalculationResponse, PriorityWeights } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { useAuth } from '../context/AuthContext';

export const PriorityEngine: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');

  const [factors, setFactors] = useState({
    severity: 90,
    impact: 85,
    urgency: 95,
    vulnerability: 70,
    accessibility: 60,
  });

  const [calcResult, setCalcResult] = useState<PriorityCalculationResponse | null>(null);
  const [weights, setWeights] = useState<PriorityWeights | null>(null);
  const [editingWeights, setEditingWeights] = useState(false);
  const [weightForm, setWeightForm] = useState({
    severity_weight: 0.3,
    impact_weight: 0.25,
    urgency_weight: 0.2,
    vulnerability_weight: 0.15,
    accessibility_weight: 0.1,
  });
  const [weightSaveMsg, setWeightSaveMsg] = useState<string | null>(null);

  const loadWeightsAndRun = async () => {
    try {
      const w = await getPriorityWeights();
      setWeights(w);
      setWeightForm({
        severity_weight: w.severity_weight,
        impact_weight: w.impact_weight,
        urgency_weight: w.urgency_weight,
        vulnerability_weight: w.vulnerability_weight,
        accessibility_weight: w.accessibility_weight,
      });
      runBackendCalculation(factors);
    } catch (err) {
      console.error('Failed to load weights:', err);
    }
  };

  useEffect(() => {
    loadWeightsAndRun();
  }, []);

  const runBackendCalculation = async (currentFactors: typeof factors) => {
    try {
      const res = await calculatePriority(currentFactors);
      setCalcResult(res);
    } catch (err) {
      console.error('Backend priority calculation failed:', err);
    }
  };

  const handleSliderChange = (key: keyof typeof factors, value: number) => {
    const updated = { ...factors, [key]: value };
    setFactors(updated);
    runBackendCalculation(updated);
  };

  const handleReset = () => {
    const defaults = { severity: 90, impact: 85, urgency: 95, vulnerability: 70, accessibility: 60 };
    setFactors(defaults);
    runBackendCalculation(defaults);
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updatePriorityWeights({
        severity_weight: Number(weightForm.severity_weight),
        impact_weight: Number(weightForm.impact_weight),
        urgency_weight: Number(weightForm.urgency_weight),
        vulnerability_weight: Number(weightForm.vulnerability_weight),
        accessibility_weight: Number(weightForm.accessibility_weight),
      });
      setWeights(updated);
      setWeightSaveMsg('Weights saved and all database incidents recalculated.');
      setTimeout(() => setWeightSaveMsg(null), 4000);
      setEditingWeights(false);
      runBackendCalculation(factors);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Weights must sum up to 1.0');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, color: '#101B2D' }}>Intelligent Emergency Priority Engine</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Transparent weighted scoring model computed in the backend (0–100 scale: CRITICAL ≥80, HIGH 60–79, MODERATE 40–59, LOW 0–39)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={() => setEditingWeights(!editingWeights)}>
              <Settings2 size={15} />
              <span>{editingWeights ? 'Close Weights Editor' : 'Configure Weights'}</span>
            </button>
          )}
          <button className="btn btn-outline" onClick={handleReset}>
            <RotateCcw size={15} />
            <span>Reset Test Inputs</span>
          </button>
        </div>
      </div>

      {editingWeights && isAdmin && (
        <div className="card-section" style={{ background: '#f8fafc', border: '1px solid #17263B', marginBottom: 20 }}>
          <div className="section-header">
            <div className="section-title">
              <Settings2 size={18} color="#17263B" />
              <span>Configurable Scoring Weights (Sum must equal 1.00)</span>
            </div>
          </div>
          <form onSubmit={handleSaveWeights} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {(
              [
                ['severity_weight', 'Severity (w1)'],
                ['impact_weight', 'Population Impact (w2)'],
                ['urgency_weight', 'Urgency (w3)'],
                ['vulnerability_weight', 'Vulnerability (w4)'],
                ['accessibility_weight', 'Accessibility (w5)'],
              ] as const
            ).map(([field, label]) => (
              <div className="form-group" key={field}>
                <label className="form-label">{label}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="form-input"
                  value={weightForm[field]}
                  onChange={(e) => setWeightForm({ ...weightForm, [field]: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Weights & Recalculate All Incidents
              </button>
            </div>
          </form>
        </div>
      )}

      {weightSaveMsg && (
        <div style={{ padding: '10px 16px', background: '#ecfdf3', color: '#16A34A', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {weightSaveMsg}
        </div>
      )}

      <div className="grid-2col">
        <div className="card-section">
          <div className="section-header">
            <div className="section-title">
              <Sliders size={18} color="#17263B" />
              <span>Multi-Factor Input Controls</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Live Backend Evaluation</span>
          </div>

          {(
            [
              ['severity', 'Severity (Hazard magnitude)', weights?.severity_weight ?? 0.3, '#DC3545'],
              ['impact', 'Population Impact (Exposure)', weights?.impact_weight ?? 0.25, '#F59E0B'],
              ['urgency', 'Urgency (Time sensitivity)', weights?.urgency_weight ?? 0.2, '#3B82F6'],
              ['vulnerability', 'Vulnerability (At-risk groups)', weights?.vulnerability_weight ?? 0.15, '#8b5cf6'],
              ['accessibility', 'Accessibility (Ingress difficulty)', weights?.accessibility_weight ?? 0.1, '#16A34A'],
            ] as const
          ).map(([key, label, weightVal, color]) => (
            <div className="slider-group" key={key}>
              <div className="slider-header">
                <span style={{ color: '#101B2D' }}>{label}</span>
                <b style={{ fontSize: 15, color }}>{factors[key]} / 100</b>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="slider-input"
                value={factors[key]}
                onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                <span>0</span>
                <span>Configured Weight: {(weightVal * 100).toFixed(0)}%</span>
                <span>100</span>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card-section" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Computed Priority Score
            </div>

            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                color:
                  calcResult?.priority_level === 'CRITICAL'
                    ? '#DC3545'
                    : calcResult?.priority_level === 'HIGH'
                    ? '#F59E0B'
                    : calcResult?.priority_level === 'MODERATE'
                    ? '#3B82F6'
                    : '#64748b',
                lineHeight: 1.1,
                margin: '12px 0',
              }}
            >
              {calcResult?.priority_score ?? 0}
            </div>

            <div style={{ marginBottom: 14 }}>
              {calcResult && <PriorityBadge level={calcResult.priority_level} score={calcResult.priority_score} showScore={false} />}
            </div>

            {calcResult?.last_recalculated_at && (
              <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                <Clock size={12} />
                <span>Last recalculated: {new Date(calcResult.last_recalculated_at).toLocaleString()}</span>
              </div>
            )}

            <div
              style={{
                background: '#f0f9ff',
                borderLeft: '4px solid #17263B',
                padding: '14px 16px',
                borderRadius: 6,
                textAlign: 'left',
                fontSize: 13,
                color: '#1e3a8a',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              <b style={{ display: 'block', marginBottom: 4, color: '#101B2D' }}>Decision Explanation:</b>
              {calcResult?.explanation}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                color: '#475569',
                wordBreak: 'break-all',
              }}
            >
              <b>Formula:</b> {calcResult?.formula_used}
            </div>
          </div>

          <div className="card-section">
            <div className="section-header">
              <div className="section-title">
                <Layers size={18} color="#17263B" />
                <span>Contributing Factors Breakdown</span>
              </div>
            </div>

            <table className="tactical-table">
              <thead>
                <tr>
                  <th>FACTOR</th>
                  <th>INPUT</th>
                  <th>WEIGHT</th>
                  <th style={{ textAlign: 'right' }}>CONTRIBUTION</th>
                </tr>
              </thead>
              <tbody>
                {calcResult?.breakdown.map((item) => (
                  <tr key={item.factor}>
                    <td><b>{item.factor}</b></td>
                    <td>{item.value} / 100</td>
                    <td>{item.weight_pct}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#17263B' }}>
                      +{item.contribution.toFixed(2)} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 12, fontSize: 11.5, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Info size={14} />
              <span>{calcResult?.disclaimer}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
