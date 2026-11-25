import React from 'react';

interface PriorityBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MEDIUM' | 'LOW' | string;
  score?: number;
  showScore?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level, score, showScore = true }) => {
  const displayLevel = level === 'MEDIUM' ? 'MODERATE' : level || 'LOW';
  const normLevel = displayLevel.toLowerCase();

  const dotColor =
    normLevel === 'critical'
      ? '#DC3545'
      : normLevel === 'high'
      ? '#F59E0B'
      : normLevel === 'moderate'
      ? '#3B82F6'
      : '#64748b';

  return (
    <span className={`priority-badge ${normLevel}`}>
      <span className="pulse-dot" style={{ background: dotColor }} />
      <span>{displayLevel}</span>
      {showScore && score !== undefined && (
        <span style={{ opacity: 0.9, fontWeight: 800 }}>({score})</span>
      )}
    </span>
  );
};
